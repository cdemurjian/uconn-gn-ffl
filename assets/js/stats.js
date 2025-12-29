// Path to your exported Google Sheets CSV
const CSV_PATH = "assets/data/stats.csv";

/**
 * Robust-ish CSV parser:
 * - Handles values wrapped in double quotes
 * - Handles commas inside quoted values
 * - Handles escaped quotes ("") inside a quoted value
 * - Handles \n and \r\n line endings
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
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      // End of cell
      row.push(cur);
      cur = "";
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      // End of row
      if (cur.length > 0 || row.length) {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      }
      // Handle CRLF (\r\n)
      if (c === "\r" && text[i + 1] === "\n") {
        i++;
      }
    } else {
      cur += c;
    }
  }

  // Last cell/row if no trailing newline
  if (cur.length > 0 || row.length) {
    row.push(cur);
    rows.push(row);
  }

  if (!rows.length) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows
    .slice(1)
    .filter((r) => r.some((v) => v.trim() !== ""))
    .map((r) => r.map((v) => v.trim()));

  return { headers, rows: dataRows };
}

function buildStatsTable(headers, rows) {
  const table = document.getElementById("stats-table");
  const headerRow = document.getElementById("stats-header-row");
  if (!table || !headerRow) return;

  // Build header
  headerRow.innerHTML = "";
  headers.forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });

  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((value, idx) => {
      const td = document.createElement("td");
      td.textContent = value;
      // data-label only matters if we ever go back to stacked mobile layout
      td.setAttribute("data-label", headers[idx] || "");
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
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

async function initStats() {
  try {
    const resp = await fetch(CSV_PATH);
    if (!resp.ok) throw new Error("Failed to load stats.csv");
    const text = await resp.text();
    const { headers, rows } = parseCSV(text);

    if (!headers.length) {
      console.warn("No headers parsed from CSV");
    }

    buildStatsTable(headers, rows);
    setupStatsSearch();
  } catch (err) {
    console.error("Error initializing stats:", err);
  }
}

document.addEventListener("DOMContentLoaded", initStats);
