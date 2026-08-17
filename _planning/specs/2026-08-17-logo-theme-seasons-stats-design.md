# UCONN-GN-FFL — Logo, Theme, Seasons Archive, and Generated Stats

**Date:** 2026-08-17
**Status:** Design — awaiting approval
**Repo:** `uconn-gn-ffl` (static site, GitHub Pages, no build step)

---

## 1. Context

The site is four static HTML pages sharing one stylesheet and two page-specific
scripts. There is no build step, no framework, and no package manager. Data
lives in `assets/data/stats.csv` (hand-maintained) and inline in
`assets/js/canton.js` (hand-maintained).

Three inputs arrived together:

- `IMG_0146.png` — a league logo (257×195, navy/white/red, husky + goat + football).
- `2018_FFL.json`, `2019_FFL.json` — full ESPN league exports for the two
  pre-Sleeper seasons.
- A request to stop hand-maintaining the Stats page and derive it instead.

This spec covers all of it as one change set, because the pieces share a
stylesheet and a navigation bar and would otherwise conflict.

## 2. Goals

1. Reskin the site from its current dark theme to a light theme derived from the
   logo, and place the logo on the home page.
2. Add a **Seasons** archive page rendering the 2018 and 2019 ESPN exports.
3. Cross-link Canton ↔ Seasons.
4. Replace the hand-maintained `stats.csv` with a generated `stats.json`,
   produced by a script that merges the ESPN exports, the live Sleeper API, and
   a small hand-kept overrides file.

## 3. Non-goals

- Rewriting Canton's champion/awards data. It stays hand-curated. (Decided:
  Canton gets cross-links only.)
- Fixing the 13 code-review findings not listed in §8. Separate pass.
- Any server, build step, bundler, or dependency. Everything stays static.
- Automating the RING lore text (the asterisks and the Mickey Mouse Ring
  stories). Permanently manual — it is human content, not data.

---

## 4. Workstream A — Logo and theme

### 4.1 Palette

Extracted from `IMG_0146.png` by pixel quantization, with WCAG contrast measured:

| Token | Hex | Source | Contrast on white |
|---|---|---|---|
| `--ink` | `#06234C` | logo navy, 12.7% of pixels | **15.53:1** AAA |
| `--ink-muted` | `#656A74` | logo grey, 4.9% | 5.43:1 AA |
| `--accent` | `#B12823` | football stripe red, 0.6% | 6.57:1 AA |
| `--rule` | `#B3B6BA` | logo grey, 5.3% | 2.04:1 — **borders only, never text** |
| `--surface` | `#FFFFFF` | logo white, 54% | — |
| `--bg` | `#F6F8FB` | derived page tint | navy on it: 14.59:1 |
| `--surface-2` | `#EDF1F6` | derived, table headers | navy on it: 13.69:1 |
| `--ink-deep` | `#001847` | logo deep navy, 3.4% | for nav/hero fills |

### 4.2 The one hard constraint

**Red on navy is 2.36:1 — a WCAG failure.** The instinctive design (navy bar,
red active pill) is not available. Rules:

- Red text and red fills appear **on white or `--bg` only**.
- Navy and white carry each other (15.53:1 both directions).
- Active/selected states are **navy fill + white text**, not red.
- Red is reserved for emphasis: championship rings, the `pct-good` highlight,
  hover borders, the active view-toggle underline.

### 4.3 Scope of the sweep

`styles.css` has **63 hardcoded color literals outside the `:root` block**. The
theme change is a tokenization pass, not a `:root` swap. Every literal becomes a
token reference or is deleted. Specific known offenders:

- `body` background is a hardcoded three-stop `radial-gradient` (line 30).
- `.stats-table th` `#020617`, `.stats-table th/td.col-team` `#0d111f`.
- `.dataframe th` `#020617`.
- `.view-toggle-bar` gradient to transparent over `#020617`.
- `.card-simple` `rgba(255,255,255,0.02)` and its `#ff7a45` hover — the only
  place the old orange is written twice.
- `.pct-good` `#4ade80`.
- The win/loss/playoff column bands (green/red/gold tints, ~14 literals).
- `.has-tooltip::after` background and border.

### 4.4 Column-band semantics — open question

The stats table currently bands wins green, losses red, playoffs/rings gold.
In the new palette, red is the *brand accent*, so red-for-losses becomes
ambiguous. Recommendation: keep green for wins, retint losses to a **desaturated
warm grey** (`#8A7F7D` family) rather than brand red, and keep gold for
rings/playoffs. This reserves `--accent` red for championship emphasis, which is
the more meaningful use. Flagged for the owner's call — see §11.

### 4.5 Logo placement

- **`index.html` only:** the logo renders as a hero above the page title, at its
  native 257px max width, centered. Above ~180px it will soften slightly; native
  width is the ceiling until a higher-resolution source exists.
- **Favicon:** generate a multi-size `.ico` from the PNG, replacing the current
  65KB `favicon.ico`.
- Inner pages get **no** header mark (decided).
- File lands at `assets/img/logo.png`.

### 4.6 Files touched (A)

```
assets/img/logo.png          new (copied from IMG_0146.png)
favicon.ico                  regenerated from the logo
assets/css/styles.css        :root rewritten; 63 literals tokenized
index.html                   hero <img> added
```

---

## 5. Workstream B — Seasons archive page

### 5.1 Shape

One page, `seasons.html`, with a year toggle (2018 / 2019) reusing the visual
pattern of Canton's `.view-toggle-bar`. Adding 2020+ later is one more button
plus one more data file. Four views per year: **Standings**, **Weekly matchups**,
**Draft board**, **League settings**.

### 5.2 Data delivery

The two exports ship **as-is** to `assets/data/2018.json` and `assets/data/2019.json`.
No preprocessing step. Measured:

| File | Raw | Gzipped |
|---|---|---|
| 2018 | 766 KB | **50 KB** |
| 2019 | 731 KB | **46 KB** |

GitHub Pages gzips automatically, so a season costs about one photo over the
wire. A year is fetched **lazily** on first click of its toggle and cached in
memory for the session. The 2018 file is fetched on load since 2018 is the
default view.

### 5.3 Module split (approved approach B)

**`assets/js/season-data.js`** — no DOM access. Fetches one year's export and
returns a plain view model. This is where the real logic lives, and it is
runnable in node against the JSON files for verification.

```js
{
  year, leagueName, providerLeagueId,
  settings: { teams, playoffTeams, playoffWeekStart, rosterPositions, scoring },
  teams:   [ { rosterId, teamName, manager, displayName,
               wins, losses, pointsFor, pointsAgainst,
               finalRank, playoffSeed, recordString } ],
  weeks:   [ { week, isPlayoff,
               games: [ { home, away, homePoints, awayPoints, winner,
                          homeStarters, awayStarters } ] } ],
  draft:   { rounds, teams, picks: [ { pickNo, round, rosterId, player, position } ] },
}
```

**`assets/js/seasons.js`** — renders that model into the four views, owns the
year and view toggles, and the loading/error states.

### 5.4 Normalization hazards

These are the reasons the data module is worth isolating. Each is a real
property of the ESPN export, confirmed against both files:

1. **Matchups are team-sides, not games.** `matchups_by_week["1"]` is a flat
   array with one entry per team. Games must be reassembled by pairing on
   `matchup_id` and `metadata.opponent_roster_id`, using
   `metadata.home_away` to decide orientation.
2. **The draft is a snake.** Odd rounds run slot 1→10, even rounds 10→1. The
   grid renderer must reverse alternate rounds or the board is wrong.
3. **Managers join through two hops.** `roster.owner_id` → `users[].user_id` →
   `users[].metadata.first_name`/`last_name`. `display_name` is an ESPN handle
   (`18indycoltsfan18`), not a name.
4. **Two players per season have no `full_name`.** (`espn:14145`, `espn:4036348`
   in 2018; `espn:4038441`, `espn:3123052` in 2019.) Fall back to the player id
   rather than rendering `undefined`.
5. **`final_rank` and `playoff_seed` are strings** in `roster.metadata`, not
   numbers. Parse before sorting or rank 10 sorts before rank 2.
6. **The `record` streak string is not the regular season.** It runs all 16
   weeks and includes playoff and consolation results, and is 15 or 16
   characters depending on whether the team had a bye. Standings must show
   W-L from `roster.settings` and truncate the streak string to the first 13
   characters (`playoff_week_start - 1`). See §6.4.1.
7. **Weeks 14-16 are not all playoff games.** Each of those weeks contains
   `WINNERS_BRACKET`, `WINNERS_CONSOLATION_LADDER` and
   `LOSERS_CONSOLATION_LADDER` matchups side by side. The Weekly Matchups view
   must label them distinctly rather than presenting five equal games — a
   consolation final is not a semifinal.

### 5.5 Two managers not on the site

`Brandon Wilbur` (2018 + 2019) and `Bob The Builder` / `hoff_98` (2018) appear
in the exports but have no nickname on the site. Standings render their real
name. They are correctly absent from `stats.csv` — see §7.6.

### 5.6 Error handling

A failed fetch renders a visible message inside the view container ("Couldn't
load the 2018 season"), never a silent empty table. This is deliberate: review
finding #11 documents the existing silent-failure behavior on the stats page,
and the same pattern must not be reproduced here.

### 5.7 Canton cross-links

- `canton.js` adds a link on the 2018 and 2019 Team View rows → `seasons.html#2018` / `#2019`.
- `seasons.js` marks the `final_rank: 1` row in Standings with 🏆 linking back to `canton.html`.
- `seasons.html` reads `location.hash` on load to pick the initial year.

### 5.8 Files touched (B)

```
seasons.html                     new
assets/js/season-data.js         new
assets/js/seasons.js             new
assets/data/2018.json            new (copied)
assets/data/2019.json            new (copied)
assets/css/styles.css            season-view styles
assets/js/canton.js              cross-links on 2018/2019 rows
index.html, stats.html,
canton.html, docs.html           SEASONS nav link (keep nav in sync — AGENTS.md)
```

---

## 6. Workstream C — Generated Stats

### 6.1 Architecture decision: generator, not live fetch

CORS **is** open (verified — see §7.2), so a browser-side fetch would work. It is
still the wrong choice:

- ~25 API calls on every single page view, against a free unauthenticated API.
- Page render blocked on 6 seasons of network round-trips.
- The page breaks if Sleeper changes a field or goes down.
- The 2026 league is `pre_draft`, so the live path needs "latest completed
  season" logic that can silently pick up an empty season.

Instead: **`tools/build_stats.py`**, run deliberately ("rerun the fetch"), writes
`assets/data/stats.json`, which is committed. The page loads one small file.
The site keeps working if Sleeper changes. Python 3 with only stdlib
(`urllib`, `json`) — no dependencies, and the repo already assumes `python3`
for local preview.

### 6.2 Inputs

```
assets/data/2018.json      ESPN export   ─┐
assets/data/2019.json      ESPN export    ├─→ build_stats.py ─→ assets/data/stats.json
Sleeper API (2020-2025)                   │
assets/data/overrides.json  hand-kept    ─┘
```

### 6.3 `overrides.json` — the entire manual surface

Three things the data genuinely cannot supply — an identity map, the co-owner
credit rule, and the ring lore — plus one set of curated values kept purely as
assertions. Everything else derives.

This file is the whole manual surface. It exists so the generator never needs
editing.

All Sleeper user ids below are **real, fetched from the API** — `user_id` is
stable across seasons (`cdemurjian` is `566433163276656640` in 2020, 2024 and
2025 alike), so this map is written once.

```jsonc
{
  "managers": {
    // (1) nickname -> every identity that is this person
    "Charlie": { "sleeper": ["566433163276656640"],  "espnName": "Charlie Demurjian" },
    "Nick":    { "sleeper": ["596540594256396288"],  "espnName": null },
    "Stove":   { "sleeper": ["596527482476220416"],  "espnName": "Stephen Macejko" },
    "Matt":    { "sleeper": ["567084260707282944"],  "espnName": "Matthew Fuchs" },
    "Jay":     { "sleeper": ["566438163756843008"],  "espnName": ["gordon korman", "Jay Korman"] },
    "Tyler":   { "sleeper": ["411612739752955904"],  "espnName": "Tyler Huhtanen" },
    "Devin":   { "sleeper": ["545776737189720064"],  "espnName": "devin pallanck" },
    "Kap":     { "sleeper": ["596556815018278912"],  "espnName": "Joe  Foe" },
    "Bij":     { "sleeper": ["596540312357232640"],  "espnName": "Justin Bijari" },
    "Leo":     { "sleeper": ["566439156912316416"],  "espnName": null },
    "Chaf":    { "sleeper": ["596444370052374528",   // mchaf0503  2020-22, 22-19
                             "1042849693107150848"], // chafsucks  2023,    8-6
                 "espnName": "Max Chafiian" }
  },

  "rosterCredits": [
    // (2) the Leo/Jay co-ownership. Verified: 2021 roster 4, owner Jkorm0112 (6-8),
    // co_owners ['566439156912316416']. It is the ONLY non-null co_owners in the chain.
    { "season": "2021", "rosterId": 4, "creditTo": "Leo",
      "note": "Leo co-managed Jay's team; the league credits the 6-8 to both" }
  ],

  // (3) Playoff records are DERIVED for both eras (§6.4, §7.8). These curated
  // career values are kept as the generator's ASSERTION TARGET, not as inputs:
  // build_stats.py computes each record and fails loudly if it disagrees.
  // 9 of 11 currently reconcile exactly. See §11.3 for the two that do not.
  "curatedPlayoffRecords": {
    "Charlie": "6-4", "Nick": "6-5", "Stove": "4-2", "Matt": "3-2",
    "Jay":     "4-3", "Tyler": "3-4", "Devin": "3-5", "Kap":  "3-5",
    "Bij":     "1-4", "Leo":   "0-1", "Chaf":  "4-4"
  },

  "rings": [
    // Sleeper-era ring YEARS are derived. Only lore and asterisks live here.
    { "year": 2018, "manager": "Charlie", "mickeyMouse": true,
      "note": "Inception of League Mickey Mouse Ring" },
    { "year": 2022, "manager": "Jay", "mickeyMouse": true,
      "note": "Damar Hamlin Mickey Mouse Ring" },
    { "year": 2023, "manager": "Tyler", "mickeyMouse": true,
      "note": "Chaf Council of Shitters Mickey Mouse Ring" }
  ]
}
```

### 6.4 Derivation rules

| Output | Rule | Status |
|---|---|---|
| ESPN W/L | Sum `roster.settings.wins/losses` from the two exports, joined via `overrides.managers[].espn` | derived |
| Sleeper W/L | Sum `settings.wins/losses` across the 2020–2025 chain, grouped by `overrides.managers[].sleeper`, **plus** `rosterCredits` | derived |
| TOTAL W/L, RECORD, PERCENTAGE | Arithmetic on the two above | derived |
| PLAYOFFS years | Sleeper: `roster_id` appears as an integer `t1`/`t2` in `winners_bracket`. ESPN: any week-14/15/16 matchup tagged `playoff_tier_type: WINNERS_BRACKET` | **fully derived, both eras — all 11 managers reproduce exactly** (§7.8) |
| PLAYOFFS denominator | Count of seasons the manager appears in any roster, both eras | derived |
| PLAYOFF RECORD | **Sleeper:** count bracket matches where `p` is absent or `p == 1` — the title path, excluding 3rd/5th-place games. **ESPN:** count week 14-16 matchups tagged `playoff_tier_type: WINNERS_BRACKET`, **excluding byes** (a bye has `opponent_roster_id: null` and must not be scored as a loss) | **derived, both eras** — validated against `curatedPlayoffRecords` (§7.8) |
| RING years | Winner of the `p == 1` match per season | derived (Sleeper era) |
| RING lore/asterisks | `overrides.rings[].note` / `.mickeyMouse` | manual |

**The title-path rule matters.** Counting every bracket game gives Nick 8-7.
Counting only the title path gives 6-5, which matches the CSV — and matches
Matt 3-2, Kap 3-5, Leo 0-1 as well. A bye is not a win: Leo was the 2025
1-seed with a bye, lost the semifinal and the third-place game, and is credited
0-1.

Note `p` is **undocumented** in the Sleeper API. The convention was inferred
empirically and holds across 2020, 2023 and 2025. The generator must assert
that its derived numbers reproduce the four all-Sleeper careers exactly and
fail loudly if a future season breaks the assumption.

### 6.4.1 Consolation games count for nothing — both eras

**Invariant.** A consolation game is not a playoff game. It contributes to no
record, no appearance, no ring, and no streak, in either era. This applies
everywhere, not just to `PLAYOFF RECORD`.

How consolation is identified in each source:

| Source | Title path | Consolation — **exclude** |
|---|---|---|
| ESPN export | `playoff_tier_type: WINNERS_BRACKET` | `WINNERS_CONSOLATION_LADDER`, `LOSERS_CONSOLATION_LADDER` |
| Sleeper API | `winners_bracket` matches with `p` absent or `p == 1` | `winners_bracket` matches with `p == 3` or `p == 5`; the entire `losers_bracket` |

Three consequences that are easy to get wrong:

1. **Byes are not games.** ESPN: a `WINNERS_BRACKET` entry with
   `opponent_roster_id: null`. Sleeper: a team appearing as a bare integer `t1`
   in round 2 with no `t1_from`. Skip them — do not score them as losses. Stove
   and Jay have one each, Devin two.
2. **Playoff appearances also use title-path games only.** Verified: restricting
   appearance detection to the title path changes nothing, because every playoff
   team plays at least one title-path game or has a bye. Consolation
   participation is therefore never needed as evidence, and must not be used.
3. **`standings[].record` is contaminated — do not derive from it.** The ESPN
   streak string covers all 16 weeks, so it bakes in playoff *and* consolation
   results, and it is 15 or 16 characters depending on whether the team had a
   bye (a bye contributes no character). Regular-season W/L must come from
   `roster.settings.wins/losses`. Confirmed: `settings` is regular-season only
   in both sources — no Sleeper roster exceeds 14 total games, and ESPN's
   settings match weeks 1–13 exactly.

   For **display** (§5.4), truncate the string to the first
   `playoff_week_start - 1` characters. Verified: the first 13 characters
   reproduce the regular-season record for every team in both seasons.

`build_stats.py` asserts this invariant: excluded-tier games must contribute
zero to every output field, and the derived regular-season totals must still
balance (wins == losses league-wide, after `rosterCredits`).

### 6.5 Chain walk

Start from the configured league id, follow `previous_league_id` to the end,
and **skip any league whose `status` is not `complete`**. As of 2026-08-17 the
configured id `1354540358725308416` is the 2026 pre-draft league; the walk
yields 2025 → 2020 and terminates (`previous_league_id: null`). Cost: ~25 GETs
against a documented ~1000/min limit.

### 6.6 `stats.json` and the page

Output is one row per manager with **typed fields**, not display strings:

```jsonc
{
  "generatedAt": "2026-08-17T...",
  "seasons": { "espn": [2018, 2019],
               "sleeper": [2020, 2021, 2022, 2023, 2024, 2025] },
  "managers": [
    { "name": "Charlie",
      "espn":    { "wins": 15, "losses": 11 },
      "sleeper": { "wins": 39, "losses": 44 },
      "total":   { "wins": 54, "losses": 55, "pct": 0.4954 },
      "playoffs": { "made": 5, "possible": 8, "years": [2018, 2019, 2021, 2024, 2025],
                    "record": { "wins": 6, "losses": 4 } },
      "rings": [ { "year": 2018, "mickeyMouse": true, "note": "Inception of..." },
                 { "year": 2025, "mickeyMouse": false } ] }
  ]
}
```

Typed output kills a whole class of bug: the current sort comparator strips
non-digits from display strings, which is why an en-dash in one CSV cell makes
the PLAYOFFS column sort Charlie as 581,819,212,425 (finding #3). With numbers
in the data, sorting compares numbers.

`stats.js` is rewritten to consume this: fetch JSON → format display strings at
render time → sort on the underlying typed value via `data-sort-value`. The
existing header-text→CSS-class mapping is replaced by an explicit column
definition list, so renaming a heading no longer silently drops its styling.

`stats.csv` is retained in the repo as the historical record, unreferenced.

### 6.7 Files touched (C)

```
tools/build_stats.py             new
assets/data/overrides.json       new
assets/data/stats.json           new (generated, committed)
assets/js/stats.js               rewritten
stats.html                       minor (column defs / error container)
assets/data/stats.csv            retained, no longer loaded
README.md                        document how to rerun the fetch
```

---

## 7. Verified facts

Everything below was confirmed against the live API or the export files on
2026-08-17, not assumed.

### 7.1 League chain

| Season | league_id | name | status |
|---|---|---|---|
| 2026 | 1354540358725308416 | Uconn-GN RD | **pre_draft** |
| 2025 | 1218604624068497408 | Uconn-GN RD | complete |
| 2024 | 1048344073548976128 | Uconn-GN RD | complete |
| 2023 | 963858600345014272 | Uconn-GN RD | complete |
| 2022 | 831416172854476800 | Uconn-GN RD | complete |
| 2021 | 682345492260130816 | Uconn-GN RD | complete |
| 2020 | 596542463120818176 | UconnGreatNeckFFL | complete |

The nav's ffwrapped link points at the 2025 league and will go stale each season.

### 7.2 CORS

```
GET /v1/league/1218604624068497408   Origin: https://www.uconn-gn-ffl.com
HTTP/2 200
access-control-allow-origin: *
cache-control: public, s-maxage=86400, stale-while-revalidate=300
```

Open. Recorded because it means §6.1's decision is a choice, not a constraint —
if the generator ever becomes annoying, a live path is available.

### 7.3 Sleeper records balance

Raw per-account totals 2020–2025 sum to **415 W / 415 L** — balanced, as they
must be. `stats.csv` totals 421/423 because Jay's 2021 roster (6-8) is
deliberately credited to both Jay and Leo. `415 + 6 = 421`, `415 + 8 = 423`.
**The CSV is correct.**

### 7.4 The Leo/Jay season is 2021

2021 roster 4, owner `Jkorm0112` (6-8), `co_owners: ['Lkorm0417']`. No other
season in the chain has a non-null `co_owners`.

### 7.5 Chaf is two accounts

`mchaf0503` (2020–22, 22-19) + `chafsucks` (2023, 8-6) = 30-25, matching the CSV.

### 7.6 ESPN era reconciles exactly

Per-manager ESPN W/L from the exports matches all nine CSV rows. Column totals:
120 W / 101 L, plus the two managers absent from the site (Wilbur 7-19, Bob The
Builder 3-10) = **130 / 130**. Balanced.

### 7.7 Sleeper-era playoff records and champions (computed)

Title-path rule applied across the full chain:

| Manager | Sleeper playoff record | Playoff seasons |
|---|---|---|
| Nick | 6-5 | 2020–2025 (all six) |
| Jay | 4-2 | 2020, 2022, 2024 |
| Charlie | 3-2 | 2021, 2024, 2025 |
| Devin | 3-3 | 2021, 2022, 2023, 2025 |
| Matt | 3-2 | 2020, 2022, 2025 |
| Kap | 3-5 | 2020, 2021, 2022, 2023, 2025 |
| Tyler | 3-3 | 2020, 2021, 2023, 2024 |
| Stove | 2-2 | 2023, 2024 |
| Chaf | 2-3 (both accounts) | 2021, 2022, 2023 |
| Bij | 1-2 | 2020, 2024 |
| Leo | 0-1 | 2025 |

Champions 2020→2025: **Matt, Devin, Jay, Tyler, Nick, Charlie** — matching every
Sleeper-era RING year in the CSV.

The four all-Sleeper careers (Nick 6-5, Matt 3-2, Kap 3-5, Leo 0-1) match the
CSV exactly, which is what validates the title-path rule: for those managers
the CSV career record *is* the Sleeper record, with nothing else mixed in.

### 7.8 PLAYOFFS years derive exactly; one CSV error found

Deriving playoff appearances from both eras reproduces the CSV year lists for
**all 11 managers, exactly** — including Chaf's split across two accounts and
Leo's co-owned 2021.

The denominators also match for 10 of 11. The exception:

> **Jay is listed as 5/7. His tenure is 8 seasons** (2018 as `gordon korman`,
> 2019 as `Jay Korman`, then 2020–2025). The CSV's own ESPN W/L column credits
> him 20-6 across both 2018 and 2019, so 2018 is counted for wins but not for
> seasons-possible. It should read **5/8**.

This is a real, small error, and it is the kind the generator exists to prevent.

**ESPN playoff records are derivable too.** ESPN's `playoff_tier_type` separates
the title path from consolation cleanly — no elimination tracking is needed:

| Tier | Count (2018+2019) | Meaning |
|---|---|---|
| `WINNERS_BRACKET` | 24 | the title path |
| `WINNERS_CONSOLATION_LADDER` | 12 | 3rd/5th place among playoff teams |
| `LOSERS_CONSOLATION_LADDER` | 24 | toilet bowl |

**The one trap is byes.** A first-round bye appears as a `WINNERS_BRACKET` entry
with `opponent_roster_id: null` and no `won_matchup: "true"`. Counting it
naively records a **loss**. Stove and Jay have one bye each, Devin two — and
that alone accounted for every apparent disagreement in an earlier analysis of
this data. Byes must be skipped, not scored.

With byes excluded, ESPN-derived + Sleeper-derived reconciles against the
curated career records for **9 of 11 managers**:

| | ESPN | Sleeper | total | curated | |
|---|---|---|---|---|---|
| Nick | 0-0 | 6-5 | 6-5 | 6-5 | ✓ |
| Stove | 2-0 (1 bye) | 2-2 | 4-2 | 4-2 | ✓ |
| Matt | 0-0 | 3-2 | 3-2 | 3-2 | ✓ |
| Tyler | 0-1 | 3-3 | 3-4 | 3-4 | ✓ |
| Devin | 0-2 (2 byes) | 3-3 | 3-5 | 3-5 | ✓ |
| Kap | 0-0 | 3-5 | 3-5 | 3-5 | ✓ |
| Bij | 0-2 | 1-2 | 1-4 | 1-4 | ✓ |
| Leo | 0-0 | 0-1 | 0-1 | 0-1 | ✓ |
| Chaf | 2-1 | 2-3 | 4-4 | 4-4 | ✓ |
| Charlie | 3-1 | 3-2 | **6-3** | 6-4 | ✗ |
| Jay | 1-2 (1 bye) | 4-2 | **5-4** | 4-3 | ✗ |

So `PLAYOFF RECORD` is fully derived, and the curated values become the
generator's assertion target rather than its input. The two disagreements are
tracked in §11.3.

### 7.9 Awards discrepancy — unresolved

`AWARDS_DATA` SB MVP figures match the exports (Rodgers 42.88 ≈ 42.9 in the 2018
title game; Barkley 41.90 exact in 2019). MVP season totals do **not**: Luck
computes 304.32 across weeks 1–16 vs 327.6 on the site; Michael Thomas 294.40 vs
300.1. The exports cover weeks 1–16 only, so ESPN's season page (including week
17) is the likely source. **Left alone** — Canton data is out of scope, and the
numbers may have been sourced deliberately.

---

## 8. Review fixes folded in

Only the two that sit directly in this work's path:

- **Finding #2** — `.dataframe td { position: relative }`. The Seasons page uses
  `.dataframe`, so without this it inherits the bug where tooltips render at the
  page's bottom-left corner instead of under the cell.
- **Finding #11** — the silent-failure pattern. Both new fetch paths (Seasons,
  Stats) render a visible error instead.

The other 13 findings — including the `"Jeff Wilson "` trailing space, the sort
comparator, the mobile-unreachable Positional tooltips, and the stale
`canton/canton.html` duplicate — are a separate pass.

---

## 9. Testing

No test framework exists and none is being added (AGENTS.md: no frameworks).

**Automated where it's cheap:**
- `season-data.js` is DOM-free, so it can be run under node against both export
  files. Assert: every week pairs into exactly 5 games; team count is 10;
  standings ranks are 1–10 with no gaps; every starter resolves to a name or an
  explicit id fallback; draft pick count is 180 (2018) and 160 (2019).
- `build_stats.py` self-checks before writing. Any failure aborts without
  writing anything:
  - Regular-season W/L balances league-wide (wins == losses) after
    `rosterCredits` are removed.
  - Every derived playoff record matches `curatedPlayoffRecords`, except where
    an explicit override with a note exists (§11.3).
  - Derived champions match the `overrides.rings` years.
  - **Consolation contributes zero** (§6.4.1): re-running the derivation with
    all excluded-tier games deleted from the input produces byte-identical
    output. This is the strongest form of the invariant — if any consolation
    game leaked into any field, the two runs differ.
  - No manager's regular-season total exceeds the season's game count, which
    would mean playoff games leaked into `settings.wins`.

**Manual, per AGENTS.md:**
- Every page at a narrow viewport; nav links in sync across all five pages.
- Theme: no red-on-navy anywhere; spot-check contrast on the retinted bands.
- Seasons: toggle both years and all four views; confirm the 2018 fetch is lazy
  and cached (one network request per year per session).

---

## 10. Sequencing

The theme touches the same stylesheet every other workstream adds to, so it
goes first to avoid writing styles twice.

1. **A** — palette tokens, 63-literal sweep, logo hero, favicon.
2. **B** — Seasons page (data module, then views, then cross-links and nav).
3. **C** — generator, overrides, `stats.json`, `stats.js` rewrite.

Each is independently shippable.

---

## 11. Open questions

**Resolved 2026-08-17:** losses retint to desaturated warm grey, red reserved
for championships (§4.4). `stats.csv` is retained, unreferenced. `gordon korman`
is confirmed to be Jay, so his playoff line becomes **5/8**. `build_stats.py`
runs locally by hand.

### 11.1 ffwrapped nav link

Points at the 2025 league (`1218604624068497408`) and goes stale annually. Leave
it, or have the generator emit the current league id into `stats.json` and have
the nav read it?

### 11.2 Ties

`roster.settings.ties` exists on the Sleeper side and is 0 in every season so
far. The `W-L` display format has no tie slot. Decide the format now or when it
first happens.

### 11.3 Two playoff records disagree with the derivation

Both eras now derive (§7.8), and 9 of 11 reconcile. These two do not:

**Jay — derived 5-4, curated 4-3.** Diagnosable: 4-3 is exactly his 2018 result
(0-1) plus his Sleeper record (4-2). His **2019 playoff run is missing** — he
beat Bij in week 14 and lost to Stove in week 15, a 1-1 that isn't reflected.
The derived 5-4 appears correct.

**Charlie — derived 6-3, curated 6-4.** Not diagnosable from the data. His 2019
was a week-14 loss to Chaf, then two *consolation* wins over Bij; there is no
second title-path loss anywhere in either export. Reads like a tally slip, but
it may encode league lore the data cannot see.

Both need your call. Options per manager: accept the derived value, or record
the curated value in `overrides.json` with a note explaining why the data is
wrong. The generator should refuse to write output when a derived record
disagrees with a curated one that has no override — silent divergence here is
exactly what this workstream exists to prevent.
