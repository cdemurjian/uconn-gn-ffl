"""Fail if styles.css hardcodes a color outside the :root token block.

The theme is defined once in :root. Everything else must reference a token,
so the palette can be changed in one place. Run from the repo root.
"""

import re
import sys

CSS = "assets/css/styles.css"
COLOR = re.compile(r"#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)")

# Colors that are legitimately literal outside :root. Keep this list empty
# unless there is a real reason, and write the reason next to the entry.
ALLOWED = set()


def main():
    lines = open(CSS, encoding="utf-8").read().split("\n")

    end = None
    for i, line in enumerate(lines):
        if line.strip() == "}":
            end = i
            break
    if end is None:
        sys.exit(f"{CSS}: could not find the end of the :root block")

    bad = []
    for i, line in enumerate(lines[end + 1 :], start=end + 2):
        for hit in COLOR.findall(line):
            if hit.strip() in ALLOWED:
                continue
            bad.append((i, hit.strip(), line.strip()))

    if bad:
        print(f"{len(bad)} hardcoded color(s) outside :root in {CSS}:\n")
        for lineno, hit, text in bad:
            print(f"  {CSS}:{lineno}  {hit}")
            print(f"      {text}")
        sys.exit(1)

    print(f"OK: no hardcoded colors outside :root in {CSS}")


if __name__ == "__main__":
    main()
