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

function safeGet(arr, idx) {
  return arr && arr[idx] ? arr[idx] : "";
}

// ============ TEAM VIEW ============

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

// ============ POSITIONAL VIEW ============

function buildPositionSummary(positionKey) {
  const playerMap = new Map(); // name -> Set(years)

  teamData.forEach((team) => {
    const names = team.roster[positionKey] || [];
    names.forEach((name) => {
      if (!name) return;
      if (!playerMap.has(name)) {
        playerMap.set(name, new Set());
      }
      playerMap.get(name).add(team.year);
    });
  });

  const entries = [];
  playerMap.forEach((yearsSet, name) => {
    const years = Array.from(yearsSet).sort();
    entries.push(`${name} (${years.join(", ")})`);
  });

  return entries.join(", ");
}

function buildPositionalTable() {
  const table = document.getElementById("positional-table");
  if (!table) return;
  table.innerHTML = "";

  const positions = [
    { label: "QB", key: "QB" },
    { label: "RB", key: "RB" },
    { label: "WR", key: "WR" },
    { label: "TE", key: "TE" },
    { label: "FLEX", key: "FLEX" },
    { label: "D/ST", key: "DST" },
    { label: "K", key: "K" },
    { label: "BN", key: "BN" },
  ];

  const tbody = document.createElement("tbody");

  positions.forEach((pos) => {
    const tr = document.createElement("tr");
    const tdPos = document.createElement("td");
    const tdPlayers = document.createElement("td");

    tdPos.textContent = pos.label;
    tdPlayers.textContent = buildPositionSummary(pos.key);

    tr.appendChild(tdPos);
    tr.appendChild(tdPlayers);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
}

// ============ PLAYER VIEW ============

function getAllPlayersMap() {
  const playerMap = new Map();

  teamData.forEach((team) => {
    const r = team.roster;
    const allLists = [r.QB, r.RB, r.WR, r.TE, r.FLEX, r.K, r.DST, r.BN];

    allLists.forEach((list) => {
      (list || []).forEach((name) => {
        if (!name) return;
        if (!playerMap.has(name)) {
          playerMap.set(name, new Set());
        }
        playerMap.get(name).add(team.year);
      });
    });
  });

  return playerMap;
}

function buildPlayerTable() {
  const table = document.getElementById("player-table");
  if (!table) return;

  table.innerHTML = "";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Player", "Titles", "Years"].forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const playerMap = getAllPlayersMap();
  const rows = [];

  playerMap.forEach((yearsSet, name) => {
    const years = Array.from(yearsSet).sort();
    rows.push({
      name,
      count: years.length,
      years,
    });
  });

  rows.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.name.localeCompare(b.name);
  });

  rows.forEach((entry) => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = entry.name;

    const tdCount = document.createElement("td");
    tdCount.textContent = entry.count;

    const tdYears = document.createElement("td");
    tdYears.textContent = entry.years.join(", ");

    tr.appendChild(tdName);
    tr.appendChild(tdCount);
    tr.appendChild(tdYears);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
}

// ============ VIEW TOGGLING ============

function showView(view) {
  const views = ["team", "positional", "player"];
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
}

function initCanton() {
  buildTeamTable();
  buildPositionalTable();
  buildPlayerTable();

  // Wire up buttons
  const buttons = document.querySelectorAll(".view-button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      showView(view);
    });
  });

  // Default view
  showView("team");
}

document.addEventListener("DOMContentLoaded", initCanton);
