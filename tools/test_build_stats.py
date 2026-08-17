"""Offline tests for build_stats.py and build_seasons.py output.

Run from the tools directory:
    cd tools && python3 -m unittest test_build_stats -v
"""

import copy
import json
import os
import unittest

import build_stats

DATA = build_stats.DATA
OVERRIDES = build_stats.load_overrides()

# The career table as the league has always recorded it.
CAREER = {
    "Charlie": (54, 55), "Nick": (52, 31), "Stove": (46, 50), "Matt": (41, 68),
    "Jay": (53, 42), "Tyler": (56, 53), "Devin": (61, 48), "Kap": (59, 50),
    "Bij": (50, 59), "Leo": (21, 21), "Chaf": (42, 39),
}
ESPN_SPLIT = {
    "Charlie": (15, 11), "Stove": (11, 2), "Matt": (7, 19), "Jay": (20, 6),
    "Tyler": (12, 14), "Devin": (20, 6), "Kap": (7, 19), "Bij": (16, 10),
    "Chaf": (12, 14), "Nick": (0, 0), "Leo": (0, 0),
}
PLAYOFF_YEARS = {
    "Charlie": [2018, 2019, 2021, 2024, 2025],
    "Nick": [2020, 2021, 2022, 2023, 2024, 2025],
    "Stove": [2019, 2023, 2024],
    "Matt": [2020, 2022, 2025],
    "Jay": [2018, 2019, 2020, 2022, 2024],
    "Tyler": [2018, 2020, 2021, 2023, 2024],
    "Devin": [2018, 2019, 2021, 2022, 2023, 2025],
    "Kap": [2020, 2021, 2022, 2023, 2025],
    "Bij": [2018, 2019, 2020, 2024],
    "Leo": [2025],
    "Chaf": [2019, 2021, 2022, 2023],
}


class TestIdentities(unittest.TestCase):
    def setUp(self):
        self.ids = build_stats.resolve_identities(OVERRIDES)

    def test_eleven_managers(self):
        real = [k for k in OVERRIDES["managers"] if not k.startswith("_")]
        self.assertEqual(len(real), 11)

    def test_chaf_has_two_sleeper_accounts(self):
        chaf = [u for u, n in self.ids["sleeper"].items() if n == "Chaf"]
        self.assertEqual(len(chaf), 2)

    def test_jay_has_two_espn_names(self):
        jay = sorted(n for n, who in self.ids["espn"].items() if who == "Jay")
        self.assertEqual(jay, ["Jay Korman", "gordon korman"])

    def test_no_identity_is_claimed_twice(self):
        for era in ("sleeper", "espn"):
            keys = list(self.ids[era])
            self.assertEqual(len(keys), len(set(keys)), era)


class TestBuild(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = build_stats.build(OVERRIDES)
        cls.by_name = {m["name"]: m for m in cls.doc["managers"]}

    def test_every_manager_present(self):
        self.assertEqual(len(self.doc["managers"]), 11)

    def test_career_records_match_the_league_record(self):
        for name, (w, l) in CAREER.items():
            t = self.by_name[name]["total"]
            self.assertEqual((t["wins"], t["losses"]), (w, l), name)

    def test_espn_split_matches(self):
        for name, (w, l) in ESPN_SPLIT.items():
            e = self.by_name[name]["espn"]
            self.assertEqual((e["wins"], e["losses"]), (w, l), name)

    def test_totals_are_the_sum_of_both_eras(self):
        for m in self.doc["managers"]:
            self.assertEqual(
                m["total"]["wins"], m["espn"]["wins"] + m["sleeper"]["wins"], m["name"]
            )
            self.assertEqual(
                m["total"]["losses"],
                m["espn"]["losses"] + m["sleeper"]["losses"],
                m["name"],
            )

    def test_win_percentage(self):
        c = self.by_name["Charlie"]["total"]
        self.assertAlmostEqual(c["pct"], 54 / 109, places=5)

    def test_sleeper_totals_balance_exactly(self):
        """Every game makes exactly one win and one loss, so these must match.

        They only balance because the 2021 roster credit is a transfer rather
        than a share: crediting both Jay and Leo would double-count 6-8.
        """
        w = sum(m["sleeper"]["wins"] for m in self.doc["managers"])
        l = sum(m["sleeper"]["losses"] for m in self.doc["managers"])
        self.assertEqual((w, l), (415, 415))

    def test_playoff_years(self):
        for name, years in PLAYOFF_YEARS.items():
            self.assertEqual(self.by_name[name]["playoffs"]["years"], years, name)

    def test_jays_tenure_excludes_the_season_leo_managed(self):
        """2018 (as gordon korman) counts; 2021 does not, because it is Leo's.

        Those two cancel out to the 5/7 the league has always recorded.
        """
        self.assertEqual(self.by_name["Jay"]["playoffs"]["possible"], 7)
        self.assertEqual(self.by_name["Jay"]["playoffs"]["made"], 5)
        self.assertNotIn(2021, self.by_name["Jay"]["playoffs"]["years"])

    def test_the_transferred_season_belongs_to_exactly_one_manager(self):
        """2021 is Leo's, so Jay must not also be paid for it."""
        jay = self.by_name["Jay"]["sleeper"]
        # 39-44 across all six seasons, less the 6-8 that is Leo's.
        self.assertEqual((jay["wins"], jay["losses"]), (33, 36))
        leo = self.by_name["Leo"]["sleeper"]
        self.assertEqual((leo["wins"], leo["losses"]), (21, 21))

    def test_nine_playoff_records_match_the_curated_values(self):
        agreed = 0
        for name, curated in OVERRIDES["curatedPlayoffRecords"].items():
            if name.startswith("_"):
                continue
            rec = self.by_name[name]["playoffs"]["record"]
            if f"{rec['wins']}-{rec['losses']}" == curated:
                agreed += 1
        self.assertEqual(agreed, 9)

    def test_the_two_accepted_corrections(self):
        jay = self.by_name["Jay"]["playoffs"]["record"]
        charlie = self.by_name["Charlie"]["playoffs"]["record"]
        self.assertEqual((jay["wins"], jay["losses"]), (5, 4))
        self.assertEqual((charlie["wins"], charlie["losses"]), (6, 3))

    def test_rings(self):
        charlie = self.by_name["Charlie"]["rings"]
        self.assertEqual([r["year"] for r in charlie], [2018, 2025])
        self.assertTrue(charlie[0]["mickeyMouse"])
        self.assertIn("Inception", charlie[0]["note"])
        self.assertFalse(charlie[1]["mickeyMouse"])
        for name in ("Kap", "Bij", "Chaf", "Leo"):
            self.assertEqual(self.by_name[name]["rings"], [], name)

    def test_every_season_has_exactly_one_champion(self):
        years = [r["year"] for m in self.doc["managers"] for r in m["rings"]]
        self.assertEqual(sorted(years), list(range(2018, 2026)))

    def test_selfcheck_aborts_on_an_unexplained_mismatch(self):
        broken = copy.deepcopy(OVERRIDES)
        broken["curatedPlayoffRecords"]["Nick"] = "99-0"
        with self.assertRaises(build_stats.SelfCheckError):
            build_stats.build(broken)


class TestConsolationCountsForNothing(unittest.TestCase):
    """The strong form: delete every consolation game, expect identical output."""

    def test_stripping_consolation_changes_nothing(self):
        baseline = build_stats.build(OVERRIDES)

        original = build_stats.load_json
        seasons = build_stats.sleeper_years()

        def stripped(path):
            doc = copy.deepcopy(original(path))
            if os.path.basename(path)[:-5] in seasons:
                for week in doc["weeks"]:
                    week["games"] = [g for g in week["games"] if not g["isConsolation"]]
            elif os.path.basename(path)[:-5] in build_stats.ESPN_YEARS:
                year = os.path.basename(path)[:-5]
                season = doc["seasons"][year]
                for wk, entries in season["matchups_by_week"].items():
                    season["matchups_by_week"][wk] = [
                        e for e in entries
                        if "CONSOLATION" not in ((e.get("metadata") or {}).get(
                            "playoff_tier_type") or "")
                    ]
            return doc

        build_stats.load_json = stripped
        try:
            after = build_stats.build(OVERRIDES)
        finally:
            build_stats.load_json = original

        baseline.pop("generatedAt")
        after.pop("generatedAt")
        self.assertEqual(baseline, after)


class TestSeasonDocuments(unittest.TestCase):
    def test_sleeper_seasons_are_2020_through_2025(self):
        self.assertEqual(
            build_stats.sleeper_years(),
            ["2020", "2021", "2022", "2023", "2024", "2025"],
        )

    def test_no_season_credits_a_bye_as_a_playoff_loss(self):
        for year in build_stats.sleeper_years():
            doc = build_stats.load_json(os.path.join(DATA, f"{year}.json"))
            for week in doc["weeks"]:
                for game in week["games"]:
                    if game["isBye"]:
                        self.assertIsNone(game["winnerRosterId"], year)
                        self.assertIsNone(game["away"], year)


if __name__ == "__main__":
    unittest.main()
