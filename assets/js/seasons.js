// Renders the season view model produced by season-data.js.
// See docs/superpowers/specs/2026-08-17-logo-theme-seasons-stats-design.md §5.

const VIEWS = ["standings", "matchups", "draft", "settings"];

const TIER_LABEL = {
  WINNERS_BRACKET: "Playoffs",
  WINNERS_CONSOLATION_LADDER: "Consolation",
  LOSERS_CONSOLATION_LADDER: "Toilet bowl",
};

let CURRENT_YEAR = "2018";
let CURRENT_VIEW = "standings";
let CURRENT_SEASON = null;

// ============================
// DOM HELPERS
// ============================

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function buildTable(container, headers, rows) {
  container.innerHTML = "";
  const wrap = el("div", "table-container");
  const table = el("table", "dataframe");

  const thead = el("thead");
  const headRow = el("tr");
  headers.forEach((h) => headRow.appendChild(el("th", null, h)));
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el("tbody");
  rows.forEach((cells) => {
    const tr = el("tr");
    cells.forEach((cell) => {
      if (cell && cell.nodeType === 1) {
        const td = el("td");
        td.appendChild(cell);
        tr.appendChild(td);
      } else {
        tr.appendChild(el("td", null, cell));
      }
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  wrap.appendChild(table);
  container.appendChild(wrap);
}

function teamLookup(season) {
  const byId = {};
  season.teams.forEach((t) => {
    byId[t.rosterId] = t;
  });
  return byId;
}

// ============================
// STANDINGS
// ============================

function renderStandings(season) {
  const container = document.getElementById("standings-view");
  const rows = season.teams.map((t) => {
    let nameCell = t.teamName;
    if (t.finalRank === 1) {
      // Champion links back to Canton. Spec §5.7.
      const link = el("a", "champ-link");
      link.href = "canton.html";
      link.textContent = `🏆 ${t.teamName}`;
      nameCell = link;
    }
    return [
      t.finalRank,
      nameCell,
      t.manager,
      `${t.wins}-${t.losses}`,
      t.pointsFor.toFixed(2),
      t.pointsAgainst.toFixed(2),
      t.streak,
    ];
  });
  buildTable(
    container,
    ["Rank", "Team", "Manager", "Record", "PF", "PA", "Streak"],
    rows
  );
  container.appendChild(
    el(
      "div",
      "view-legend",
      "Record and streak are regular season only (weeks 1–13)."
    )
  );
}

// ============================
// MATCHUPS
// ============================

function renderMatchups(season) {
  const container = document.getElementById("matchups-view");
  const teams = teamLookup(season);
  container.innerHTML = "";

  season.weeks.forEach((wk) => {
    const block = el("div", "week-block");
    const heading = el("div", "week-heading");
    heading.appendChild(el("span", "week-number", `Week ${wk.week}`));
    if (wk.isPlayoffWeek) {
      heading.appendChild(el("span", "badge", "Postseason"));
    }
    block.appendChild(heading);

    wk.games.forEach((game) => {
      const card = el("div", "game-card");
      if (game.isConsolation) card.classList.add("is-consolation");

      if (wk.isPlayoffWeek) {
        // Consolation games are labelled so they are never mistaken for a
        // semifinal. They count toward nothing. Spec §6.4.1.
        card.appendChild(
          el("span", "game-tier", TIER_LABEL[game.tier] || game.tier)
        );
      }

      if (game.isBye) {
        const home = teams[game.home];
        const row = el("div", "game-row is-bye");
        row.appendChild(
          el("span", "game-team", home ? home.teamName : game.home)
        );
        row.appendChild(el("span", "game-points", "BYE"));
        card.appendChild(row);
        block.appendChild(card);
        return;
      }

      [
        [game.home, game.homePoints],
        [game.away, game.awayPoints],
      ].forEach(([rosterId, points]) => {
        const team = teams[rosterId];
        const row = el("div", "game-row");
        if (game.winnerRosterId === rosterId) row.classList.add("is-winner");
        row.appendChild(
          el("span", "game-team", team ? team.teamName : rosterId)
        );
        row.appendChild(el("span", "game-points", points.toFixed(2)));
        card.appendChild(row);
      });

      block.appendChild(card);
    });

    container.appendChild(block);
  });
}

// ============================
// DRAFT
// ============================

function renderDraft(season) {
  const container = document.getElementById("draft-view");
  const d = season.draft;
  const teams = teamLookup(season);

  const byCell = {};
  d.picks.forEach((p) => {
    byCell[`${p.round}:${p.column}`] = p;
  });

  // Column headers are the team that picked Nth in round 1.
  const columnOwner = {};
  d.picks
    .filter((p) => p.round === 1)
    .forEach((p) => {
      const t = teams[p.rosterId];
      columnOwner[p.column] = t ? t.teamName : `Column ${p.column}`;
    });

  const headers = ["Rd"];
  for (let s = 1; s <= d.teams; s += 1) {
    headers.push(columnOwner[s] || `Column ${s}`);
  }

  const rows = [];
  for (let r = 1; r <= d.rounds; r += 1) {
    const cells = [r];
    for (let s = 1; s <= d.teams; s += 1) {
      const pick = byCell[`${r}:${s}`];
      if (!pick) {
        cells.push("");
        continue;
      }
      const cell = el("span", "draft-pick");
      cell.appendChild(el("span", "draft-name", pick.name));
      cell.appendChild(el("span", "draft-pos", pick.position));
      cells.push(cell);
    }
    rows.push(cells);
  }

  buildTable(container, headers, rows);
  container.appendChild(
    el(
      "div",
      "view-legend",
      `${d.rounds} rounds · ${d.picks.length} picks · snake order`
    )
  );
}

// ============================
// SETTINGS
// ============================

function renderSettings(season) {
  const container = document.getElementById("settings-view");
  const s = season.settings;

  const slots = {};
  s.rosterPositions.forEach((p) => {
    slots[p] = (slots[p] || 0) + 1;
  });
  const slotText = Object.keys(slots)
    .map((k) => (slots[k] > 1 ? `${slots[k]}×${k}` : k))
    .join(", ");

  const scoringRows = Object.keys(s.scoring)
    .sort()
    .map((k) => [k, s.scoring[k]]);

  container.innerHTML = "";

  const summary = el("div", "settings-summary");
  [
    ["League", season.leagueName],
    ["Teams", s.teams],
    ["Playoff teams", s.playoffTeams],
    ["Playoffs start", `week ${s.playoffWeekStart}`],
    ["Roster", slotText],
  ].forEach(([label, value]) => {
    const row = el("div", "settings-row");
    row.appendChild(el("span", "settings-label", label));
    row.appendChild(el("span", "settings-value", value));
    summary.appendChild(row);
  });
  container.appendChild(summary);

  const scoring = el("div");
  buildTable(scoring, ["Scoring rule", "Points"], scoringRows);
  container.appendChild(scoring);
}

// ============================
// SHELL
// ============================

function setStatus(message, isError) {
  const node = document.getElementById("season-status");
  if (!node) return;
  node.textContent = message || "";
  node.classList.toggle("is-error", Boolean(isError));
  node.style.display = message ? "block" : "none";
}

function setViewVisibility(view) {
  VIEWS.forEach((name) => {
    const node = document.getElementById(`${name}-view`);
    if (node) node.style.display = name === view ? "block" : "none";
  });
}

function markActive(selector, attr, value) {
  document.querySelectorAll(selector).forEach((btn) => {
    btn.classList.toggle("active", btn.dataset[attr] === value);
  });
}

function renderCurrentView() {
  if (!CURRENT_SEASON) return;
  setViewVisibility(CURRENT_VIEW);
  if (CURRENT_VIEW === "standings") renderStandings(CURRENT_SEASON);
  if (CURRENT_VIEW === "matchups") renderMatchups(CURRENT_SEASON);
  if (CURRENT_VIEW === "draft") renderDraft(CURRENT_SEASON);
  if (CURRENT_VIEW === "settings") renderSettings(CURRENT_SEASON);
}

function showYear(year) {
  CURRENT_YEAR = year;
  CURRENT_SEASON = null;
  markActive(".year-toggle-bar .view-button", "year", year);
  VIEWS.forEach((name) => {
    const node = document.getElementById(`${name}-view`);
    if (node) node.innerHTML = "";
  });
  setStatus(`Loading the ${year} season…`, false);

  SeasonData.loadSeason(year)
    .then((season) => {
      if (CURRENT_YEAR !== year) return; // a later click won
      CURRENT_SEASON = season;
      setStatus("", false);
      renderCurrentView();
    })
    .catch((err) => {
      if (CURRENT_YEAR !== year) return;
      // Never fail silently into an empty table. Spec §5.6.
      setStatus(`Couldn't load the ${year} season (${err.message}).`, true);
      setViewVisibility(null);
    });
}

function showView(view) {
  CURRENT_VIEW = view;
  markActive(".view-toggle-bar .view-button", "view", view);
  renderCurrentView();
}

function initSeasons() {
  document.querySelectorAll(".year-toggle-bar .view-button").forEach((btn) => {
    btn.addEventListener("click", () => showYear(btn.dataset.year));
  });
  document.querySelectorAll(".view-toggle-bar .view-button").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  const hash = (location.hash || "").replace("#", "");
  const startYear = hash === "2019" ? "2019" : "2018";
  setViewVisibility(CURRENT_VIEW);
  markActive(".view-toggle-bar .view-button", "view", CURRENT_VIEW);
  showYear(startYear);
}

document.addEventListener("DOMContentLoaded", initSeasons);
