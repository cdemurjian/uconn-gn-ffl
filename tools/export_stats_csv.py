#!/usr/bin/env python3
"""Freeze the generated career table into a CSV snapshot.

The site reads assets/data/stats.json. This writes the same numbers in the
column layout the league kept by hand for years, so each season can be
archived in a format that opens in any spreadsheet and needs no tooling to
read a decade from now.

    python3 tools/export_stats_csv.py                     # -> stats-<yy>.csv
    python3 tools/export_stats_csv.py --out somewhere.csv

The snapshot is a historical record: nothing on the site loads it, and it is
never an input to any build. Re-running the generators does not touch it.
"""

import argparse
import csv
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets/data")

HEADERS = [
    "Team", "RECORD", "PERCENTAGE", "PLAYOFFS", "RING", "PLAYOFF RECORD",
    "ESPN WINS", "ESPN LOSS", "SLEEPER WINS", "SLEEPER LOSS",
    "TOTAL WINS", "TOTAL LOSSES",
]


def ring_cell(manager):
    """Match the hand-kept format: an emoji per ring, years, then the lore."""
    rings = manager["rings"]
    if not rings:
        return ""
    emoji = "💍" * len(rings)
    years = ", ".join(
        f"{r['year']}*" if r["mickeyMouse"] else str(r["year"]) for r in rings
    )
    notes = "; ".join(r["note"] for r in rings if r["note"])
    return f"{emoji}({years}) ({notes})" if notes else f"{emoji}({years})"


def row(manager):
    total = manager["total"]
    playoffs = manager["playoffs"]
    record = playoffs["record"]
    years = ",".join(str(y)[2:] for y in playoffs["years"])
    return [
        manager["name"],
        f"{total['wins']}-{total['losses']}",
        f"{total['pct'] * 100:.2f}%",
        f"{playoffs['made']}/{playoffs['possible']}" + (f" - {years}" if years else ""),
        ring_cell(manager),
        f"{record['wins']}-{record['losses']}",
        manager["espn"]["wins"],
        manager["espn"]["losses"],
        manager["sleeper"]["wins"],
        manager["sleeper"]["losses"],
        total["wins"],
        total["losses"],
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", help="output path (default assets/data/stats-<yy>.csv)")
    args = parser.parse_args()

    with open(os.path.join(DATA, "stats.json"), encoding="utf-8") as handle:
        doc = json.load(handle)

    last = max(doc["seasons"]["espn"] + doc["seasons"]["sleeper"])
    out = args.out or os.path.join(DATA, f"stats-{str(last)[2:]}.csv")

    with open(out, "w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(HEADERS)
        for manager in doc["managers"]:
            writer.writerow(row(manager))

    print(f"wrote {out} — {len(doc['managers'])} managers through {last}")


if __name__ == "__main__":
    main()
