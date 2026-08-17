"""Score a raw stat line using this league's own scoring rules.

Sleeper publishes `pts_half_ppr` on every stat line, and it is *close* to this
league's scoring but not equal to it. Two documented house rules diverge:

  * interceptions are **-2** here, where the generic figure uses -1
  * return TDs go to the **D/ST**, not the player (`st_td` is worth 0)

Measured over 2025, 32 of 177 fantasy-relevant players differ by more than 5
points, and the gap is entirely explained by those two rules: Geno Smith's 17
interceptions cost exactly 17 more points here, and each return specialist's
two return touchdowns are worth 12 fewer.

So anything ranking players for THIS league has to re-score from the raw stat
line rather than trust `pts_half_ppr`. That is what this module is for, and it
works on projections exactly as it works on results, because Sleeper uses the
same stat keys for both.
"""

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets/data")

# Scoring lives in the season documents; the newest completed season is the
# league's current ruleset.
def load_scoring(year=None):
    """Return {stat_key: weight} for a season, defaulting to the latest."""
    if year is None:
        years = sorted(
            f[:-5] for f in os.listdir(DATA)
            if f.endswith(".json") and f[:-5].isdigit()
        )
        if not years:
            raise FileNotFoundError("no season documents in assets/data")
        year = years[-1]

    with open(os.path.join(DATA, f"{year}.json"), encoding="utf-8") as handle:
        doc = json.load(handle)

    if doc.get("schemaVersion") == "season-view/1":
        scoring = doc["settings"]["scoring"]
    else:  # raw ESPN export
        scoring = doc["seasons"][str(year)]["league"]["scoring_settings"]

    if not scoring:
        raise ValueError(f"season {year} carries no scoring settings")
    return scoring


def score(stat_line, scoring):
    """Fantasy points for one stat line under one ruleset.

    A stat with no rule scores nothing, which is correct: `st_td` has an
    explicit 0 weight here precisely so return touchdowns do not pay the
    player. Absent keys and nulls are treated as zero.
    """
    total = 0.0
    for key, weight in scoring.items():
        value = stat_line.get(key)
        if value:
            total += value * weight
    return round(total, 2)


def explain(stat_line, scoring, limit=12):
    """The biggest contributions to a score, for checking a number by hand."""
    rows = [
        (key, stat_line.get(key), weight, (stat_line.get(key) or 0) * weight)
        for key, weight in scoring.items()
        if stat_line.get(key) and weight
    ]
    rows.sort(key=lambda r: -abs(r[3]))
    return rows[:limit]
