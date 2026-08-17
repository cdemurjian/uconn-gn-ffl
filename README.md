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
