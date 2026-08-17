#!/usr/bin/env python3
"""Generate assets/data/stats.json, the career table behind stats.html.

Inputs, all already in the repo:
  assets/data/2018.json, 2019.json   raw ESPN exports
  assets/data/2020.json .. 2025.json normalized seasons (tools/build_seasons.py)
  assets/data/overrides.json         the only hand-maintained data

    python3 tools/build_seasons.py    # first, if the Sleeper era has changed
    python3 tools/build_stats.py      # then rebuild the career table

Nothing here touches the network: refreshing the Sleeper era is
build_seasons.py's job, and this reads what it wrote.

Consolation games count for nothing. The title path is ESPN's WINNERS_BRACKET
tier and Sleeper's winners-bracket matches with no placement or p == 1; a bye
is not a game and is never a loss. See
_planning/specs/2026-08-17-logo-theme-seasons-stats-design.md §6.4.1.
"""

import argparse
import datetime
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets/data")
OVERRIDES_PATH = os.path.join(DATA, "overrides.json")
OUTPUT_PATH = os.path.join(DATA, "stats.json")

ESPN_YEARS = ["2018", "2019"]
ESPN_TITLE_TIER = "WINNERS_BRACKET"


class SelfCheckError(Exception):
    """A derived figure disagrees with a curated one."""


def load_json(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def load_overrides(path=OVERRIDES_PATH):
    return load_json(path)


def resolve_identities(overrides):
    """Invert the manager map into one lookup table per era.

    Raises if one identity is claimed by two managers: a silent last-writer-
    wins there would quietly reassign someone's whole career.
    """
    sleeper, espn = {}, {}
    for nickname, entry in overrides["managers"].items():
        if nickname.startswith("_"):
            continue
        for user_id in entry.get("sleeper", []):
            if user_id in sleeper:
                raise SelfCheckError(
                    f"Sleeper id {user_id} is claimed by both "
                    f"{sleeper[user_id]} and {nickname}"
                )
            sleeper[user_id] = nickname
        for name in entry.get("espn", []):
            if name in espn:
                raise SelfCheckError(
                    f'ESPN name "{name}" is claimed by both '
                    f"{espn[name]} and {nickname}"
                )
            espn[name] = nickname
    return {"sleeper": sleeper, "espn": espn}


def blank():
    return {
        "wins": 0,
        "losses": 0,
        "pointsFor": 0.0,
        "pointsAgainst": 0.0,
        "playoffWins": 0,
        "playoffLosses": 0,
        "playoffYears": set(),
        "seasons": set(),
    }


def espn_manager_name(user):
    meta = user.get("metadata") or {}
    return " ".join(
        x for x in (meta.get("first_name"), meta.get("last_name")) if x
    ).strip()


def espn_era(ids):
    """Aggregate the two raw ESPN exports into per-manager totals."""
    out = {}

    def bucket(name):
        return out.setdefault(name, blank())

    for year in ESPN_YEARS:
        season = load_json(os.path.join(DATA, f"{year}.json"))["seasons"][year]
        users = {u["user_id"]: u for u in season["users"]}

        owner_of = {}
        for roster in season["rosters"]:
            nickname = ids["espn"].get(espn_manager_name(users.get(roster["owner_id"], {})))
            if not nickname:
                continue  # a manager who never joined the current league
            owner_of[roster["roster_id"]] = nickname

            entry = bucket(nickname)
            entry["seasons"].add(int(year))
            settings = roster.get("settings") or {}
            # Regular season only. standings[].record covers all 16 weeks.
            entry["wins"] += settings.get("wins", 0)
            entry["losses"] += settings.get("losses", 0)
            # fpts is regular season only, matching the W/L beside it.
            entry["pointsFor"] += settings.get("fpts", 0.0)
            entry["pointsAgainst"] += settings.get("fpts_against", 0.0)

        for week_entries in season["matchups_by_week"].values():
            for entry in week_entries:
                meta = entry.get("metadata") or {}
                if meta.get("playoff_tier_type") != ESPN_TITLE_TIER:
                    continue  # consolation ladders count for nothing
                nickname = owner_of.get(entry["roster_id"])
                if not nickname:
                    continue
                bucket(nickname)["playoffYears"].add(int(year))
                if meta.get("opponent_roster_id") is None:
                    continue  # a bye is not a game and is not a loss
                if meta.get("won_matchup") == "true":
                    out[nickname]["playoffWins"] += 1
                else:
                    out[nickname]["playoffLosses"] += 1

    return out


def sleeper_years():
    years = []
    for name in os.listdir(DATA):
        if not name.endswith(".json"):
            continue
        stem = name[:-5]
        if stem.isdigit() and stem not in ESPN_YEARS:
            years.append(stem)
    return sorted(years)


def sleeper_era(overrides):
    """Aggregate the normalized season documents written by build_seasons.py.

    Those already carry nicknames and per-game title-path flags, so this is a
    roll-up rather than a second derivation.
    """
    out = {}
    champions = {}

    # A roster credit reassigns a season. "transfer" (the default) means the
    # season belongs to the named manager INSTEAD of the roster owner, so the
    # league totals still balance; "share" credits both and deliberately
    # double-counts.
    credits = {}
    for credit in overrides["rosterCredits"]:
        credits.setdefault(credit["season"], {})[credit["rosterId"]] = {
            "to": credit["creditTo"],
            "mode": credit.get("mode", "transfer"),
        }

    def bucket(name):
        return out.setdefault(name, blank())

    for year in sleeper_years():
        doc = load_json(os.path.join(DATA, f"{year}.json"))
        season_credits = credits.get(year, {})

        holders = {}
        for team in doc["teams"]:
            credit = season_credits.get(team["rosterId"])
            if credit is None:
                names = [team["manager"]]
            elif credit["mode"] == "share":
                names = [team["manager"], credit["to"]]
            else:
                names = [credit["to"]]
            holders[team["rosterId"]] = names
            for name in names:
                entry = bucket(name)
                entry["seasons"].add(int(year))
                entry["wins"] += team["wins"]
                entry["losses"] += team["losses"]
                entry["pointsFor"] += team["pointsFor"]
                entry["pointsAgainst"] += team["pointsAgainst"]
            if team["finalRank"] == 1:
                # Credit the ring to whoever the season belongs to, which is
                # not the roster owner when the season was transferred.
                champions[year] = names[0]

        for week in doc["weeks"]:
            for game in week["games"]:
                if not game["isTitlePath"]:
                    continue  # consolation counts for nothing
                for roster in (game["home"], game["away"]):
                    if roster is None:
                        continue
                    for name in holders.get(roster, []):
                        bucket(name)["playoffYears"].add(int(year))
                if game["isBye"] or game["winnerRosterId"] is None:
                    continue  # a bye is not a game
                loser = (
                    game["away"]
                    if game["winnerRosterId"] == game["home"]
                    else game["home"]
                )
                for name in holders.get(game["winnerRosterId"], []):
                    bucket(name)["playoffWins"] += 1
                for name in holders.get(loser, []):
                    bucket(name)["playoffLosses"] += 1

    return out, champions


def check_season_docs_agree(overrides, ids):
    """The season docs carry nicknames baked in by build_seasons.py.

    Those must be the same names overrides.json knows, or editing an id here
    and rebuilding only this script would silently change nothing.
    """
    known = {n for n in overrides["managers"] if not n.startswith("_")}
    known |= {c["creditTo"] for c in overrides["rosterCredits"]}
    unknown = set()
    for year in sleeper_years():
        doc = load_json(os.path.join(DATA, f"{year}.json"))
        unknown |= {t["manager"] for t in doc["teams"]} - known
    if unknown:
        raise SelfCheckError(
            "season documents name managers that overrides.json does not know: "
            + ", ".join(sorted(unknown))
            + "\nRe-run tools/build_seasons.py after changing manager identity."
        )


def check_points_balance(ids):
    """League-wide points for must equal points against.

    Recomputed from the raw inputs rather than from the output, because the
    output excludes the two 2018/2019 managers who never joined the current
    league — their points must still be counted for the books to balance.
    """
    pf = pa = 0.0
    for year in ESPN_YEARS:
        season = load_json(os.path.join(DATA, f"{year}.json"))["seasons"][year]
        for roster in season["rosters"]:
            settings = roster.get("settings") or {}
            pf += settings.get("fpts", 0.0)
            pa += settings.get("fpts_against", 0.0)
    for year in sleeper_years():
        for team in load_json(os.path.join(DATA, f"{year}.json"))["teams"]:
            pf += team["pointsFor"]
            pa += team["pointsAgainst"]
    if abs(pf - pa) > 0.05:
        raise SelfCheckError(
            f"league points do not balance: for {pf:.2f} vs against {pa:.2f}"
        )


def build(overrides):
    ids = resolve_identities(overrides)
    check_points_balance(ids)
    check_season_docs_agree(overrides, ids)
    espn = espn_era(ids)
    sleeper, champions = sleeper_era(overrides)

    lore = {(r["year"], r["manager"]): r for r in overrides["rings"]}
    ring_years = {}
    for year, name in champions.items():
        ring_years.setdefault(name, set()).add(int(year))
    for ring in overrides["rings"]:
        ring_years.setdefault(ring["manager"], set()).add(ring["year"])

    managers = []
    problems = []

    for name in overrides["managers"]:
        if name.startswith("_"):
            continue
        a = espn.get(name) or blank()
        b = sleeper.get(name) or blank()

        wins = a["wins"] + b["wins"]
        losses = a["losses"] + b["losses"]
        p_wins = a["playoffWins"] + b["playoffWins"]
        p_losses = a["playoffLosses"] + b["playoffLosses"]
        years = sorted(a["playoffYears"] | b["playoffYears"])
        tenure = sorted(a["seasons"] | b["seasons"])

        curated = overrides["curatedPlayoffRecords"].get(name)
        override = overrides["playoffRecordOverrides"].get(name)
        derived = f"{p_wins}-{p_losses}"

        if curated and curated != derived:
            if not override:
                problems.append(
                    f"{name}: derived {derived} but curated {curated}"
                )
            elif override.get("accept") == "curated":
                p_wins, p_losses = (int(x) for x in curated.split("-"))

        managers.append(
            {
                "name": name,
                "espn": {"wins": a["wins"], "losses": a["losses"]},
                "sleeper": {"wins": b["wins"], "losses": b["losses"]},
                "total": {
                    "wins": wins,
                    "losses": losses,
                    "pct": round(wins / (wins + losses), 6) if wins + losses else 0.0,
                },
                # Career points, regular season only in both eras. `seasons` is
                # the denominator for the per-season figures and the thing that
                # stops a long career being mistaken for a good one.
                "seasons": len(tenure),
                "points": {
                    "pf": round(a["pointsFor"] + b["pointsFor"], 2),
                    "pa": round(a["pointsAgainst"] + b["pointsAgainst"], 2),
                },
                "playoffs": {
                    "made": len(years),
                    "possible": len(tenure),
                    "years": years,
                    "record": {"wins": p_wins, "losses": p_losses},
                },
                "rings": [
                    {
                        "year": year,
                        "mickeyMouse": bool(lore.get((year, name), {}).get("mickeyMouse")),
                        "note": lore.get((year, name), {}).get("note", ""),
                    }
                    for year in sorted(ring_years.get(name, set()))
                ],
            }
        )

    if problems:
        raise SelfCheckError(
            "derived figures disagree with curated values:\n  "
            + "\n  ".join(problems)
            + "\nAdd an entry to playoffRecordOverrides to record the decision."
        )

    return {
        "schemaVersion": "career-stats/1",
        "docs": "https://github.com/cdemurjian/uconn-gn-ffl#pointing-someone-at-the-raw-data",
        "generatedAt": datetime.datetime.now(datetime.timezone.utc)
        .replace(microsecond=0)
        .isoformat(),
        "seasons": {
            "espn": [int(y) for y in ESPN_YEARS],
            "sleeper": [int(y) for y in sleeper_years()],
        },
        "managers": sorted(managers, key=lambda m: -m["total"]["wins"]),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify, do not write")
    args = parser.parse_args()

    try:
        doc = build(load_overrides())
    except SelfCheckError as err:
        print(f"ABORTED: {err}", file=sys.stderr)
        sys.exit(1)

    for m in doc["managers"]:
        rec = m["playoffs"]["record"]
        rings = "".join("R" for _ in m["rings"])
        print(
            f"  {m['name']:<9} {m['total']['wins']:>3}-{m['total']['losses']:<3} "
            f"{m['total']['pct'] * 100:6.2f}%  espn {m['espn']['wins']}-{m['espn']['losses']:<3} "
            f"sleeper {m['sleeper']['wins']}-{m['sleeper']['losses']:<3} "
            f"playoffs {m['playoffs']['made']}/{m['playoffs']['possible']} "
            f"({rec['wins']}-{rec['losses']})  {rings}"
        )

    if args.check:
        print("\nchecked, nothing written")
        return

    with open(OUTPUT_PATH, "w", encoding="utf-8") as handle:
        json.dump(doc, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    print(f"\nwrote {OUTPUT_PATH} for {len(doc['managers'])} managers")


if __name__ == "__main__":
    main()
