# UCONN-GN-FFL

League site for the UCONN-GN-FFL: stats, champions, history, docs, and Canton data views. The site is static HTML/CSS/JS served as-is (no build step).

## Pages

Each page is a directory with an `index.html`, so URLs are extensionless
(`/stats`, not `/stats.html`). The old `<name>.html` paths remain as redirect
stubs so previously shared links keep working.

| URL | File | What it is |
|---|---|---|
| `/` | `index.html` | landing with quick nav cards |
| `/stats` | `stats/index.html` | career table from generated `assets/data/stats.json` |
| `/seasons` | `seasons/index.html` | per-season standings, matchups and draft boards, 2018–2025 |
| `/canton` | `canton/index.html` | Team, Awards, Positional and Player views |
| `/docs` | `docs/index.html` | league rules and info |

Asset and link paths are **root-relative** (`/assets/…`), which is what lets a
page work from any directory depth. That is safe here because `CNAME` puts the
site at a domain root rather than under `/<repo>/`.

## Run locally
From the repo root:
```bash
python3 -m http.server 8000
# open http://localhost:8000/  (then /stats, /seasons, /canton, /docs)
```

## Editing notes
- Assets: CSS in `assets/css/styles.css`; JS in `assets/js/`; data in `assets/data/`.
- Use root-relative paths (`/assets/…`, `/stats/`) so a page works from any directory depth; `CNAME` puts the site at a domain root, which is what makes this safe.
- Use double quotes in JS and 2-space indentation across HTML/CSS/JS.

## Canton awards data
Awards are in `assets/js/canton.js` under `AWARDS_DATA`:
```js
{ year, mvp, mvpPoints, sbMvp, sbNotes }
```
Fill those fields to update the Awards view and the awards indicators/tooltips across Canton views.

## Generated data

Two files are generated. **Do not hand-edit them.**

| File | Built by | Source |
|---|---|---|
| `assets/data/2020.json` … `2025.json` | `tools/build_seasons.py` | Sleeper API |
| `assets/data/stats.json` | `tools/build_stats.py` | the season files + the ESPN exports |

`assets/data/2018.json` and `2019.json` are raw ESPN exports, normalized in the
browser by `assets/js/season-data.js`. They never change.

### Refreshing after a season ends

```bash
python3 tools/build_seasons.py     # pull the Sleeper era (~25 API calls)
python3 tools/build_stats.py       # rebuild the career table
```

Then verify and commit:

```bash
python3 tools/check_theme.py
node --test tools/season-data.test.js
cd tools && python3 -m unittest test_build_stats; cd ..
git add assets/data && git commit -m "data: refresh through <season>"
```

Both scripts refuse to write anything if their self-checks fail. `--check`
verifies without writing.

### The only hand-maintained data

`assets/data/overrides.json` is the single source of truth for manager
identity, read by both scripts:

- `managers` — nickname → Sleeper `user_id` and ESPN name. Chaf has two Sleeper
  accounts; Jay has two ESPN names.
- `rosterCredits` — a co-owned roster credited to a second manager (Leo, 2021).
- `rings` — ring lore and asterisks, plus the two ESPN-era rings.
- `curatedPlayoffRecords` — checked against the derived values. The build
  **fails** on a mismatch; record the decision in `playoffRecordOverrides`.

### A rule the whole pipeline enforces

Consolation games count for nothing — no record, no appearance, no ring. A bye
is not a game and is never a loss. `test_build_stats.py` proves it the strong
way: delete every consolation game from the inputs and the output is identical.

`assets/data/stats.csv` is the pre-generation record. Nothing loads it.

## Logo

`assets/img/logo-source.png` is the original. `tools/make_logo.py` clears its
white background (flood-filling inward from the border, so white *inside* the
husky survives) and `tools/make_favicon.py` builds `favicon.ico` from the
result. The site palette is derived from this image — see
`_planning/specs/2026-08-17-logo-theme-seasons-stats-design.md` §4.

## Planning documents

The design spec and implementation plans live in `_planning/`:

```
_planning/specs/   the design this site was built from
_planning/plans/   the three implementation plans (theme, seasons, stats)
```

They sit outside `docs/` deliberately: `docs/` is the public rules page at
`/docs`, and anything under it would be published. GitHub Pages runs Jekyll,
which does not copy paths beginning with `_` into the built site, so
`_planning/` is versioned but never served. **If a `.nojekyll` file is ever
added to this repo, that exclusion stops applying** and `_planning/` would
become public — rename it to `.planning/` at that point.

## Adding next season

There is a runbook: **`.claude/skills/season-rollover/SKILL.md`**. It covers
pulling the year from Sleeper, the two edits that put it on the Seasons page,
regenerating the stats, adding the champion to Canton, and archiving a CSV
snapshot — including what to do when the build deliberately aborts.

In Claude Code, ask for the season rollover and the skill loads. Otherwise read
it as a checklist; every command in it is copy-pasteable.

## Pointing someone at the raw data

None of the numbers live in the HTML — every page fetches JSON, so the data is
directly linkable and needs no scraping.

| URL | What |
|---|---|
| `/assets/data/stats.json` | the whole career table, 11 managers |
| `/assets/data/2018.json` … `2025.json` | one season each |
| `/assets/data/overrides.json` | the hand-maintained layer: identity, credits, ring lore |
| `/assets/data/stats-25.csv` | spreadsheet-friendly snapshot through 2025 |
| `/assets/data/stats-25-he.csv` | the pre-generation hand-kept table |
| `/assets/data/adp-2026.json` | next season's draft board — **2QB** ADP and league-scored projections |
| `/assets/data/player-stats-2022.json` … `2025.json` | per-player production, re-scored under league rules |

Live, e.g. `https://www.uconn-gn-ffl.com/assets/data/stats.json`.

Every file is pretty-printed with a top-level `schemaVersion` and a `docs`
link back here, so it reads sensibly when opened straight on GitHub. The
whitespace costs about 0.4KB gzipped per season file — the browser pays almost
nothing for it, since GitHub Pages compresses on the way out.

| `schemaVersion` | Files |
|---|---|
| `season-view/1` | `2020.json` … `2025.json` |
| `career-stats/1` | `stats.json` |
| `overrides/1` | `overrides.json` |
| `1` (ESPN's own) | `2018.json`, `2019.json` — raw exports, a different shape |

### The one thing to warn them about

**The season files are not all the same shape.**

- **2018, 2019** are *raw ESPN exports*, ~750KB each. The season sits nested at
  `["seasons"]["2018"]`, and inside it are ESPN's own field names
  (`matchups_by_week`, `roster.settings.fpts`, `playoff_tier_type`). They also
  carry per-player detail the Sleeper years do not: every starter, their points,
  and a full player dictionary.
- **2020 onward** are *normalized* to this repo's own view model, ~38KB each,
  flat, tagged `"schemaVersion": "season-view/1"`. Keys are `teams`, `weeks`,
  `draft`, `settings`. Per-player starters are intentionally empty — that is
  what keeps them small.

`assets/js/season-data.js` is the reference for reading both: it converts the
first shape into the second and passes the second through untouched.

### Two things that will bite a naive reader

1. **`streak` / `record` strings.** In the raw ESPN files, `standings[].record`
   runs all 16 weeks, so it bakes in playoff *and consolation* results and is
   15 or 16 characters depending on whether the team had a bye. Regular-season
   W/L comes from `roster.settings.wins/losses`. The normalized files have
   already truncated `streak` to the regular season.
2. **Consolation games count for nothing here.** Playoff records, appearances
   and rings use the title path only — ESPN's `WINNERS_BRACKET` tier, or a
   Sleeper `winners_bracket` match with no placement or `p == 1`. A bye is not
   a game and never a loss. Anyone recomputing from `weeks[].games[]` should
   filter on `isTitlePath` or they will get different numbers than the site.

## Every file, and what it is

**Pages** — each a directory with an `index.html`; the root `<name>.html` files
are redirect stubs preserving the old URLs.

| Path | Data source |
|---|---|
| `index.html` | static |
| `stats/index.html` | generated `assets/data/stats.json` |
| `seasons/index.html` | `assets/data/<year>.json`, loaded per year on demand |
| `canton/index.html` | hand-curated, inline in `assets/js/canton.js` |
| `docs/index.html` | static prose |

**Scripts** (`assets/js/`)

| File | Responsibility |
|---|---|
| `season-data.js` | DOM-free. Normalizes a raw ESPN export into the season view model; passes pre-normalized Sleeper years through unchanged. Fetches and memoizes one year. |
| `seasons.js` | Renders that model: standings, matchups, draft, year/view toggles. |
| `stats.js` | Renders `stats.json`. Sorts on typed values, never on display strings. |
| `canton.js` | Holds the champion rosters and awards as data, and renders four views. |

**Data** (`assets/data/`)

| File | Kind |
|---|---|
| `overrides.json` | **hand-maintained** — the only one. Identity, roster credits, ring lore, curated playoff records. |
| `2018.json`, `2019.json` | frozen raw ESPN exports; never change |
| `2020.json` … `2025.json` | generated by `build_seasons.py` |
| `stats.json` | generated by `build_stats.py` |
| `stats-25.csv` | frozen snapshot of the generated table through 2025 |
| `stats-25-he.csv` | the hand-maintained table as it stood before any generation |

The two CSVs differ in exactly four places, all deliberate corrections: Jay's
record, tenure and playoff record (2021 is Leo's season), and Charlie's playoff
record. Neither file is loaded by anything or read by any build.

**Tools** (`tools/`)

| File | Does |
|---|---|
| `build_seasons.py` | Pulls the Sleeper chain, writes one normalized season doc per completed year. The only script that uses the network. |
| `build_stats.py` | Merges both eras into `stats.json`. Aborts rather than write a figure that disagrees with the league's record. |
| `export_stats_csv.py` | Freezes `stats.json` into a CSV snapshot. |
| `fetch_adp.py` | Pulls next season's 2QB ADP and league-scored projections. Optional. |
| `fetch_player_stats.py` | Pulls season player stats and re-scores them under league rules. Optional. |
| `league_scoring.py` | The shared scorer. Reads the ruleset from the latest season document. |
| `check_theme.py` | Fails on any colour literal outside `:root`. |
| `make_logo.py`, `make_favicon.py` | Rebuild the logo and favicon from the source image. |
| `season-data.test.js` | 20 tests over the season view model, both producers. |
| `test_build_stats.py` | 23 tests over the generated stats, including the consolation invariant. |

**`_planning/`** — the design spec and the three implementation plans. Not
published (see above).
