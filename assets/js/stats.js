// Simple CSV loader + search for stats page

const CSV_PATH = "assets/data/stats.csv";

function parseCSV(text) {
  // very basic CSV parser: assumes no commas inside values
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(",").map((v) => v.trim()));
  return { headers, rows };
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
      // For mobile stacked layout, label cells with header name
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
    buildStatsTable(headers, rows);
    setupStatsSearch();
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", initStats);
