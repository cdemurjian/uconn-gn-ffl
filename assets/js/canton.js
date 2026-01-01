// ============================
// JSON DATA SOURCE
// ============================

const teamData = [
  {
    year: 2018,
    manager: "Charlie",
    roster: {
      QB: ["Andrew Luck", "Aaron Rodgers"],
      RB: ["Alvin Kamara", "Tevin Coleman"],
      WR: ["Davante Adams", "Juju Smith-Schuster", "Stefon Diggs"],
      TE: ["George Kittle"],
      FLEX: ["Jamaal Williams"],
      K: ["Aldrick Rosas"],
      DST: ["Rams"],
      BN: [
        "Lamar Jackson",
        "James White",
        "Damien Williams",
        "DaeSean Hamilton",
        "James Develin",
      ],
    },
  },
  {
    year: 2019,
    manager: "Stove",
    roster: {
      QB: ["Patrick Mahomes"],
      RB: ["Leonard Fournette", "Saquon Barkley"],
      WR: ["Michael Thomas", "Julio Jones"],
      TE: ["Travis Kelce"],
      FLEX: ["Sammy Watkins"],
      K: [],
      DST: [],
      BN: [],
    },
  },
  {
    year: 2020,
    manager: "Matt",
    roster: {
      QB: ["Patrick Mahomes", "Jalen Hurts"],
      RB: ["Jonathan Taylor", "LeVeon Bell"],
      WR: ["Allen Robinson", "Robert Woods", "Brandon Aiyuk"],
      TE: ["Travis Kelce"],
      FLEX: ["Jeff Wilson"],
      K: ["Rodrigo Blankenship"],
      DST: ["Colts"],
      BN: [
        "Phillip Rivers",
        "Joe Burrow",
        "Nyheim Hines",
        "Antonio Gibson",
        "Darrell Henderson",
        "Darnell Mooney",
      ],
    },
  },
  {
    year: 2021,
    manager: "Devin",
    roster: {
      QB: ["Tom Brady", "Justin Herbert"],
      RB: ["Alvin Kamara", "Sony Michel"],
      WR: ["Jamar Chase", "Antonio Brown", "Keenan Allen"],
      TE: ["Foster Moreau"],
      FLEX: ["Elijah Mitchell"],
      K: ["Nick Folk"],
      DST: ["Colts"],
      BN: [
        "Mac Jones",
        "Trey Lance",
        "Jeff Wilson",
        "Damien Williams",
        "Mike Williams",
        "Mark Ingram",
      ],
    },
  },
  {
    year: 2022,
    manager: "Jay",
    roster: {
      QB: ["Patrick Mahomes", "Gardner Minshew"],
      RB: ["Brian Robinson", "Cordarrele Patterson"],
      WR: ["Isaiah Hodgins", "DeVonta Smith", "George Pickens"],
      TE: ["George Kittle"],
      FLEX: ["D.J. Moore"],
      K: ["Graham Gano"],
      DST: ["Giants"],
      BN: [
        "Jalen Hurts",
        "Kareem Hunt",
        "Chris Olave",
        "Romeo Doubs",
        "Darius Slayton",
        "Zonovan Knight",
      ],
    },
  },
  {
    year: 2023,
    manager: "Tyler",
    roster: {
      QB: ["Justin Fields", "C.J. Stroud"],
      RB: ["Jonathan Taylor", "Devon Achane"],
      WR: ["Nico Collins", "Chris Godwin", "Jamar Chase"],
      TE: ["David Njoku"],
      FLEX: ["Zamir White"],
      K: ["Justin Tucker"],
      DST: ["Bears"],
      BN: [
        "Sam Howell",
        "Tyrod Taylor",
        "Raheem Mostert",
        "Josh Jacobs",
        "DK Metcalf",
      ],
    },
  },
  {
    year: 2024,
    manager: "Nick",
    roster: {
      QB: ["Baker Mayfield", "Sam Darnold"],
      RB: ["Bijan Robinson", "Joe Mixon"],
      WR: ["Jamar Chase", "Mike Evans", "Keenan Allen"],
      TE: ["Travis Kelce"],
      FLEX: ["Jordan Addison"],
      K: ["Brandon McManus"],
      DST: ["Bills"],
      BN: [
        "Justin Herbert",
        "Isaac Guerendo",
        "Tony Pollard",
        "Alexander Mattison",
        "Tyler Allgeier",
        "Jerome Ford",
      ],
    },
  },
  {
    year: 2025,
    manager: "Charlie",
    roster: {
      QB: ["Drake Maye", "Malik Willis"],
      RB: ["Chase Brown", "RJ Harvey"],
      WR: ["Jamar Chase", "Justin Jefferson", "Alec Pierce"],
      TE: ["Kyle Pitts"],
      FLEX: ["Kenneth Walker"],
      K: ["Ka'imi Fairbairn"],
      DST: ["Jaguars"],
      BN: [
        "Patrick Mahomes",
        "Rashee Rice",
        "Tucker Kraft",
        "Quinshon Judkins",
        "Kirk Cousins",
        "Kenyan Drake",
      ],
    },
  },
];

// Awards by year (fill these in as needed)
const AWARDS_DATA = [
  { year: 2018, mvp: "Andrew Luck", mvpPoints: "327.6", sbMvp: "Aaron Rodgers", sbNotes: "42.9" },
  { year: 2019, mvp: "Michael Thomas", mvpPoints: "300.1", sbMvp: "Saquon Barkley", sbNotes: "41.9" },
  { year: 2020, mvp: "Travis Kelce", mvpPoints: "260.26", sbMvp: "Jeff Wilson ", sbNotes: "26.9" },
  { year: 2021, mvp: "Jamar Chase", mvpPoints: "264.1", sbMvp: "Jamar Chase", sbNotes: "50.1" },
  { year: 2022, mvp: "Patrick Mahomes", mvpPoints: "416.9", sbMvp: "Patrick Mahomes", sbNotes: "25.02" },
  { year: 2023, mvp: "Justin Fields", mvpPoints: "230.18", sbMvp: "Justin Fields", sbNotes: "25.22" },
  { year: 2024, mvp: "Jamar Chase", mvpPoints: "339.5", sbMvp: "Baker Mayfield", sbNotes: "34.56" },
  { year: 2025, mvp: "Drake Maye", mvpPoints: "335.72", sbMvp: "Malik Willis", sbNotes: "31.52" },
];

// Columns for team view
const teamColumns = [
  "Year",
  "Team",
  "QB1",
  "QB2",
  "RB1",
  "RB2",
  "WR1",
  "WR2",
  "WR3",
  "TE",
  "FLEX",
  "K",
  "D/ST",
  "BN1",
  "BN2",
  "BN3",
  "BN4",
  "BN5",
  "BN6",
];

const START_POS_KEYS = ["QB", "RB", "WR", "TE", "FLEX", "K", "DST"];

// Bench position inference (every BN player covered)
function inferBenchPosition(name) {
  const map = {
    "Lamar Jackson": "QB",
    "James White": "RB",
    "Damien Williams": "RB",
    "DaeSean Hamilton": "WR",
    "James Develin": "RB",

    "Phillip Rivers": "QB",
    "Joe Burrow": "QB",
    "Nyheim Hines": "RB",
    "Antonio Gibson": "RB",
    "Darrell Henderson": "RB",
    "Darnell Mooney": "WR",

    "Mac Jones": "QB",
    "Trey Lance": "QB",
    "Jeff Wilson": "RB",
    "Mike Williams": "WR",
    "Mark Ingram": "RB",

    "Jalen Hurts": "QB",
    "Kareem Hunt": "RB",
    "Chris Olave": "WR",
    "Romeo Doubs": "WR",
    "Darius Slayton": "WR",
    "Zonovan Knight": "RB",

    "Sam Howell": "QB",
    "Tyrod Taylor": "QB",
    "Raheem Mostert": "RB",
    "Josh Jacobs": "RB",
    "DK Metcalf": "WR",

    "Justin Herbert": "QB",
    "Isaac Guerendo": "RB",
    "Tony Pollard": "RB",
    "Alexander Mattison": "RB",
    "Tyler Allgeier": "RB",
    "Jerome Ford": "RB",

    "Patrick Mahomes": "QB",
    "Rashee Rice": "WR",
    "Tucker Kraft": "TE",
    "Quinshon Judkins": "RB",
    "Kirk Cousins": "QB",
    "Kenyan Drake": "RB",
  };

  return map[name] || "BN";
}

function safeGet(arr, idx) {
  return arr && arr[idx] ? arr[idx] : "";
}

// ============================
// TEAM VIEW
// ============================

function buildTeamTable() {
  const table = document.getElementById("team-table");
  if (!table) return;

  table.innerHTML = "";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  teamColumns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  teamData.forEach((team) => {
    const r = team.roster;
    const row = document.createElement("tr");

    const cells = [
      team.year,
      team.manager,
      safeGet(r.QB, 0),
      safeGet(r.QB, 1),
      safeGet(r.RB, 0),
      safeGet(r.RB, 1),
      safeGet(r.WR, 0),
      safeGet(r.WR, 1),
      safeGet(r.WR, 2),
      safeGet(r.TE, 0),
      safeGet(r.FLEX, 0),
      safeGet(r.K, 0),
      safeGet(r.DST, 0),
      safeGet(r.BN, 0),
      safeGet(r.BN, 1),
      safeGet(r.BN, 2),
      safeGet(r.BN, 3),
      safeGet(r.BN, 4),
      safeGet(r.BN, 5),
    ];

    cells.forEach((val) => {
      const td = document.createElement("td");
      td.textContent = val;
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
}

// ============================
// AWARDS VIEW
// ============================

function buildAwardsTable() {
  const table = document.getElementById("awards-table");
  if (!table) return;

  table.innerHTML = "";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Year", "MVP 🏆", "MVP Points", "SB MVP 🏅", "Championship Performance"].forEach(
    (col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const sorted = AWARDS_DATA.slice().sort((a, b) => a.year - b.year);
  sorted.forEach((entry) => {
    const row = document.createElement("tr");

    const year = document.createElement("td");
    year.textContent = entry.year;

    const mvp = document.createElement("td");
    mvp.textContent = entry.mvp || "—";
    const mvpPts = document.createElement("td");
    mvpPts.textContent = entry.mvpPoints || "—";
    const sbMvp = document.createElement("td");
    sbMvp.textContent = entry.sbMvp || "—";
    const sbNotes = document.createElement("td");
    sbNotes.textContent = entry.sbNotes || "—";

    row.appendChild(year);
    row.appendChild(mvp);
    row.appendChild(mvpPts);
    row.appendChild(sbMvp);
    row.appendChild(sbNotes);
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
}

// ============================
// AGGREGATED DATA (Positional + Player)
// ============================

let POSITION_DATA = new Map(); // posKey -> Map(name -> { name, entries:[{year, role}] })
let PLAYER_DATA = []; // array of { name, positions:[...], years:[...], titles, awards }
let AWARD_LOOKUP = new Map(); // name -> { name, mvp:Set, sbMvp:Set }

function buildAggregatedData() {
  POSITION_DATA = new Map();
  const playerMap = new Map(); // name -> { name, positions:Set, years:Set }

  function ensurePosEntry(posKey, name) {
    if (!POSITION_DATA.has(posKey)) {
      POSITION_DATA.set(posKey, new Map());
    }
    const posMap = POSITION_DATA.get(posKey);
    if (!posMap.has(name)) {
      posMap.set(name, { name, entries: [] });
    }
    return posMap.get(name);
  }

  function ensurePlayerEntry(name) {
    if (!playerMap.has(name)) {
      playerMap.set(name, {
        name,
        positions: new Set(),
        years: new Set(),
        awards: { mvp: new Set(), sbMvp: new Set() },
      });
    }
    return playerMap.get(name);
  }

  teamData.forEach((team) => {
    const { year, roster } = team;

    // Starters by explicit position
    START_POS_KEYS.forEach((posKey) => {
      (roster[posKey] || []).forEach((name) => {
        if (!name) return;
        const posEntry = ensurePosEntry(posKey, name);
        posEntry.entries.push({ year, role: "starter" });

        const player = ensurePlayerEntry(name);
        player.years.add(year);
        player.positions.add(posKey);
      });
    });

    // Bench: infer position, mark role = "bench"
    (roster.BN || []).forEach((name) => {
      if (!name) return;
      const inferred = inferBenchPosition(name);
      const posKey = inferred === "D/ST" ? "DST" : inferred; // just in case

      const posEntry = ensurePosEntry(posKey, name);
      posEntry.entries.push({ year, role: "bench" });

      const player = ensurePlayerEntry(name);
      player.years.add(year);
      player.positions.add(posKey);
    });
  });

  // Awards lookup for later use
  AWARD_LOOKUP = buildAwardLookup();

  // Attach awards to player map (ensure award winners exist in player map)
  AWARD_LOOKUP.forEach((awardEntry, name) => {
    const player = ensurePlayerEntry(name);
    awardEntry.mvp.forEach((year) => player.awards.mvp.add(year));
    awardEntry.sbMvp.forEach((year) => player.awards.sbMvp.add(year));
  });

  // Build PLAYER_DATA array
  PLAYER_DATA = Array.from(playerMap.values()).map((p) => {
    const years = Array.from(p.years).sort();
    const positions = Array.from(p.positions);
    const mvpYears = Array.from(p.awards.mvp).sort();
    const sbMvpYears = Array.from(p.awards.sbMvp).sort();
    return {
      name: p.name,
      positions,
      years,
      titles: years.length,
      awards: {
        mvpYears,
        sbMvpYears,
      },
    };
  });

  // Sort default player rows:
  // 1) titles desc
  // 2) earliest year asc
  // 3) name
  PLAYER_DATA.sort((a, b) => {
    if (b.titles !== a.titles) return b.titles - a.titles;
    const aFirst = a.years[0] ?? 9999;
    const bFirst = b.years[0] ?? 9999;
    if (aFirst !== bFirst) return aFirst - bFirst;
    return a.name.localeCompare(b.name);
  });
}

function buildAwardLookup() {
  const map = new Map();

  function addAward(name, key, year) {
    if (!name) return;
    if (!map.has(name)) {
      map.set(name, { name, mvp: new Set(), sbMvp: new Set() });
    }
    map.get(name)[key].add(year);
  }

  AWARDS_DATA.forEach((entry) => {
    addAward(entry.mvp, "mvp", entry.year);
    addAward(entry.sbMvp, "sbMvp", entry.year);
  });

  return map;
}

function formatAwardsLabel(awards) {
  if (!awards) return "";
  const mvpYears = normalizeAwardsYears(awards.mvpYears || awards.mvp);
  const sbMvpYears = normalizeAwardsYears(awards.sbMvpYears || awards.sbMvp);
  const parts = [];
  if (mvpYears.length) {
    parts.push(`MVP ${mvpYears.join(", ")}`);
  }
  if (sbMvpYears.length) {
    parts.push(`SB MVP ${sbMvpYears.join(", ")}`);
  }
  return parts.join("; ");
}

function formatAwardsSummary(awards, playerName) {
  if (!awards) return "";
  const mvpYears = normalizeAwardsYears(awards.mvpYears || awards.mvp);
  const sbMvpYears = normalizeAwardsYears(awards.sbMvpYears || awards.sbMvp);
  const parts = [];
  if (mvpYears.length) {
    const label = mvpYears.map((y) => `🏆 ${y}${playerName ? " " + playerName : ""}`).join("; ");
    parts.push(label);
  }
  if (sbMvpYears.length) {
    const label = sbMvpYears.map((y) => `🏅 ${y}${playerName ? " " + playerName : ""}`).join("; ");
    parts.push(label);
  }
  return parts.join(" | ");
}

function buildAwardIcons(awards) {
  if (!awards) return "";
  const mvpYears = normalizeAwardsYears(awards.mvpYears || awards.mvp);
  const sbMvpYears = normalizeAwardsYears(awards.sbMvpYears || awards.sbMvp);
  const trophy = mvpYears.length ? "🏆".repeat(mvpYears.length) : "";
  const ring = sbMvpYears.length ? "🏅".repeat(sbMvpYears.length) : "";
  return `${trophy}${ring}`.trim();
}

function normalizeAwardsYears(values) {
  if (!values) return [];
  if (Array.isArray(values)) return values;
  if (values instanceof Set) return Array.from(values);
  return [];
}

// Helper for D/ST labeling
function formatPositionLabel(posKey) {
  return posKey === "DST" ? "D/ST" : posKey;
}

// ============================
// TOOLTIP HELPER
// ============================

function applyTooltip(el, text) {
  if (!text) return;
  el.dataset.tooltip = text;
  el.classList.add("has-tooltip");
}

// ============================
// POSITIONAL VIEW
// ============================

function buildPositionalTable() {
  const table = document.getElementById("positional-table");
  if (!table) return;
  table.innerHTML = "";

  const positions = ["QB", "RB", "WR", "TE", "FLEX", "DST", "K"];

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Pos", "Players"].forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  positions.forEach((posKey) => {
    const row = document.createElement("tr");
    const tdPos = document.createElement("td");
    const tdPlayers = document.createElement("td");

    tdPos.textContent = formatPositionLabel(posKey);

    const posMap = POSITION_DATA.get(posKey);
    if (posMap && posMap.size > 0) {
      // Build array with sorted entries & years
      const players = Array.from(posMap.values()).map((entry) => {
        const sortedEntries = entry.entries
          .slice()
          .sort((a, b) => a.year - b.year);
        const years = sortedEntries.map((e) => e.year);
        return {
          ...entry,
          sortedEntries,
          years,
        };
      });

      // Sort by earliest year, then name
      players.sort((a, b) => {
        const aFirst = a.years[0] ?? 9999;
        const bFirst = b.years[0] ?? 9999;
        if (aFirst !== bFirst) return aFirst - bFirst;
        return a.name.localeCompare(b.name);
      });

      players.forEach((entry, idx) => {
        const span = document.createElement("span");
        span.classList.add("pos-player");
        const awards = AWARD_LOOKUP.get(entry.name);
        const icons = buildAwardIcons(awards);
        span.textContent = icons ? `${entry.name} ${icons}` : entry.name;

        if (entry.sortedEntries.length > 1) {
          span.classList.add("multi-year");
        }

        // Tooltip contents: "2018 (starter), 2020 (bench)" + awards if present
        const tooltipParts = entry.sortedEntries
          .map((e) => `${e.year} (${e.role})`)
          .join(", ");
        const awardsLabel = formatAwardsLabel(awards);
        const tooltipSections = [];
        if (tooltipParts) tooltipSections.push(tooltipParts);
        if (awardsLabel) tooltipSections.push(`Awards: ${awardsLabel}`);
        applyTooltip(span, tooltipSections.join(" | "));

        tdPlayers.appendChild(span);
        if (idx < players.length - 1) {
          tdPlayers.appendChild(document.createTextNode(", "));
        }
      });
    } else {
      tdPlayers.textContent = "—";
    }

    row.appendChild(tdPos);
    row.appendChild(tdPlayers);
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
}

// ============================
// PLAYER VIEW
// ============================

let CURRENT_POSITION_FILTER = "ALL";
let CANTON_SEARCH_TERM = "";

function renderPlayerTable() {
  const table = document.getElementById("player-table");
  if (!table) return;

  table.innerHTML = "";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Player", "Positions", "Titles", "Years", "Awards"].forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  let rows = PLAYER_DATA;
  if (CURRENT_POSITION_FILTER !== "ALL") {
    rows = rows.filter((r) => r.positions.includes(CURRENT_POSITION_FILTER));
  }

  // Already pre-sorted in buildAggregatedData by titles -> earliest year -> name
  rows.forEach((entry) => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    const icons = buildAwardIcons(entry.awards);
    tdName.textContent = icons ? `${entry.name} ${icons}` : entry.name;
    const awardsTooltip = formatAwardsLabel(entry.awards);
    if (awardsTooltip) {
      applyTooltip(tdName, awardsTooltip);
    }

    const tdPos = document.createElement("td");
    tdPos.textContent = entry.positions
      .map((p) => formatPositionLabel(p))
      .join(", ");

    const tdTitles = document.createElement("td");
    tdTitles.textContent = entry.titles;

    const tdYears = document.createElement("td");
    tdYears.textContent = entry.years.join(", ");

    const tdAwards = document.createElement("td");
    const awardSummary = formatAwardsSummary(entry.awards, entry.name);
    tdAwards.textContent = awardSummary || "—";

    tr.appendChild(tdName);
    tr.appendChild(tdPos);
    tr.appendChild(tdTitles);
    tr.appendChild(tdYears);
    tr.appendChild(tdAwards);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  applyCantonSearch();
}

// ============================
// SEARCH
// ============================

function applyCantonSearch() {
  const activeButton = document.querySelector(".view-button.active");
  const activeView = activeButton ? activeButton.dataset.view : "team";
  const countLabel = document.getElementById("canton-count-label");
  const term = CANTON_SEARCH_TERM;
  let activeCount = 0;

  ["team-table", "awards-table", "positional-table", "player-table"].forEach(
    (id) => {
      const table = document.getElementById(id);
      if (!table) return;
      const rows = Array.from(table.querySelectorAll("tbody tr"));
      let visible = 0;
      rows.forEach((row) => {
        const match =
          !term || row.textContent.toLowerCase().includes(term.toLowerCase());
        row.style.display = match ? "" : "none";
        if (match) visible += 1;
      });

      const view = table.closest(".view-container");
      const viewName =
        view && view.id && view.id.endsWith("-view")
          ? view.id.replace("-view", "")
          : null;
      if (viewName === activeView) {
        activeCount = visible;
      }
    }
  );

  if (countLabel) {
    countLabel.textContent = activeCount.toString();
  }
}

function setupCantonSearch() {
  const input = document.getElementById("canton-search-input");
  if (!input) return;

  const handleSearch = () => {
    CANTON_SEARCH_TERM = input.value.trim().toLowerCase();
    applyCantonSearch();
  };

  input.addEventListener("input", handleSearch);
  handleSearch();
}

// ============================
// VIEW TOGGLING
// ============================

function showView(view) {
  const views = ["team", "awards", "positional", "player"];
  views.forEach((v) => {
    const el = document.getElementById(`${v}-view`);
    if (el) el.style.display = v === view ? "block" : "none";
  });

  const buttons = document.querySelectorAll(".view-button");
  buttons.forEach((btn) => {
    if (btn.dataset.view === view) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  applyCantonSearch();
}

// ============================
// INIT
// ============================

function initCanton() {
  buildTeamTable();
  buildAwardsTable();
  buildAggregatedData();
  buildPositionalTable();
  renderPlayerTable();
  setupCantonSearch();

  // Wire up buttons
  const buttons = document.querySelectorAll(".view-button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      showView(view);
    });
  });

  // Player filter dropdown
  const positionFilter = document.getElementById("position-filter");
  if (positionFilter) {
    positionFilter.addEventListener("change", () => {
      CURRENT_POSITION_FILTER = positionFilter.value;
      renderPlayerTable();
    });
  }

  // Default view
  showView("team");
}

document.addEventListener("DOMContentLoaded", initCanton);
