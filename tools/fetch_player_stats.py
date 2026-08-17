#!/usr/bin/env python3
"""Pull season player stats and re-score them under this league's rules.

    python3 tools/fetch_player_stats.py                 # 2022-2025
    python3 tools/fetch_player_stats.py --years 2025
    python3 tools/fetch_player_stats.py --check         # verify, do not write

Writes assets/data/player-stats-<year>.json: every fantasy-relevant player who
produced anything, with their raw counting stats, the points this league would
have awarded, and Sleeper's generic half-PPR figure alongside for comparison.

The re-scoring is the point. `pts_half_ppr` is not this league's scoring — see
tools/league_scoring.py for the two house rules that diverge and the evidence.

`https://api.sleeper.app/v1/stats/nfl/regular/<year>` IS documented. (The ADP
endpoint used by fetch_adp.py is not; these are different endpoints with
different risk.)
"""

import argparse
import json
import os
import sys
import urllib.request

import league_scoring

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets/data")

STATS = "https://api.sleeper.app/v1/stats/nfl/regular/{year}"
PLAYERS = "https://api.sleeper.app/v1/players/nfl"
POSITIONS = ("QB", "RB", "WR", "TE", "K", "DEF")

# Counting stats worth keeping. Sleeper carries ~260 keys per line, most of
# them situational; these are the ones anyone would actually look at.
KEEP_STATS = (
    "gp", "gs",
    "pass_att", "pass_cmp", "pass_yd", "pass_td", "pass_int", "pass_2pt",
    "rush_att", "rush_yd", "rush_td", "rush_2pt",
    "rec", "rec_tgt", "rec_yd", "rec_td", "rec_2pt",
    "fum_lost", "st_td",
    "fgm", "fga", "xpm", "xpa",
)
MIN_POINTS = 1.0


def get(url):
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=120) as resp:
        return json.load(resp)


def build(year, raw, players, scoring):
    rows = []
    for player_id, line in raw.items():
        player = players.get(player_id)
        if not player or player.get("position") not in POSITIONS:
            continue
        points = league_scoring.score(line, scoring)
        if points < MIN_POINTS:
            continue
        rows.append(
            {
                "playerId": player_id,
                "name": player.get("full_name")
                or player.get("last_name")
                or player_id,
                "position": player.get("position"),
                "team": player.get("team") or "",
                # This league's scoring, not Sleeper's.
                "points": points,
                "pointsHalfPpr": line.get("pts_half_ppr"),
                "stats": {k: line[k] for k in KEEP_STATS if line.get(k)},
            }
        )

    rows.sort(key=lambda r: -r["points"])
    for index, row in enumerate(rows, start=1):
        row["rank"] = index

    return {
        "schemaVersion": "player-stats/1",
        "docs": "https://github.com/cdemurjian/uconn-gn-ffl#pointing-someone-at-the-raw-data",
        "year": str(year),
        "scoring": "this league's own rules — see tools/league_scoring.py",
        "note": (
            "points is scored with league rules; pointsHalfPpr is Sleeper's "
            "generic figure, kept only for comparison. They diverge on "
            "interceptions (-2 here, -1 generic) and return TDs (credited to "
            "the D/ST here, so worth 0 to the player)."
        ),
        "players": rows,
    }


def check(doc):
    problems = []
    rows = doc["players"]
    year = doc["year"]

    if len(rows) < 150:
        problems.append(f"{year}: only {len(rows)} scoring players, expected 250+")

    points = [r["points"] for r in rows]
    if points != sorted(points, reverse=True):
        problems.append(f"{year}: not sorted by points")

    positions = {r["position"] for r in rows}
    for needed in ("QB", "RB", "WR", "TE"):
        if needed not in positions:
            problems.append(f"{year}: no {needed} in the results")

    # The two house rules must actually bite, or the re-scoring is a no-op and
    # something has gone wrong with the scoring settings.
    diverged = [
        r for r in rows
        if r["pointsHalfPpr"] and abs(r["points"] - r["pointsHalfPpr"]) > 5
    ]
    if not diverged:
        problems.append(
            f"{year}: league scoring matches generic half-PPR for every player, "
            "which should be impossible given the interception and return-TD "
            "rules — check the scoring settings loaded correctly"
        )
    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--years", nargs="+", default=["2022", "2023", "2024", "2025"])
    parser.add_argument("--check", action="store_true", help="verify, do not write")
    args = parser.parse_args()

    scoring = league_scoring.load_scoring()
    print(f"  scoring: {len(scoring)} rules from the latest season")

    try:
        players = get(PLAYERS)
    except Exception as err:
        print(f"ABORTED: could not fetch the player dictionary: {err}", file=sys.stderr)
        sys.exit(1)

    problems = []
    for year in args.years:
        try:
            raw = get(STATS.format(year=year))
        except Exception as err:
            problems.append(f"{year}: fetch failed: {err}")
            continue

        doc = build(year, raw, players, scoring)
        found = check(doc)
        problems.extend(found)

        top = doc["players"][0] if doc["players"] else None
        diverged = sum(
            1 for r in doc["players"]
            if r["pointsHalfPpr"] and abs(r["points"] - r["pointsHalfPpr"]) > 5
        )
        print(
            f"  {year}: {len(doc['players']):>4} players"
            + (f"  top {top['name']} ({top['position']}) {top['points']}" if top else "")
            + f"  |  {diverged} differ from generic half-PPR by >5"
        )

        if not args.check and not found:
            path = os.path.join(DATA, f"player-stats-{year}.json")
            with open(path, "w", encoding="utf-8") as handle:
                json.dump(doc, handle, indent=2, ensure_ascii=False)
                handle.write("\n")

    if problems:
        print("\nPROBLEMS:", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        sys.exit(1)

    print("\nchecked, nothing written" if args.check else "\nall years written")


if __name__ == "__main__":
    main()
