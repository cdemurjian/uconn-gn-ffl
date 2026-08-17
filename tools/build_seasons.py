#!/usr/bin/env python3
"""Generate assets/data/<year>.json for the Sleeper seasons (2020 onwards).

The 2018/2019 files are raw ESPN exports that season-data.js normalizes in the
browser. Sleeper has no equivalent single-document export, so these years are
pre-normalized here into the SAME view model season-data.js produces, tagged
with schemaVersion so the browser passes them straight through.

    python3 tools/build_seasons.py            # fetch and write every season
    python3 tools/build_seasons.py --check    # verify without writing

Consolation games count for nothing: they are emitted and labelled, but the
title path is only winners-bracket matches with no placement or p == 1.
See _planning/specs/2026-08-17-logo-theme-seasons-stats-design.md §6.4.1.
"""

import argparse
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets/data")
API = "https://api.sleeper.app/v1"


SCHEMA = "season-view/1"
TITLE_TIER = "WINNERS_BRACKET"
CONSOLATION_TIER = "WINNERS_CONSOLATION_LADDER"
TOILET_TIER = "LOSERS_CONSOLATION_LADDER"
REGULAR_TIER = "REGULAR"

# Placements that are NOT the championship path.
CONSOLATION_PLACEMENTS = (3, 5, 7, 9)

OVERRIDES_PATH = os.path.join(ROOT, "assets/data/overrides.json")


def load_nicknames():
    """Sleeper user_id -> nickname, from the single source of truth."""
    with open(OVERRIDES_PATH, encoding="utf-8") as handle:
        overrides = json.load(handle)
    out = {}
    for nickname, entry in overrides["managers"].items():
        for user_id in entry.get("sleeper", []):
            out[user_id] = nickname
    return out


NICKNAMES = load_nicknames()


def get(path):
    with urllib.request.urlopen(f"{API}{path}", timeout=30) as resp:
        return json.load(resp)


def points(settings, key):
    """Sleeper splits points into an integer part and a decimal part."""
    whole = settings.get(key) or 0
    frac = settings.get(f"{key}_decimal") or 0
    return round(whole + frac / 100.0, 2)


def fetch_chain(league_id):
    """Walk previous_league_id back, keeping only completed seasons."""
    chain, current = [], league_id
    while current:
        league = get(f"/league/{current}")
        if league.get("status") == "complete":
            chain.append(league)
        current = league.get("previous_league_id")
    return sorted(chain, key=lambda lg: lg["season"])


def bye_rosters(winners):
    """Round-1 byes: a round-2 slot filled by a team that came from nowhere."""
    byes = set()
    for match in winners:
        if match.get("r") != 2:
            continue
        for slot in ("t1", "t2"):
            team = match.get(slot)
            if isinstance(team, int) and not match.get(f"{slot}_from"):
                byes.add(team)
    return byes


def final_ranks(winners, losers, rosters):
    """Ranks 1-6 come from the winners bracket placements.

    The losers bracket decides only who is least bad, and its placement
    semantics are not documented, so anyone without a winners-bracket
    placement is ordered by record and then points. That keeps the column
    honest rather than inventing a bracket meaning.
    """
    ranks = {}
    for match in winners:
        placement = match.get("p")
        if placement is None:
            continue
        if match.get("w"):
            ranks[match["w"]] = placement
        if match.get("l"):
            ranks[match["l"]] = placement + 1

    rest = [r for r in rosters if r["roster_id"] not in ranks]
    rest.sort(
        key=lambda r: (
            -(r["settings"].get("wins") or 0),
            -points(r["settings"], "fpts"),
        )
    )
    next_rank = max(ranks.values(), default=0) + 1
    for roster in rest:
        ranks[roster["roster_id"]] = next_rank
        next_rank += 1
    return ranks


def playoff_seeds(winners, rosters):
    """Seed order: bracket participants first, by record, then everyone else."""
    in_bracket = set()
    for match in winners:
        for slot in ("t1", "t2"):
            if isinstance(match.get(slot), int):
                in_bracket.add(match[slot])
    seeded = [r for r in rosters if r["roster_id"] in in_bracket]
    seeded.sort(
        key=lambda r: (
            -(r["settings"].get("wins") or 0),
            -points(r["settings"], "fpts"),
        )
    )
    return {r["roster_id"]: i + 1 for i, r in enumerate(seeded)}


def classify(week, playoff_start, pair, winners, losers):
    """Return the tier for a playoff-week game between `pair` of rosters."""
    rnd = week - playoff_start + 1
    for match in winners:
        if match.get("r") != rnd:
            continue
        if {match.get("t1"), match.get("t2")} == pair:
            placement = match.get("p")
            if placement in CONSOLATION_PLACEMENTS:
                return CONSOLATION_TIER
            return TITLE_TIER
    for match in losers:
        if match.get("r") == rnd and {match.get("t1"), match.get("t2")} == pair:
            return TOILET_TIER
    return CONSOLATION_TIER


def build_weeks(league, matchups, winners, losers):
    playoff_start = int(league["settings"]["playoff_week_start"])
    last_week = playoff_start + 2
    byes = bye_rosters(winners)
    weeks = []

    for week in range(1, last_week + 1):
        entries = matchups.get(week) or []
        if not entries:
            continue
        is_playoff = week >= playoff_start

        groups = {}
        loose = []
        for entry in entries:
            mid = entry.get("matchup_id")
            if mid is None:
                loose.append(entry)
            else:
                groups.setdefault(mid, []).append(entry)

        games = []
        for _, pair in sorted(groups.items()):
            if len(pair) != 2:
                continue
            home, away = pair
            tier = REGULAR_TIER
            if is_playoff:
                tier = classify(
                    week,
                    playoff_start,
                    {home["roster_id"], away["roster_id"]},
                    winners,
                    losers,
                )
            home_won = (home.get("points") or 0) >= (away.get("points") or 0)
            games.append(
                {
                    "tier": tier,
                    "isTitlePath": tier == TITLE_TIER,
                    "isConsolation": "CONSOLATION" in tier,
                    "isBye": False,
                    "home": home["roster_id"],
                    "away": away["roster_id"],
                    "homePoints": round(home.get("points") or 0, 2),
                    "awayPoints": round(away.get("points") or 0, 2),
                    "winnerRosterId": home["roster_id"]
                    if home_won
                    else away["roster_id"],
                    "homeStarters": [],
                    "awayStarters": [],
                }
            )

        # matchup_id null means "not playing this week". In round 1 that is a
        # first-round bye; later it just means eliminated, and is not shown.
        if is_playoff and week == playoff_start:
            for entry in loose:
                if entry["roster_id"] not in byes:
                    continue
                games.append(
                    {
                        "tier": TITLE_TIER,
                        "isTitlePath": True,
                        "isConsolation": False,
                        "isBye": True,
                        "home": entry["roster_id"],
                        "away": None,
                        "homePoints": round(entry.get("points") or 0, 2),
                        "awayPoints": None,
                        "winnerRosterId": None,
                        "homeStarters": [],
                        "awayStarters": [],
                    }
                )

        weeks.append({"week": week, "isPlayoffWeek": is_playoff, "games": games})

    return weeks


def build_streaks(league, matchups, rosters):
    """Derive the regular-season W/L string; Sleeper stores no streak."""
    playoff_start = int(league["settings"]["playoff_week_start"])
    streaks = {r["roster_id"]: "" for r in rosters}

    for week in range(1, playoff_start):
        entries = matchups.get(week) or []
        groups = {}
        for entry in entries:
            mid = entry.get("matchup_id")
            if mid is not None:
                groups.setdefault(mid, []).append(entry)
        for pair in groups.values():
            if len(pair) != 2:
                continue
            a, b = pair
            pa, pb = a.get("points") or 0, b.get("points") or 0
            if pa == pb:
                streaks[a["roster_id"]] += "T"
                streaks[b["roster_id"]] += "T"
            else:
                win, lose = (a, b) if pa > pb else (b, a)
                streaks[win["roster_id"]] += "W"
                streaks[lose["roster_id"]] += "L"
    return streaks


def build_teams(league, users, rosters, matchups, winners, losers):
    by_id = {u["user_id"]: u for u in users}
    ranks = final_ranks(winners, losers, rosters)
    seeds = playoff_seeds(winners, rosters)
    streaks = build_streaks(league, matchups, rosters)

    teams = []
    for roster in rosters:
        settings = roster.get("settings") or {}
        user = by_id.get(roster.get("owner_id")) or {}
        meta = user.get("metadata") or {}
        display = user.get("display_name") or f"Roster {roster['roster_id']}"
        nickname = NICKNAMES.get(roster.get("owner_id"))
        teams.append(
            {
                "rosterId": roster["roster_id"],
                "teamName": meta.get("team_name") or display,
                # The rest of the site speaks in nicknames, so prefer one and
                # fall back to the Sleeper handle for anyone unmapped.
                "manager": nickname or display,
                "displayName": display,
                "wins": settings.get("wins") or 0,
                "losses": settings.get("losses") or 0,
                "pointsFor": points(settings, "fpts"),
                "pointsAgainst": points(settings, "fpts_against"),
                "finalRank": ranks.get(roster["roster_id"], 99),
                "playoffSeed": seeds.get(roster["roster_id"], 0),
                "streak": streaks.get(roster["roster_id"], ""),
            }
        )
    teams.sort(key=lambda t: t["finalRank"])
    return teams


def build_draft(draft, picks):
    """Draft picks carry their own player metadata, so no player dictionary
    is needed. Columns come from round-1 order, as with the ESPN years."""
    if not draft:
        return {"rounds": 0, "teams": 0, "picks": []}

    ordered = sorted(picks, key=lambda p: p["pick_no"])
    column_of = {}
    for index, pick in enumerate(p for p in ordered if p["round"] == 1):
        column_of[pick["roster_id"]] = index + 1

    out = []
    for pick in ordered:
        meta = pick.get("metadata") or {}
        name = " ".join(
            x for x in (meta.get("first_name"), meta.get("last_name")) if x
        ).strip()
        out.append(
            {
                "pickNo": pick["pick_no"],
                "round": pick["round"],
                "column": column_of.get(pick["roster_id"]),
                "rosterId": pick["roster_id"],
                "playerId": pick.get("player_id"),
                "name": name or str(pick.get("player_id")),
                "position": meta.get("position") or "",
            }
        )
    return {
        "rounds": draft["settings"]["rounds"],
        "teams": draft["settings"]["teams"],
        "picks": out,
    }


def build_season(league):
    lid = league["league_id"]
    users = get(f"/league/{lid}/users")
    rosters = get(f"/league/{lid}/rosters")
    winners = get(f"/league/{lid}/winners_bracket") or []
    losers = get(f"/league/{lid}/losers_bracket") or []

    playoff_start = int(league["settings"]["playoff_week_start"])
    matchups = {}
    for week in range(1, playoff_start + 3):
        try:
            matchups[week] = get(f"/league/{lid}/matchups/{week}") or []
        except Exception:
            matchups[week] = []

    drafts = get(f"/league/{lid}/drafts") or []
    draft = drafts[0] if drafts else None
    picks = get(f"/draft/{draft['draft_id']}/picks") if draft else []

    return {
        "schemaVersion": SCHEMA,
        "docs": "https://github.com/cdemurjian/uconn-gn-ffl#pointing-someone-at-the-raw-data",
        "provider": "sleeper",
        "year": league["season"],
        "leagueName": league.get("name") or "",
        "providerLeagueId": lid,
        # ffwrapped works for the Sleeper era only; the ESPN years have none.
        "ffwrappedLeagueId": lid,
        "settings": {
            "teams": league["settings"].get("num_teams")
            or league.get("total_rosters"),
            "playoffTeams": league["settings"].get("playoff_teams"),
            "playoffWeekStart": playoff_start,
            "rosterPositions": league.get("roster_positions") or [],
            "scoring": league.get("scoring_settings") or {},
        },
        "teams": build_teams(league, users, rosters, matchups, winners, losers),
        "weeks": build_weeks(league, matchups, winners, losers),
        "draft": build_draft(draft, picks),
    }


def check(doc):
    """Fail loudly rather than write a season that does not add up."""
    year = doc["year"]
    problems = []

    ranks = sorted(t["finalRank"] for t in doc["teams"])
    if ranks != list(range(1, len(doc["teams"]) + 1)):
        problems.append(f"{year}: final ranks are {ranks}")

    wins = sum(t["wins"] for t in doc["teams"])
    losses = sum(t["losses"] for t in doc["teams"])
    if wins != losses:
        problems.append(f"{year}: {wins} wins vs {losses} losses league-wide")

    regular = doc["settings"]["playoffWeekStart"] - 1
    for team in doc["teams"]:
        streak = team["streak"]
        if len(streak) != regular:
            problems.append(
                f"{year}: {team['teamName']} streak is {len(streak)}, want {regular}"
            )
        elif streak.count("W") != team["wins"] or streak.count("L") != team["losses"]:
            problems.append(
                f"{year}: {team['teamName']} streak {streak} != {team['wins']}-{team['losses']}"
            )

    for week in doc["weeks"]:
        for game in week["games"]:
            if game["isTitlePath"] and game["isConsolation"]:
                problems.append(f"{year} wk{week['week']}: game is both paths")

    draft = doc["draft"]
    if draft["rounds"] * draft["teams"] != len(draft["picks"]):
        problems.append(
            f"{year}: {len(draft['picks'])} picks, want "
            f"{draft['rounds']}x{draft['teams']}"
        )
    columns = {}
    for pick in draft["picks"]:
        columns.setdefault(pick["rosterId"], pick["column"])
        if columns[pick["rosterId"]] != pick["column"]:
            problems.append(f"{year}: roster {pick['rosterId']} changed column")

    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify, do not write")
    args = parser.parse_args()

    with open(OVERRIDES_PATH, encoding="utf-8") as handle:
        league_id = json.load(handle)["leagueId"]
    chain = fetch_chain(league_id)
    print(f"completed seasons: {[lg['season'] for lg in chain]}")

    all_problems = []
    for league in chain:
        doc = build_season(league)
        problems = check(doc)
        all_problems.extend(problems)
        champion = next(t["teamName"] for t in doc["teams"] if t["finalRank"] == 1)
        status = "FAIL" if problems else "ok"
        print(
            f"  {doc['year']}  {len(doc['teams'])} teams, "
            f"{len(doc['weeks'])} weeks, {len(doc['draft']['picks'])} picks, "
            f"champion {champion}  [{status}]"
        )
        if not args.check and not problems:
            path = os.path.join(DATA, f"{doc['year']}.json")
            with open(path, "w", encoding="utf-8") as handle:
                # Pretty and unescaped: these are browsed on GitHub, and the
                # whitespace compresses away over the wire (+0.4KB gzipped).
                json.dump(doc, handle, indent=2, ensure_ascii=False)
                handle.write("\n")

    if all_problems:
        print("\nPROBLEMS:")
        for problem in all_problems:
            print(f"  {problem}")
        sys.exit(1)
    print("\nall seasons validated")


if __name__ == "__main__":
    main()
