import { CONFIG } from "./config.js";

const $ = (id) => document.getElementById(id);

const el = {
  // base
  btnReload: $("btnReload"),
  totalCredito: $("totalCredito"),
  totalAbonado: $("totalAbonado"),
  saldoRestante: $("saldoRestante"),
  ultimoPago: $("ultimoPago"),
  ultimoPagoValor: $("ultimoPagoValor"),

  // hero + progreso
  heroBadge: $("heroBadge"),
  progressPercent: $("progressPercent"),
  progressFill: $("progressFill"),
  progressPaid: $("progressPaid"),
  progressLeft: $("progressLeft"),

  // kpis
  kpiMonthsWithPayments: $("kpiMonthsWithPayments"),
  kpiAvgMonthlyAll: $("kpiAvgMonthlyAll"),
  kpiAvgMonthly6: $("kpiAvgMonthly6"),
  kpiMonthlyGoal: $("kpiMonthlyGoal"),

  // proyección
  projectionMode: $("projectionMode"),
  manualWrap: $("manualWrap"),
  manualMonthly: $("manualMonthly"),
  monthlyUsed: $("monthlyUsed"),
  monthsLeft: $("monthsLeft"),
  payoffDate: $("payoffDate"),
  projectionPill: $("projectionPill"),

  // mini progreso
  miniPercent: $("miniPercent"),
  miniFill: $("miniFill"),
  miniNote: $("miniNote"),

  // histórico
  search: $("search"),
  yearFilter: $("yearFilter"),
  table: $("table"),
  tableBody: $("table")?.querySelector("tbody"),
  status: $("status"),
  lastUpdatedValue: $("lastUpdatedValue"),
};

const STATE = {
  rawRows: [],
  computedRows: [],
  monthTotals: [],
  summary: null,
  loading: false,
};

init();

function init() {
  trySetControlDefaults();
  bindEvents();
  load();
}

function trySetControlDefaults() {
  if (el.projectionMode) {
    el.projectionMode.value = CONFIG.DEFAULT_PROJECTION_MODE || "last_month_avg_6";
  }

  if (el.manualMonthly) {
    el.manualMonthly.value = sanitizePositiveNumber(CONFIG.DEFAULT_MANUAL_MONTHLY_PAYMENT);
  }
}

function bindEvents() {
  el.btnReload?.addEventListener("click", load);

  el.projectionMode?.addEventListener("change", () => {
    renderProjection();
    renderKpis();
  });

  el.manualMonthly?.addEventListener("input", () => {
    normalizeManualMonthlyInput();
    renderProjection();
    renderKpis();
  });

  el.search?.addEventListener("input", applyFilters);
  el.yearFilter?.addEventListener("change", applyFilters);
}

async function load() {
  if (STATE.loading) return;

  STATE.loading = true;
  setLoadingState(true);
  setStatus("📥 Cargando datos del crédito...");

  try {
    validateConfig();

    const tsv = await fetchText(CONFIG.TSV_URL);
    const parsedRows = parseTSV(tsv);

    if (!parsedRows.length) {
      throw new Error("No se encontraron filas válidas en el TSV.");
    }

    STATE.rawRows = parsedRows;
    STATE.computedRows = buildComputedRows(parsedRows, CONFIG.TOTAL_CREDITO);
    STATE.monthTotals = buildMonthlyTotals(STATE.computedRows);
    STATE.summary = buildSummary(STATE.computedRows, CONFIG.TOTAL_CREDITO);

    renderAll();

    setLastUpdatedNow();
    setStatus(
      `✅ Listo. Registros: ${STATE.computedRows.length}. Meses con pago: ${STATE.monthTotals.length}.`
    );
  } catch (err) {
    console.error(err);
    clearUIOnError();
    setStatus(`❌ ${humanizeError(err)}`);
  } finally {
    STATE.loading = false;
    setLoadingState(false);
  }
}

/* -----------------------------
   Config / fetch
------------------------------ */

function validateConfig() {
  if (!CONFIG || typeof CONFIG !== "object") {
    throw new Error("CONFIG no existe o no es válida.");
  }

  if (!CONFIG.TSV_URL || typeof CONFIG.TSV_URL !== "string") {
    throw new Error("Falta CONFIG.TSV_URL.");
  }

  if (!Number.isFinite(Number(CONFIG.TOTAL_CREDITO)) || Number(CONFIG.TOTAL_CREDITO) <= 0) {
    throw new Error("CONFIG.TOTAL_CREDITO debe ser un número mayor a 0.");
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`No pude leer el TSV (${response.status}).`);
  }

  return await response.text();
}

/* -----------------------------
   Parse TSV
------------------------------ */

function parseTSV(tsvText) {
  const normalized = String(tsvText || "").replace(/^\uFEFF/, "");
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.replace(/\r/g, ""))
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) return [];

  const headers = splitTSVLine(lines[0]).map((h) => normalizeHeader(h));
  const idxFecha = findHeaderIndex(headers, ["fecha"]);
  const idxMes = findHeaderIndex(headers, ["mes"]);
  const idxValor = findHeaderIndex(headers, ["valor"]);

  if (idxFecha === -1 || idxMes === -1 || idxValor === -1) {
    throw new Error("El TSV debe tener columnas: Fecha, Mes, Valor.");
  }

  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitTSVLine(lines[i]);

    const fechaStr = safeCell(cols[idxFecha]);
    const mesStr = safeCell(cols[idxMes]);
    const valorStr = safeCell(cols[idxValor]);

    if (!fechaStr && !mesStr && !valorStr) continue;

    const fecha = parseColDate(fechaStr);
    const valor = parseCOP(valorStr);

    rows.push({
      rowIndex: i + 1,
      fechaStr,
      mesStr,
      valorStr,
      fecha,
      valor,
    });
  }

  rows.sort(compareRowsByDateAsc);
  return rows;
}

function splitTSVLine(line) {
  return String(line ?? "").split("\t");
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function findHeaderIndex(headers, accepted) {
  return headers.findIndex((h) => accepted.includes(h));
}

function safeCell(value) {
  return String(value ?? "").trim();
}

function compareRowsByDateAsc(a, b) {
  if (a.fecha && b.fecha) return a.fecha - b.fecha;
  if (a.fecha && !b.fecha) return -1;
  if (!a.fecha && b.fecha) return 1;
  return (a.fechaStr || "").localeCompare(b.fechaStr || "");
}

function parseColDate(input) {
  const s = String(input || "").trim();
  if (!s) return null;

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    let dd = Number(slash[1]);
    let mm = Number(slash[2]) - 1;
    let yy = Number(slash[3]);
    if (yy < 100) yy = 2000 + yy;

    const d = new Date(yy, mm, dd);
    if (!isValidDate(d)) return null;
    if (d.getDate() !== dd || d.getMonth() !== mm || d.getFullYear() !== yy) return null;
    return d;
  }

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const yy = Number(iso[1]);
    const mm = Number(iso[2]) - 1;
    const dd = Number(iso[3]);

    const d = new Date(yy, mm, dd);
    if (!isValidDate(d)) return null;
    if (d.getDate() !== dd || d.getMonth() !== mm || d.getFullYear() !== yy) return null;
    return d;
  }

  return null;
}

function parseCOP(input) {
  const raw = String(input || "").trim();
  if (!raw) return 0;

  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/[^\d-]/g, "");

  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;

  return Math.max(0, n);
}

function isValidDate(d) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

/* -----------------------------
   Compute
------------------------------ */

function buildComputedRows(rows, totalCredito) {
  let acumulado = 0;
  const total = Number(totalCredito) || 0;

  return rows.map((row) => {
    const valor = sanitizePositiveNumber(row.valor);
    acumulado += valor;

    return {
      ...row,
      valor,
      acumulado,
      saldo: total - acumulado,
    };
  });
}

function buildMonthlyTotals(rows) {
  const map = new Map();

  for (const row of rows) {
    if (!row.fecha || row.valor <= 0) continue;

    const key = `${row.fecha.getFullYear()}-${String(row.fecha.getMonth() + 1).padStart(2, "0")}`;
    const current = map.get(key) || 0;
    map.set(key, current + row.valor);
  }

  return [...map.entries()]
    .map(([key, total]) => {
      const [year, month] = key.split("-").map(Number);
      return {
        key,
        total,
        date: new Date(year, month - 1, 1),
      };
    })
    .sort((a, b) => a.date - b.date);
}

function buildSummary(rows, totalCredito) {
  const total = sanitizePositiveNumber(totalCredito);
  const totalAbonado = rows.reduce((acc, row) => acc + sanitizePositiveNumber(row.valor), 0);
  const saldo = total - totalAbonado;
  const last = [...rows].reverse().find((row) => row.fecha && row.valor > 0) || null;

  return {
    totalCredito: total,
    totalAbonado,
    saldo,
    last,
  };
}

function getProjectionMonthlyValue(mode) {
  const monthTotals = STATE.monthTotals;

  if (mode === "manual") {
    return sanitizePositiveNumber(el.manualMonthly?.value);
  }

  if (mode === "last_month") {
    const lastMonth = monthTotals[monthTotals.length - 1];
    return lastMonth ? sanitizePositiveNumber(lastMonth.total) : 0;
  }

  if (mode === "all_month_avg") {
    if (!monthTotals.length) return 0;
    return Math.round(monthTotals.reduce((acc, row) => acc + row.total, 0) / monthTotals.length);
  }

  const last6 = monthTotals.slice(-6);
  if (!last6.length) return 0;
  return Math.round(last6.reduce((acc, row) => acc + row.total, 0) / last6.length);
}

/* -----------------------------
   Render
------------------------------ */

function renderAll() {
  renderSummary();
  renderProgress();
  renderKpis();
  buildYearFilter(STATE.computedRows);
  applyFilters();
  renderProjection();
}

function renderSummary() {
  const summary = STATE.summary;
  if (!summary) return;

  safeSetText(el.totalCredito, money(summary.totalCredito));
  safeSetText(el.totalAbonado, money(summary.totalAbonado));
  safeSetText(el.saldoRestante, money(summary.saldo));

  if (summary.last) {
    safeSetText(el.ultimoPago, fmtDate(summary.last.fecha));
    safeSetText(el.ultimoPagoValor, `Valor: ${money(summary.last.valor)} 💵`);
  } else {
    safeSetText(el.ultimoPago, "—");
    safeSetText(el.ultimoPagoValor, "Aún no hay pagos válidos registrados.");
  }

  if (summary.saldo <= 0) {
    safeSetText(el.heroBadge, "🎉 ¡Pagado!");
  } else if (summary.totalAbonado <= 0) {
    safeSetText(el.heroBadge, "🕗 Sin abonos");
  } else {
    safeSetText(el.heroBadge, "⏳ En curso");
  }
}

function renderProgress() {
  const summary = STATE.summary;
  if (!summary) return;

  const total = sanitizePositiveNumber(summary.totalCredito);
  const paid = sanitizePositiveNumber(summary.totalAbonado);
  const left = Math.max(0, sanitizePositiveNumber(summary.saldo));
  const pct = total > 0 ? clamp((paid / total) * 100, 0, 100) : 0;

  safeSetText(el.progressPercent, `${formatPct(pct)}%`);
  safeSetText(el.progressPaid, money(paid));
  safeSetText(el.progressLeft, money(left));
  safeSetText(el.miniPercent, `${formatPct(pct)}%`);

  animateWidth(el.progressFill, pct);
  animateWidth(el.miniFill, pct);

  const pb = document.querySelector(".progressBar");
  if (pb) {
    pb.setAttribute("aria-valuenow", String(Math.round(pct)));
  }
}

function renderKpis() {
  const monthTotals = STATE.monthTotals;

  safeSetText(
    el.kpiMonthsWithPayments,
    monthTotals.length ? String(monthTotals.length) : "—"
  );

  const avgAll = monthTotals.length
    ? Math.round(monthTotals.reduce((acc, row) => acc + row.total, 0) / monthTotals.length)
    : 0;
  safeSetText(el.kpiAvgMonthlyAll, avgAll > 0 ? money(avgAll) : "—");

  const last6 = monthTotals.slice(-6);
  const avg6 = last6.length
    ? Math.round(last6.reduce((acc, row) => acc + row.total, 0) / last6.length)
    : 0;
  safeSetText(el.kpiAvgMonthly6, avg6 > 0 ? money(avg6) : "—");

  const manual = sanitizePositiveNumber(el.manualMonthly?.value);
  safeSetText(el.kpiMonthlyGoal, manual > 0 ? money(manual) : "—");
}

function renderProjection() {
  const summary = STATE.summary;
  if (!summary) return;

  const mode = el.projectionMode?.value || CONFIG.DEFAULT_PROJECTION_MODE || "last_month_avg_6";
  const saldo = summary.saldo ?? 0;
  const monthly = getProjectionMonthlyValue(mode);

  if (el.manualWrap) {
    el.manualWrap.style.display = mode === "manual" ? "flex" : "none";
  }

  safeSetText(el.monthlyUsed, money(monthly));
  safeSetText(el.projectionPill, modeLabel(mode));

  if (saldo <= 0) {
    safeSetText(el.monthsLeft, "0");
    safeSetText(el.payoffDate, "🎉 Ya quedó pagado");
    safeSetText(el.miniNote, "Listo. Este crédito ya no les está respirando en la nuca ✨");
    return;
  }

  if (monthly <= 0 || !summary.last?.fecha) {
    safeSetText(el.monthsLeft, "—");
    safeSetText(el.payoffDate, "—");
    safeSetText(
      el.miniNote,
      "No hay base suficiente para proyectar. Usen una cuota manual y listo, humanidad resuelta por un rato ✍️"
    );
    return;
  }

  const monthsLeft = Math.ceil(Math.max(0, saldo) / monthly);
  const lastMonthDate = STATE.monthTotals.length
    ? STATE.monthTotals[STATE.monthTotals.length - 1].date
    : summary.last.fecha;

  const payoffDate = addMonths(lastMonthDate, monthsLeft);

  safeSetText(el.monthsLeft, String(monthsLeft));
  safeSetText(el.payoffDate, `🏁 ${fmtMonthYear(payoffDate)}`);

  if (monthsLeft <= 3) {
    safeSetText(el.miniNote, "Ya casi. Un empujoncito más y sale de sus vidas 💫");
  } else if (monthsLeft <= 6) {
    safeSetText(el.miniNote, "Ya falta poquito. Si sostienen el ritmo, esto se acaba pronto ✅");
  } else if (monthsLeft <= 18) {
    safeSetText(el.miniNote, "Va bien. Mantener constancia es más poderoso que improvisar cada mes 💪");
  } else {
    safeSetText(el.miniNote, "Todavía le falta camino, pero ya hay avance real. Paso a paso, que así pagan casi todos los mortales 🧡");
  }
}

/* -----------------------------
   Filters / table
------------------------------ */

function buildYearFilter(rows) {
  if (!el.yearFilter) return;

  const previousValue = el.yearFilter.value;
  const years = [...new Set(rows.filter((r) => r.fecha).map((r) => r.fecha.getFullYear()))]
    .sort((a, b) => b - a);

  el.yearFilter.innerHTML =
    `<option value="">Todos los años</option>` +
    years.map((year) => `<option value="${year}">${year}</option>`).join("");

  if (years.includes(Number(previousValue))) {
    el.yearFilter.value = previousValue;
  }
}

function applyFilters() {
  if (!el.tableBody) return;

  const q = String(el.search?.value || "").toLowerCase().trim();
  const year = String(el.yearFilter?.value || "").trim();

  const filtered = STATE.computedRows.filter((row) => {
    if (year) {
      if (!row.fecha) return false;
      if (String(row.fecha.getFullYear()) !== year) return false;
    }

    if (!q) return true;

    const searchable = [
      row.fecha ? fmtDate(row.fecha) : row.fechaStr,
      row.mesStr,
      money(row.valor),
      money(row.acumulado),
      money(row.saldo),
      String(row.valor || ""),
      String(row.acumulado || ""),
      String(row.saldo || ""),
    ]
      .join(" | ")
      .toLowerCase();

    return searchable.includes(q);
  });

  renderTable(filtered);
}

function renderTable(rows) {
  if (!el.tableBody) return;

  if (!rows.length) {
    el.tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="muted" style="text-align:center; padding:18px;">
          No hay registros que coincidan con ese filtro.
        </td>
      </tr>
    `;
    return;
  }

  el.tableBody.innerHTML = rows
    .map((row) => {
      const saldoClass = row.saldo <= 0 ? " data-paid-off" : "";
      return `
        <tr class="${saldoClass.trim()}">
          <td>${row.fecha ? fmtDate(row.fecha) : esc(row.fechaStr || "—")}</td>
          <td>${esc(row.mesStr || "—")}</td>
          <td class="right">${money(row.valor)}</td>
          <td class="right">${money(row.acumulado)}</td>
          <td class="right">${money(row.saldo)}</td>
        </tr>
      `;
    })
    .join("");
}

/* -----------------------------
   Error / loading UI
------------------------------ */

function setLoadingState(isLoading) {
  if (el.btnReload) {
    el.btnReload.disabled = isLoading;
    el.btnReload.setAttribute("aria-busy", String(isLoading));
    el.btnReload.textContent = isLoading ? "⏳ Cargando..." : "🔄 Actualizar";
  }
}

function clearUIOnError() {
  safeSetText(el.heroBadge, "⚠️ Error");
  safeSetText(el.totalCredito, "—");
  safeSetText(el.totalAbonado, "—");
  safeSetText(el.saldoRestante, "—");
  safeSetText(el.ultimoPago, "—");
  safeSetText(el.ultimoPagoValor, "");
  safeSetText(el.progressPercent, "—%");
  safeSetText(el.progressPaid, "—");
  safeSetText(el.progressLeft, "—");
  safeSetText(el.kpiMonthsWithPayments, "—");
  safeSetText(el.kpiAvgMonthlyAll, "—");
  safeSetText(el.kpiAvgMonthly6, "—");
  safeSetText(el.kpiMonthlyGoal, "—");
  safeSetText(el.monthlyUsed, "—");
  safeSetText(el.monthsLeft, "—");
  safeSetText(el.payoffDate, "—");
  safeSetText(el.projectionPill, "⚠️ Sin datos");
  safeSetText(el.miniPercent, "—%");
  safeSetText(el.miniNote, "No se pudo calcular la proyección.");

  animateWidth(el.progressFill, 0);
  animateWidth(el.miniFill, 0);

  if (el.tableBody) {
    el.tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="muted" style="text-align:center; padding:18px;">
          No fue posible cargar el histórico.
        </td>
      </tr>
    `;
  }
}

function humanizeError(err) {
  return err?.message || "Algo salió mal al cargar el panel.";
}

/* -----------------------------
   Helpers: formatting / dates
------------------------------ */

function addMonths(date, months) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setMonth(d.getMonth() + months);
  return d;
}

function fmtDate(date) {
  if (!isValidDate(date)) return "—";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

function fmtMonthYear(date) {
  if (!isValidDate(date)) return "—";

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function money(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return "—";

  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function setStatus(message) {
  safeSetText(el.status, message);
}

function safeSetText(node, text) {
  if (!node) return;
  node.textContent = String(text ?? "");
}

function setLastUpdatedNow() {
  if (!el.lastUpdatedValue) return;

  const now = new Date();
  const formatted =
    `${String(now.getDate()).padStart(2, "0")}/` +
    `${String(now.getMonth() + 1).padStart(2, "0")}/` +
    `${now.getFullYear()} ` +
    `${String(now.getHours()).padStart(2, "0")}:` +
    `${String(now.getMinutes()).padStart(2, "0")}`;

  el.lastUpdatedValue.textContent = formatted;
}

/* -----------------------------
   Helpers: input / ux
------------------------------ */

function normalizeManualMonthlyInput() {
  if (!el.manualMonthly) return;
  el.manualMonthly.value = sanitizePositiveNumber(el.manualMonthly.value);
}

function sanitizePositiveNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatPct(pct) {
  if (!Number.isFinite(pct)) return "0";
  if (pct > 0 && pct < 10) return pct.toFixed(1);
  return String(Math.round(pct));
}

function modeLabel(mode) {
  if (mode === "manual") return "✍️ Manual";
  if (mode === "last_month") return "🧾 Último mes";
  if (mode === "all_month_avg") return "📊 Promedio total";
  return "📌 Promedio 6 meses";
}

function animateWidth(node, targetPct) {
  if (!node) return;

  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const to = clamp(Number(targetPct) || 0, 0, 100);

  if (prefersReduced) {
    node.style.width = `${to}%`;
    return;
  }

  const from = Number(String(node.style.width || "0").replace("%", "")) || 0;
  const duration = 650;
  const start = performance.now();

  function step(now) {
    const progress = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = from + (to - from) * eased;
    node.style.width = `${value}%`;

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}