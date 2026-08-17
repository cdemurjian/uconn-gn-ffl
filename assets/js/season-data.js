// Turns a raw ESPN league export into a plain view model.
// No DOM access lives in this file, so it can be unit-tested under node.
// See docs/superpowers/specs/2026-08-17-logo-theme-seasons-stats-design.md §5.

// The title path. Consolation tiers contribute to no record: spec §6.4.1.
const TITLE_TIER = "WINNERS_BRACKET";

function fullName(user) {
  const meta = (user && user.metadata) || {};
  const name = [meta.first_name, meta.last_name].filter(Boolean).join(" ").trim();
  return name || (user && user.display_name) || "Unknown";
}

function playerLabel(players, playerId) {
  const p = players[playerId];
  if (!p) return playerId;
  // Two players per export carry no full_name. Fall back to the id rather
  // than rendering "undefined". Spec §5.4.
  return p.full_name || playerId;
}

function starterList(players, entry) {
  const points = entry.starters_points || {};
  return (entry.starters || []).map((id) => ({
    playerId: id,
    name: playerLabel(players, id),
    position: (players[id] || {}).position || "",
    points: points[id] || 0,
  }));
}

function normalizeTeams(season, usersById) {
  const streaks = {};
  (season.standings || []).forEach((row) => {
    streaks[row.roster_id] = row.record || "";
  });

  const regularWeeks = Number(season.league.settings.playoff_week_start) - 1;

  return season.rosters
    .map((roster) => {
      const meta = roster.metadata || {};
      const settings = roster.settings || {};
      const user = usersById[roster.owner_id];
      return {
        rosterId: roster.roster_id,
        teamName: meta.team_name || `Team ${roster.roster_id}`,
        manager: fullName(user),
        displayName: (user && user.display_name) || "",
        wins: settings.wins || 0,
        losses: settings.losses || 0,
        pointsFor: settings.fpts || 0,
        pointsAgainst: settings.fpts_against || 0,
        finalRank: Number(meta.final_rank),
        playoffSeed: Number(meta.playoff_seed),
        // The stored record string covers all 16 weeks and bakes in playoff
        // AND consolation results. Truncate to the regular season. Spec §6.4.1.
        streak: (streaks[roster.roster_id] || "").slice(0, regularWeeks),
      };
    })
    .sort((a, b) => a.finalRank - b.finalRank);
}

function normalizeWeeks(season) {
  const players = season.players || {};
  const playoffStart = Number(season.league.settings.playoff_week_start);
  const weekNumbers = Object.keys(season.matchups_by_week)
    .map(Number)
    .sort((a, b) => a - b);

  return weekNumbers.map((week) => {
    const entries = season.matchups_by_week[String(week)];
    const byRoster = {};
    entries.forEach((e) => {
      byRoster[e.roster_id] = e;
    });

    const games = [];
    const consumed = new Set();

    entries.forEach((entry) => {
      if (consumed.has(entry.roster_id)) return;
      const meta = entry.metadata || {};
      const tier = meta.playoff_tier_type || "REGULAR";
      const oppRaw = meta.opponent_roster_id;

      // A bye: a title-path entry with no opponent. Not a game, not a loss.
      if (oppRaw === null || oppRaw === undefined) {
        consumed.add(entry.roster_id);
        games.push({
          tier,
          isTitlePath: tier === TITLE_TIER,
          isConsolation: tier.indexOf("CONSOLATION") !== -1,
          isBye: true,
          home: entry.roster_id,
          away: null,
          homePoints: entry.points,
          awayPoints: null,
          winnerRosterId: null,
          homeStarters: starterList(players, entry),
          awayStarters: [],
        });
        return;
      }

      const oppId = Number(oppRaw);
      const opp = byRoster[oppId];
      consumed.add(entry.roster_id);
      consumed.add(oppId);

      const homeIsHome = meta.home_away === "home";
      const home = homeIsHome ? entry : opp;
      const away = homeIsHome ? opp : entry;
      const homeWon = (home.metadata || {}).won_matchup === "true";

      games.push({
        tier,
        isTitlePath: tier === TITLE_TIER,
        isConsolation: tier.indexOf("CONSOLATION") !== -1,
        isBye: false,
        home: home.roster_id,
        away: away.roster_id,
        homePoints: home.points,
        awayPoints: away.points,
        winnerRosterId: homeWon ? home.roster_id : away.roster_id,
        homeStarters: starterList(players, home),
        awayStarters: starterList(players, away),
      });
    });

    return { week, isPlayoffWeek: week >= playoffStart, games };
  });
}

function normalizeDraft(season) {
  const players = season.players || {};
  const draft = (season.drafts || [])[0];
  const picks = (season.draft_picks || [])
    .slice()
    .sort((a, b) => a.pick_no - b.pick_no);
  const teams = draft ? draft.settings.teams : 0;
  const rounds = draft ? draft.settings.rounds : 0;

  // The export's draft_slot is 1..N in pick order for EVERY round, so it is
  // not a board column. Derive the column from round 1 instead: whoever picked
  // Nth in round 1 owns column N for the whole draft. This holds regardless of
  // snake direction, which is what makes it safe.
  const columnOf = {};
  picks
    .filter((pick) => pick.round === 1)
    .forEach((pick, index) => {
      columnOf[pick.roster_id] = index + 1;
    });

  return {
    rounds,
    teams,
    picks: picks.map((pick) => ({
      pickNo: pick.pick_no,
      round: pick.round,
      column: columnOf[pick.roster_id],
      rosterId: pick.roster_id,
      playerId: pick.player_id,
      name: playerLabel(players, pick.player_id),
      position: (players[pick.player_id] || {}).position || "",
    })),
  };
}

function normalizeSeason(raw, year) {
  const season = raw.seasons[String(year)];
  if (!season) {
    throw new Error(`export has no season ${year}`);
  }

  const usersById = {};
  (season.users || []).forEach((u) => {
    usersById[u.user_id] = u;
  });

  const league = season.league;

  return {
    year: String(year),
    leagueName: league.name,
    providerLeagueId: (league.metadata || {}).espn_league_id || "",
    settings: {
      teams: league.settings.num_teams,
      playoffTeams: league.settings.playoff_teams,
      playoffWeekStart: league.settings.playoff_week_start,
      rosterPositions: league.roster_positions || [],
      scoring: league.scoring_settings || {},
    },
    teams: normalizeTeams(season, usersById),
    weeks: normalizeWeeks(season),
    draft: normalizeDraft(season),
  };
}

const SEASON_CACHE = {};

// Fetches one year's export and memoizes it. 2018.json gzips to ~50KB, so a
// year costs about one photo over the wire. Spec §5.2.
function loadSeason(year) {
  if (!SEASON_CACHE[year]) {
    SEASON_CACHE[year] = fetch(`assets/data/${year}.json`)
      .then((resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      })
      .then((raw) => normalizeSeason(raw, year))
      .catch((err) => {
        delete SEASON_CACHE[year];
        throw err;
      });
  }
  return SEASON_CACHE[year];
}

// Node: require()-able for the tests. Browser: a top-level `const` in a
// classic script is script-scoped and does NOT become a window property, so
// the namespace has to be attached explicitly.
const SeasonData = { normalizeSeason, loadSeason, TITLE_TIER };

if (typeof module !== "undefined" && module.exports) {
  module.exports = SeasonData;
} else if (typeof window !== "undefined") {
  window.SeasonData = SeasonData;
}
