---
name: season-rollover
description: Use when adding a finished fantasy season to the UCONN-GN-FFL site — pulling the new year from Sleeper, regenerating the stats table, adding the champion to Canton, and archiving a CSV snapshot. Trigger on "add 2026", "roll over the season", "the season finished", "update the site for this year".
---

# Adding a finished season

Run this after a league year ends. It takes about fifteen minutes, most of it
Canton, which is hand-curated by design.

Repo root: the directory containing `index.html` and `tools/`.
Throughout, `<YYYY>` is the season being added (e.g. `2026`) and `<yy>` its
two-digit form (`26`).

## Before you start: is the season actually over?

`build_seasons.py` only accepts leagues whose Sleeper `status` is `complete`.
A season still in progress, or one sitting in `pre_draft`, is skipped silently
— that is deliberate, so a half-finished year can never reach the site.

```bash
python3 -c "
import json, urllib.request
lid = json.load(open('assets/data/overrides.json'))['leagueId']
d = json.load(urllib.request.urlopen(f'https://api.sleeper.app/v1/league/{lid}'))
print(d['season'], d['status'], '<- must be complete')
"
```

If this prints the *previous* season, the `leagueId` in `overrides.json` is
stale: Sleeper mints a new league id every year. Take the id out of the league
URL (`https://sleeper.com/leagues/<id>`) and update `overrides.json`. The
chain walk follows `previous_league_id` backwards from there, so pointing at
the newest year picks up every earlier one automatically.

---

## Step 1 — Pull the season from Sleeper

```bash
python3 tools/build_seasons.py            # writes assets/data/<YYYY>.json
python3 tools/build_seasons.py --check    # or verify without writing
```

About 25 API calls against a documented ~1000/min limit. It writes one
pre-normalized document per completed season and **refuses to write any season
whose self-checks fail**: final ranks must be 1–10 with no gaps, records must
balance league-wide, each streak must reproduce its own W-L, no game may be
both title-path and consolation, and the draft must be rounds × teams.

Expected output is one line per season ending `[ok]`, then
`all seasons validated`.

### If it fails

- **`final ranks are [...]`** — the bracket is incomplete or unusual. Check the
  winners bracket has a `p == 1` match with a `w`.
- **`streak ... != W-L`** — a week is missing from the API, or a matchup has no
  opponent outside the playoff round.
- **Nothing written for `<YYYY>`** — the season is not `complete`. See above.

---

## Step 2 — Show the new year on the Seasons page

Two edits, both mechanical:

1. `seasons/index.html` — add a button to `.year-toggle-bar`, and move the
   `active` class to it so the page opens on the newest season:
   ```html
   <button class="view-button active" data-year="<YYYY>"><YYYY></button>
   ```
2. `assets/js/seasons.js` — append the year to `YEARS`. `DEFAULT_YEAR` is the
   last entry, so ordering matters.

Nothing else: the page fetches `assets/data/<YYYY>.json` by name, and the
ffwrapped link for the year comes from the file itself.

---

## Step 3 — Regenerate the career stats

```bash
python3 tools/build_stats.py
```

This reads the season documents and the two ESPN exports. **It never touches
the network** — refreshing Sleeper is Step 1's job.

### It will almost certainly abort the first time. That is the design.

```
ABORTED: derived figures disagree with curated values:
  Nick: derived 7-6 but curated 6-5
```

`overrides.json` → `curatedPlayoffRecords` holds the league's own record of
each manager's career playoff W-L. A new season changes those numbers, so they
must be updated to match. **Read the derived value, satisfy yourself it is
right, then update the curated value.** The check exists so a silent
derivation change cannot slip past you — do not defeat it by blanket-adding
overrides.

Use `playoffRecordOverrides` only when the derived figure is genuinely wrong
and you want the curated one kept, and always write down *why*:

```jsonc
"Someone": { "accept": "curated", "why": "commissioner reversed the week 16 result" }
```

`"accept": "derived"` records the opposite decision — the curated number was
wrong — and is what the two existing entries do.

---

## Step 4 — Update `overrides.json` for anything the data cannot know

This file is the **only** hand-maintained input. Four things live here.

### A new manager joined

Find their Sleeper `user_id` — it is stable across seasons, so this is a
once-per-person job:

```bash
python3 -c "
import json, urllib.request
lid = json.load(open('assets/data/overrides.json'))['leagueId']
for u in json.load(urllib.request.urlopen(f'https://api.sleeper.app/v1/league/{lid}/users')):
    print(u['user_id'], u['display_name'])
"
```

Add them under `managers`. `espn` stays `[]` for anyone who never played
2018–2019:

```jsonc
"Newbie": { "sleeper": ["<user_id>"], "espn": [] }
```

**If someone plays under a second account**, add both ids to the same manager —
that is how Chaf's two accounts resolve to one career. Two managers claiming
one id now aborts the build rather than silently reassigning a career.

### Someone managed another manager's team

```jsonc
{ "season": "<YYYY>", "rosterId": 4, "creditTo": "Leo", "mode": "transfer",
  "note": "why this happened" }
```

`transfer` means the season belongs to `creditTo` **instead of** the roster
owner — record, tenure, playoff games and any ring all move. `share` credits
both and deliberately double-counts, which makes the league-wide totals stop
balancing. Prefer `transfer`; `share` only if the league really wants one
season on two résumés.

### The champion's ring has a story

Sleeper-era ring *years* are derived automatically. Only lore and the asterisk
go here:

```jsonc
{ "year": <YYYY>, "manager": "Name", "mickeyMouse": false, "note": "" }
```

`mickeyMouse: true` renders the year with an asterisk — the league's mark for
an illegitimate title.

---

## Step 5 — Add the champion to Canton (hand-curated)

Canton is deliberately **not** generated: it is the league's own record of who
brought it home, and the team view is the **championship-game starting
lineup**, not the end-of-season roster. Those differ — a player traded away in
week 7 must not appear.

Pull the actual title-game lineup:

```bash
python3 -c "
import json
Y='<YYYY>'
d=json.load(open(f'assets/data/{Y}.json'))
champ=[t for t in d['teams'] if t['finalRank']==1][0]
print('champion:', champ['teamName'], '/', champ['manager'])
print('Open Sleeper for the week', d['settings']['playoffWeekStart']+2,
      'final and copy the starting lineup.')
"
```

The Sleeper season documents intentionally do not store per-player starters
(it kept the files at ~38KB), so take the lineup from the Sleeper app or its
matchups endpoint.

Then in `assets/js/canton.js`:

1. Add an entry to `teamData` in the existing shape — `QB`/`RB`/`WR`/`TE`/
   `FLEX`/`K`/`DST` are the starters, `BN` the bench.
2. **Add every new bench player to `inferBenchPosition`** with their real
   position. An unmapped bench player now warns in the console and falls back
   to FLEX, but the map is what keeps Positional View honest.
3. Add the year to `AWARDS_DATA` — MVP, MVP points, SB MVP, and the
   championship-game performance.

Verify nothing fell through:

```bash
node -e '
const fs=require("fs"), src=fs.readFileSync("assets/js/canton.js","utf8");
const m=new Function("document","console",src+";return {teamData,inferBenchPosition,AWARDS_DATA};")(
  {addEventListener(){},getElementById(){return null},querySelectorAll(){return []}},console);
const OK=["QB","RB","WR","TE","FLEX","DST","K"]; let bad=0;
for (const t of m.teamData) for (const n of (t.roster.BN||[]))
  if(!OK.includes(m.inferBenchPosition(n))) {console.log("unmapped:",t.year,n); bad++;}
const roster=new Set(); for(const t of m.teamData) for(const k of Object.keys(t.roster)) for(const n of t.roster[k]) roster.add(n);
for (const a of m.AWARDS_DATA) for (const k of ["mvp","sbMvp"])
  if (a[k] && !roster.has(a[k].trim())) console.log("award name not on any roster:",a.year,k,JSON.stringify(a[k]));
console.log(bad?`${bad} unmapped bench players`:"all bench players mapped");'
```

An award name that matches no roster player is a typo — a stray trailing space
once forked a player into a phantom zero-title row.

---

## Step 6 — Archive a CSV snapshot

```bash
python3 tools/export_stats_csv.py     # -> assets/data/stats-<yy>.csv
```

A frozen, tool-free record of the table as it stood at the end of that season.
Nothing loads these; they are never build inputs.

Existing snapshots:

| File | What it is |
|---|---|
| `stats-25-he.csv` | the hand-maintained table as it stood before any of this was generated |
| `stats-25.csv` | the generated table through 2025 |

The two differ in exactly four places, all deliberate corrections — Jay's
record, tenure and playoff record, and Charlie's playoff record. See
`_planning/specs/` for the reasoning.

---

## Step 7 — Bust the cache

Bump the shared `?v=` on **every** page, for CSS and JS alike, in
`index.html`, `stats/index.html`, `seasons/index.html`, `canton/index.html`
and `docs/index.html`. One file must not carry two cache identities — that
once stopped a fix reaching returning visitors.

```bash
python3 - <<'PY'
import glob, re
V = "11"   # bump me
for f in ["index.html"] + glob.glob("*/index.html"):
    s = open(f, encoding="utf-8").read()
    s = re.sub(r'(/assets/css/styles\.css)(\?v=\d+)?"', rf'\1?v={V}"', s)
    s = re.sub(r'(/assets/js/[a-z-]+\.js)(\?v=\d+)?"', rf'\1?v={V}"', s)
    open(f, "w", encoding="utf-8").write(s)
print("bumped to", V)
PY
```

---

## Step 8 — Verify before committing

All four must pass:

```bash
python3 tools/check_theme.py                        # no colour outside :root
node --test tools/season-data.test.js               # season view model
cd tools && python3 -m unittest test_build_stats; cd ..
python3 tools/build_stats.py --check                # career table self-checks
```

Then look at it, at a phone width as well as a desktop one:

```bash
python3 -m http.server 8123
```

- `/seasons` — the new year is present, selected, and its standings, matchups
  and draft all render. Check the **year toggle wraps** rather than pushing
  early years off-screen; that broke once when the row grew.
- `/stats` — the new season is reflected; sort a few columns.
- `/canton` — the new champion's row is complete, and Positional View shows the
  new players with their years.
- Console clean on every page.

Commit `assets/data/`, `assets/js/canton.js`, `assets/js/seasons.js`, the five
`index.html` files and the new CSV snapshot.

---

## The rules that are permanently manual

These cannot be derived and will never be automated:

1. **Manager identity.** Sleeper ids and ESPN names → nicknames. One person can
   hold several accounts.
2. **Who a season belongs to** when someone else managed the team.
3. **Ring lore and the Mickey Mouse asterisk.** Human content, not data.
4. **Canton rosters and awards.** The league's own record of its champions.
5. **ESPN-era anything.** 2018 and 2019 are frozen exports; there is no API.

## The rule the whole pipeline enforces

**Consolation games count for nothing** — no record, no appearance, no ring, no
streak — in either era. A bye is not a game and is never a loss. In ESPN data
the title path is `playoff_tier_type == "WINNERS_BRACKET"`; in Sleeper it is a
`winners_bracket` match with no placement or `p == 1`. `test_build_stats.py`
proves it by deleting every consolation game from the inputs and asserting the
output is unchanged.

If you ever add a stat, keep it true.
