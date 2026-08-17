#!/usr/bin/env python3
"""Pull draft ADP and season projections for an upcoming season.

    python3 tools/fetch_adp.py              # -> assets/data/adp-<year>.json
    python3 tools/fetch_adp.py --year 2026
    python3 tools/fetch_adp.py --check      # verify without writing

**This league is 2QB, and that changes everything.** Standard ADP is useless
here: Drake Maye goes around pick 52 in a 1QB league and around pick 8 in this
one; Caleb Williams moves 54 picks. So this tool reads Sleeper's `adp_2qb`
field, not `adp_ppr` or `adp_half_ppr`. It keeps the 1QB figure alongside only
so the gap is visible, never as the number to draft from.

## The endpoint is UNDOCUMENTED

`https://api.sleeper.app/projections/nfl/<year>` is not in Sleeper's public API
docs. It works today and carries exactly the fields this league needs, but it
can change or vanish without notice. Everything below is therefore defensive:
the script validates the shape it got and refuses to write a file it does not
recognise, rather than silently emitting an empty or mis-keyed board.

If it starts failing, nothing else breaks — this data is an optional extra
that no page depends on.
"""

import argparse
import json
import os
import sys
import urllib.request

import league_scoring

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets/data")

PROJECTIONS = "https://api.sleeper.app/projections/nfl/{year}"
PLAYERS = "https://api.sleeper.app/v1/players/nfl"

POSITIONS = ("QB", "RB", "WR", "TE", "K", "DEF")
# A 10-team, 17-round draft is 170 picks; keep enough board to see past it.
KEEP = 350


def get(url):
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=90) as resp:
        return json.load(resp)


def fetch(year):
    query = (
        "?season_type=regular"
        + "".join(f"&position[]={p}" for p in POSITIONS)
        + "&order_by=adp_2qb"
    )
    projections = get(PROJECTIONS.format(year=year) + query)
    players = get(PLAYERS)
    return projections, players


def build(projections, players, year, scoring):
    board = []
    for entry in projections:
        stats = entry.get("stats") or {}
        adp = stats.get("adp_2qb")
        if adp is None:
            continue
        player = players.get(str(entry.get("player_id"))) or {}
        name = player.get("full_name") or player.get("last_name")
        if not name:
            continue
        board.append(
            {
                "adp": round(adp, 1),
                "adp1qb": round(stats["adp_half_ppr"], 1)
                if stats.get("adp_half_ppr") is not None
                else None,
                "name": name,
                "position": player.get("position") or "",
                "team": player.get("team") or "",
                # Projections carry the same stat keys as results, so they
                # can be re-scored under league rules. Sleeper's generic
                # figure is kept beside it to show the gap.
                "projected": league_scoring.score(stats, scoring),
                "projectedHalfPpr": round(stats["pts_half_ppr"], 1)
                if stats.get("pts_half_ppr") is not None
                else None,
                "age": player.get("age"),
                "injuryStatus": player.get("injury_status") or None,
            }
        )

    board.sort(key=lambda row: row["adp"])
    board = board[:KEEP]
    for index, row in enumerate(board, start=1):
        row["rank"] = index

    return {
        "schemaVersion": "adp/1",
        "docs": "https://github.com/cdemurjian/uconn-gn-ffl#pointing-someone-at-the-raw-data",
        "year": str(year),
        "format": "2QB half-PPR, 10 teams",
        "source": "Sleeper adp_2qb (undocumented endpoint) — see tools/fetch_adp.py",
        "caution": (
            "adp is 2QB, which is this league's format. adp1qb is the standard "
            "figure, shown only to make the gap visible: quarterbacks move 20-55 "
            "picks between the two. Never draft from adp1qb here. Likewise "
            "projected is scored with league rules and projectedHalfPpr is the "
            "generic figure — they diverge on interceptions and return TDs."
        ),
        "players": board,
    }


def check(doc):
    """Refuse to write a board that does not look like 2QB data.

    The endpoint is undocumented, so the most valuable check is a semantic
    one: in a 2QB league the top of the board is thick with quarterbacks. If
    Sleeper ever repoints `adp_2qb` at a 1QB list, QB density collapses and
    this catches it — a shape check alone would not.
    """
    problems = []
    board = doc["players"]

    if len(board) < 100:
        problems.append(f"only {len(board)} players on the board, expected ~{KEEP}")

    adps = [p["adp"] for p in board]
    if adps != sorted(adps):
        problems.append("board is not sorted by adp")

    top30_qbs = sum(1 for p in board[:30] if p["position"] == "QB")
    if top30_qbs < 4:
        problems.append(
            f"only {top30_qbs} QBs in the top 30 — this does not look like 2QB "
            "ADP; check whether Sleeper changed the adp_2qb field"
        )

    if not any(p["projected"] for p in board):
        problems.append("no projected points on any player")

    # If league scoring never differs from the generic figure, the scoring
    # settings did not load and the re-scoring is silently a no-op.
    if not any(
        p["projectedHalfPpr"] and abs(p["projected"] - p["projectedHalfPpr"]) > 3
        for p in board
    ):
        problems.append(
            "league-scored projections match the generic figure for every "
            "player — check the scoring settings loaded"
        )

    missing = [p["name"] for p in board[:50] if not p["position"]]
    if missing:
        problems.append(f"no position resolved for: {', '.join(missing[:5])}")

    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--year", default="2026")
    parser.add_argument("--check", action="store_true", help="verify, do not write")
    args = parser.parse_args()

    try:
        projections, players = fetch(args.year)
    except Exception as err:  # undocumented endpoint; fail clearly
        print(f"ABORTED: could not fetch {args.year} projections: {err}", file=sys.stderr)
        print("This endpoint is undocumented and may have changed.", file=sys.stderr)
        sys.exit(1)

    doc = build(projections, players, args.year, league_scoring.load_scoring())
    problems = check(doc)

    print(f"  {args.year}: {len(doc['players'])} players on the 2QB board")
    print(
        f"  {'ADP':>6}{'1QB':>7}  {'POS':<4}{'PLAYER':<24}"
        f"{'PROJ':>8}{'generic':>9}"
    )
    for row in doc["players"][:12]:
        print(
            f"  {row['adp']:>6.1f}{(row['adp1qb'] or 0):>7.1f}  {row['position']:<4}"
            f"{row['name'][:23]:<24}{(row['projected'] or 0):>8.1f}"
            f"{(row['projectedHalfPpr'] or 0):>9.1f}"
        )

    if problems:
        print("\nABORTED:", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        sys.exit(1)

    if args.check:
        print("\nchecked, nothing written")
        return

    path = os.path.join(DATA, f"adp-{args.year}.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(doc, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    print(f"\nwrote {path}")


if __name__ == "__main__":
    main()
