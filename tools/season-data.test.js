const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const { normalizeSeason } = require("../assets/js/season-data.js");

const ROOT = path.join(__dirname, "..");
function load(year) {
  const raw = JSON.parse(
    fs.readFileSync(path.join(ROOT, "assets/data", `${year}.json`), "utf8")
  );
  return normalizeSeason(raw, year);
}

test("2018 season header", () => {
  const s = load("2018");
  assert.strictEqual(s.year, "2018");
  assert.strictEqual(s.leagueName, "GarrigusGreatNeckFF18");
  assert.strictEqual(s.providerLeagueId, "936163");
  assert.strictEqual(s.settings.teams, 10);
  assert.strictEqual(s.settings.playoffTeams, 6);
  assert.strictEqual(s.settings.playoffWeekStart, 14);
});

test("both seasons have ten teams with unique ranks 1..10", () => {
  for (const year of ["2018", "2019"]) {
    const s = load(year);
    assert.strictEqual(s.teams.length, 10, `${year} team count`);
    const ranks = s.teams.map((t) => t.finalRank).sort((a, b) => a - b);
    assert.deepStrictEqual(ranks, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], `${year} ranks`);
    for (const t of s.teams) {
      assert.strictEqual(typeof t.finalRank, "number", `${year} rank is a number`);
      assert.strictEqual(typeof t.playoffSeed, "number", `${year} seed is a number`);
    }
  }
});

test("teams are sorted by final rank", () => {
  const s = load("2018");
  assert.strictEqual(s.teams[0].finalRank, 1);
  assert.strictEqual(s.teams[0].teamName, "Storrs Seducers");
  assert.strictEqual(s.teams[0].manager, "Charlie Demurjian");
});

test("streak is the regular season only and matches the W-L", () => {
  for (const year of ["2018", "2019"]) {
    const s = load(year);
    for (const t of s.teams) {
      assert.strictEqual(t.streak.length, 13, `${year} ${t.teamName} streak length`);
      const w = (t.streak.match(/W/g) || []).length;
      const l = (t.streak.match(/L/g) || []).length;
      assert.strictEqual(w, t.wins, `${year} ${t.teamName} streak wins`);
      assert.strictEqual(l, t.losses, `${year} ${t.teamName} streak losses`);
    }
  }
});

test("regular season records balance league-wide", () => {
  for (const year of ["2018", "2019"]) {
    const s = load(year);
    const w = s.teams.reduce((n, t) => n + t.wins, 0);
    const l = s.teams.reduce((n, t) => n + t.losses, 0);
    assert.strictEqual(w, l, `${year} wins must equal losses`);
  }
});

test("managers without a site nickname still get a real name", () => {
  const s = load("2018");
  const names = s.teams.map((t) => t.manager);
  assert.ok(names.includes("Brandon Wilbur"), "Wilbur present");
  assert.ok(
    names.every((n) => n && n.trim().length > 0),
    "no blank manager names"
  );
});

test("sixteen weeks, every team appearing exactly once per week", () => {
  // Not "5 games per week": a bye week is 4 games + 2 byes = 6 entries, still
  // covering all 10 teams. Coverage is the real invariant, not game count.
  for (const year of ["2018", "2019"]) {
    const s = load(year);
    assert.strictEqual(s.weeks.length, 16, `${year} week count`);
    for (const wk of s.weeks) {
      const seen = new Set();
      for (const g of wk.games) {
        assert.ok(!seen.has(g.home), `${year} wk${wk.week} duplicate ${g.home}`);
        seen.add(g.home);
        if (g.away !== null) {
          assert.ok(!seen.has(g.away), `${year} wk${wk.week} duplicate ${g.away}`);
          seen.add(g.away);
        }
      }
      assert.strictEqual(seen.size, 10, `${year} wk${wk.week} teams covered`);

      const byes = wk.games.filter((g) => g.isBye).length;
      assert.strictEqual(
        wk.games.length,
        (10 - byes) / 2 + byes,
        `${year} wk${wk.week} game count given ${byes} byes`
      );
    }
  }
});

test("weeks 14-16 carry all three playoff tiers", () => {
  const s = load("2018");
  const playoff = s.weeks.filter((w) => w.isPlayoffWeek);
  assert.strictEqual(playoff.length, 3, "three playoff weeks");
  const tiers = new Set(playoff.flatMap((w) => w.games.map((g) => g.tier)));
  assert.ok(tiers.has("WINNERS_BRACKET"), "title path present");
  assert.ok(tiers.has("WINNERS_CONSOLATION_LADDER"), "winners consolation present");
  assert.ok(tiers.has("LOSERS_CONSOLATION_LADDER"), "losers consolation present");
});

test("consolation games are flagged and never on the title path", () => {
  for (const year of ["2018", "2019"]) {
    const s = load(year);
    for (const wk of s.weeks) {
      for (const g of wk.games) {
        assert.strictEqual(
          g.isTitlePath && g.isConsolation,
          false,
          `${year} wk${wk.week}: a game cannot be both`
        );
        if (g.isConsolation) {
          assert.ok(g.tier.includes("CONSOLATION"), `${year} tier mismatch`);
        }
      }
    }
  }
});

test("byes are byes, not losses", () => {
  const s = load("2018");
  const byes = s.weeks.flatMap((w) => w.games.filter((g) => g.isBye));
  assert.strictEqual(byes.length, 2, "2018 has two first-round byes");
  for (const b of byes) {
    assert.strictEqual(b.away, null, "a bye has no opponent");
    assert.strictEqual(b.tier, "WINNERS_BRACKET", "byes sit on the title path");
    assert.strictEqual(b.winnerRosterId, null, "a bye has no winner");
  }
});

test("starters resolve to a name, falling back to the player id", () => {
  for (const year of ["2018", "2019"]) {
    const s = load(year);
    for (const wk of s.weeks) {
      for (const g of wk.games) {
        for (const p of g.homeStarters.concat(g.awayStarters)) {
          assert.ok(p.name && p.name.length > 0, `${year} blank name for ${p.playerId}`);
          assert.strictEqual(typeof p.points, "number", `${year} points is a number`);
        }
      }
    }
  }
});

test("draft pick counts match the exports", () => {
  assert.strictEqual(load("2018").draft.picks.length, 180);
  assert.strictEqual(load("2019").draft.picks.length, 160);
});

test("draft geometry is consistent", () => {
  for (const year of ["2018", "2019"]) {
    const d = load(year).draft;
    assert.strictEqual(d.teams, 10, `${year} draft teams`);
    assert.strictEqual(d.rounds * d.teams, d.picks.length, `${year} rounds x teams`);
    for (const p of d.picks) {
      assert.ok(p.column >= 1 && p.column <= d.teams, `${year} column ${p.column}`);
      assert.ok(p.name && p.name.length > 0, `${year} pick has a name`);
    }
  }
});

test("a team keeps the same column in every round", () => {
  for (const year of ["2018", "2019"]) {
    const d = load(year).draft;
    const column = {};
    for (const p of d.picks) {
      if (column[p.rosterId] === undefined) column[p.rosterId] = p.column;
      assert.strictEqual(
        p.column,
        column[p.rosterId],
        `${year} roster ${p.rosterId} moved column in round ${p.round}`
      );
    }
    assert.strictEqual(Object.keys(column).length, d.teams, `${year} column count`);
  }
});

test("the snake reverses roster order on even rounds", () => {
  const d = load("2018").draft;
  const order = (round) =>
    d.picks
      .filter((p) => p.round === round)
      .sort((a, b) => a.pickNo - b.pickNo)
      .map((p) => p.rosterId);
  assert.deepStrictEqual(order(1), [2, 9, 4, 5, 1, 3, 7, 6, 10, 8]);
  assert.deepStrictEqual(order(2), order(1).slice().reverse());
});

test("every draft column holds exactly one pick per round", () => {
  for (const year of ["2018", "2019"]) {
    const d = load(year).draft;
    for (let r = 1; r <= d.rounds; r += 1) {
      const cols = d.picks
        .filter((p) => p.round === r)
        .map((p) => p.column)
        .sort((a, b) => a - b);
      assert.deepStrictEqual(cols, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], `${year} round ${r}`);
    }
  }
});
