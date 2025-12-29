const CSV_PATH = "assets/data/stats.csv";

/**
 * CSV parser:
 * - Handles quoted values
 * - Handles commas in quotes
 * - Handles escaped quotes ("")
 * - Skips leading empty rows and uses the first non-empty row as header
 */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        // Escaped quote ("")
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      row.push(cur);
      cur = "";
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      if (cur.length > 0 || row.length) {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      }
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else {
      cur += c;
    }
  }

  // Last cell/row if no trailing newline
  if (cur.length > 0 || row.length) {
    row.push(cur);
    rows.push(row);
  }

  if (!rows.length) return { headers: [], rows: [] };

  // 🔑 NEW: find first non-empty row as header (skip blank top rows)
  const headerIndex = rows.findIndex((r) =>
    r.some((v) => v.trim() !== "")
  );
  if (headerIndex === -1) return { headers: [], rows: [] };

  const headerRow = rows[headerIndex].map((h) => h.trim());
  const dataRows = rows
    .slice(headerIndex + 1)
    .filter((r) => r.some((v) => v.trim() !== ""))
    .map((r) => r.map((v) => v.trim()));

  return { headers: headerRow, rows: dataRows };
}


/**
 * Decide a CSS class per column based on header text.
 * This powers the colored column bands in styles.css.
 */
function getColumnClasses(headers) {
  return headers.map((raw) => {
    const h = (raw || "").trim().toLowerCase();

    if (h === "team") return "col-team";
    if (h === "record") return "col-record";
    if (h === "percentage" || h === "percent" || h.includes("%"))
      return "col-percent";

    if (h === "playoffs") return "col-playoffs";
    if (h === "ring" || h === "rings") return "col-ring";
    if (h === "playoff record") return "col-playoff-record";

    if (h.includes("espn") && h.includes("wins")) return "col-win-espn";
    if (h.includes("espn") && (h.includes("loss") || h.includes("losses")))
      return "col-loss-espn";

    if (h.includes("sleeper") && h.includes("wins")) return "col-win-sleeper";
    if (h.includes("sleeper") && (h.includes("loss") || h.includes("losses")))
      return "col-loss-sleeper";

    if (h === "total wins") return "col-total-wins";
    if (h === "total losses") return "col-total-losses";

    return "";
  });
}

let STATS_STATE = {
  headers: [],
  columnClasses: [],
  originalOrder: [], // index -> original position
};

function buildStatsTable(headers, rows) {
  const table = document.getElementById("stats-table");
  const headerRow = document.getElementById("stats-header-row");
  if (!table || !headerRow) return;

  const columnClasses = getColumnClasses(headers);
  STATS_STATE.headers = headers;
  STATS_STATE.columnClasses = columnClasses;

  headerRow.innerHTML = "";

  headers.forEach((h, idx) => {
    const th = document.createElement("th");
    th.textContent = h;
    th.dataset.colIndex = String(idx);
    th.classList.add("sortable");
    if (columnClasses[idx]) th.classList.add(columnClasses[idx]);
    headerRow.appendChild(th);
  });

  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  rows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    tr.dataset.originalIndex = String(rowIndex);

    row.forEach((value, idx) => {
      const td = document.createElement("td");
      td.textContent = value;
      td.setAttribute("data-label", headers[idx] || "");
      if (columnClasses[idx]) td.classList.add(columnClasses[idx]);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  // Save original order (by the current DOM order)
  STATS_STATE.originalOrder = Array.from(
    tbody.querySelectorAll("tr")
  ).map((tr) => Number(tr.dataset.originalIndex));
}

function setupStatsSearch() {
  const input = document.getElementById("stats-search-input");
  const table = document.getElementById("stats-table");
  const countLabel = document.getElementById("stats-count-label");
  if (!input || !table || !countLabel) return;

  const rows = Array.from(table.querySelectorAll("tbody tr"));

  function updateCount() {
    const visibleRows = rows.filter(
      (row) => row.style.display !== "none" && row.style.display !== "hidden"
    );
    countLabel.textContent = visibleRows.length.toString();
  }

  function handleSearch() {
    const term = input.value.trim().toLowerCase();
    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      const match = !term || text.includes(term);
      row.style.display = match ? "" : "none";
    });
    updateCount();
  }

  input.addEventListener("input", handleSearch);
  updateCount();
}

/* -------- Sorting -------- */

function getCellValue(row, colIndex) {
  const cell = row.children[colIndex];
  if (!cell) return "";
  return cell.textContent.trim();
}

function compareValues(a, b) {
  // Try numeric comparison first
  const numA = parseFloat(a.replace(/[^0-9.\-]/g, ""));
  const numB = parseFloat(b.replace(/[^0-9.\-]/g, ""));
  const isNumA = !isNaN(numA);
  const isNumB = !isNaN(numB);

  if (isNumA && isNumB) {
    if (numA < numB) return -1;
    if (numA > numB) return 1;
    return 0;
  }

  // Fallback to string
  return a.localeCompare(b);
}

function setupStatsSorting() {
  const table = document.getElementById("stats-table");
  if (!table) return;

  const headerRow = table.querySelector("thead tr");
  const tbody = table.querySelector("tbody");
  if (!headerRow || !tbody) return;

  let currentSort = {
    colIndex: null,
    direction: null, // "asc" | "desc" | null
  };

  function applySort(colIndex, direction) {
    const rows = Array.from(tbody.querySelectorAll("tr"));

    // Remove existing sort classes from headers
    headerRow.querySelectorAll("th").forEach((th) => {
      th.classList.remove("sort-asc", "sort-desc");
    });

    if (direction === null) {
      // Reset to original order
      rows.sort((a, b) => {
        const ai = Number(a.dataset.originalIndex);
        const bi = Number(b.dataset.originalIndex);
        return ai - bi;
      });
    } else {
      const multiplier = direction === "asc" ? 1 : -1;

      rows.sort((a, b) => {
        // keep hidden vs visible rows in place (search)
        const aHidden = a.style.display === "none" || a.style.display === "hidden";
        const bHidden = b.style.display === "none" || b.style.display === "hidden";
        if (aHidden && !bHidden) return 1;
        if (!aHidden && bHidden) return -1;

        const va = getCellValue(a, colIndex);
        const vb = getCellValue(b, colIndex);
        return compareValues(va, vb) * multiplier;
      });

      // Mark the sorted header
      const th = headerRow.querySelector(
        `th[data-col-index="${colIndex}"]`
      );
      if (th) {
        th.classList.add(direction === "asc" ? "sort-asc" : "sort-desc");
      }
    }

    // Re-append rows in new order
    rows.forEach((row) => tbody.appendChild(row));
  }

  headerRow.addEventListener("click", (evt) => {
    const th = evt.target.closest("th.sortable");
    if (!th) return;

    const colIndex = Number(th.dataset.colIndex);

    let nextDirection = "asc";
    if (currentSort.colIndex === colIndex) {
      if (currentSort.direction === "asc") nextDirection = "desc";
      else if (currentSort.direction === "desc") nextDirection = null; // reset
    }

    currentSort = {
      colIndex,
      direction: nextDirection,
    };

    applySort(colIndex, nextDirection);
  });
}

/* -------- Init -------- */

async function initStats() {
  try {
    const resp = await fetch(CSV_PATH);
    if (!resp.ok) throw new Error("Failed to load stats.csv");
    const text = await resp.text();
    const { headers, rows } = parseCSV(text);

    buildStatsTable(headers, rows);
    setupStatsSearch();
    setupStatsSorting();
  } catch (err) {
    console.error("Error initializing stats:", err);
  }
}

document.addEventListener("DOMContentLoaded", initStats);
