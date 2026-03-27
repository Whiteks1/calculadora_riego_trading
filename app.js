const form = document.getElementById("riskForm");
const fillExampleButton = document.getElementById("fillExample");
const saveScenarioButton = document.getElementById("saveScenario");
const exportScenariosButton = document.getElementById("exportScenarios");
const exportHistoryButton = document.getElementById("exportHistory");
const clearScenariosButton = document.getElementById("clearScenarios");
const clearHistoryButton = document.getElementById("clearHistory");
const formMessage = document.getElementById("formMessage");
const scenarioTableBody = document.getElementById("scenarioTableBody");
const scenarioCountBadge = document.getElementById("scenarioCountBadge");
const historyCountBadge = document.getElementById("historyCountBadge");
const historyTableBody = document.getElementById("historyTableBody");
const historySearchInput = document.getElementById("historySearch");
const historyTypeFilter = document.getElementById("historyTypeFilter");
const historyStrategyFilter = document.getElementById("historyStrategyFilter");

const backtestForm = document.getElementById("backtestForm");
const loadBacktestExampleButton = document.getElementById("loadBacktestExample");
const backtestMessage = document.getElementById("backtestMessage");
const backtestChart = document.getElementById("backtestChart");
const equityChart = document.getElementById("equityChart");
const backtestSignalBody = document.getElementById("backtestSignalBody");
const backtestTradesBody = document.getElementById("backtestTradesBody");
const riskEngine = window.RiskCore;

const outputs = {
  riskAmount: document.getElementById("riskAmount"),
  positionSize: document.getElementById("positionSize"),
  potentialLoss: document.getElementById("potentialLoss"),
  potentialProfit: document.getElementById("potentialProfit"),
  rrRatio: document.getElementById("rrRatio"),
  stopDistance: document.getElementById("stopDistance"),
  notionalValue: document.getElementById("notionalValue"),
  insightText: document.getElementById("insightText"),
  tradeTypeBadge: document.getElementById("tradeTypeBadge"),
};

const backtestOutputs = {
  finalCapital: document.getElementById("backtestFinalCapital"),
  totalReturn: document.getElementById("backtestReturn"),
  totalTrades: document.getElementById("backtestTrades"),
  winRate: document.getElementById("backtestWinRate"),
  maxDrawdown: document.getElementById("backtestDrawdown"),
  lastSignal: document.getElementById("backtestLastSignal"),
};

const STORAGE_KEYS = {
  scenarios: "trading-risk-scenarios",
  history: "trading-risk-history",
};

const state = {
  scenarios: [],
  history: [],
};

let lastCalculation = null;

const exampleValues = {
  capital: 10000,
  riskPercent: 1,
  entryPrice: 1.205,
  stopLoss: 1.198,
  exitPrice: 1.219,
  strategyName: "Breakout diario",
  tradeNotes: "Ruptura con objetivo 2R y contexto favorable en sesión europea.",
};

const demoPriceSeries = [
  100, 102, 101, 104, 106, 107, 108, 106, 109, 111, 114, 113,
  116, 118, 117, 119, 121, 120, 122, 124, 123, 126, 128, 127,
  129, 131, 130, 132, 135, 134, 136, 138, 137, 139, 141, 140,
].join(", ");

function formatCurrency(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercent(value, digits = 2) {
  return `${formatNumber(value, digits)}%`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function truncateText(value, maxLength = 48) {
  if (!value) {
    return "—";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function generateId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `scenario-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readFormValues() {
  const formData = new FormData(form);

  return {
    capital: Number(formData.get("capital")),
    riskPercent: Number(formData.get("riskPercent")),
    entryPrice: Number(formData.get("entryPrice")),
    stopLoss: Number(formData.get("stopLoss")),
    exitPrice: Number(formData.get("exitPrice")),
    strategyName: String(formData.get("strategyName") || "").trim(),
    tradeNotes: String(formData.get("tradeNotes") || "").trim(),
  };
}

function resolveTradeType(entryPrice, stopLoss) {
  return riskEngine.resolveTradeType(entryPrice, stopLoss);
}

function validateValues(values) {
  return riskEngine.validateTradeValues(values);
}

function calculateRisk(values) {
  return riskEngine.calculateRiskMetrics(values);
}

function createScenarioRecord(values, metrics, timestamp = new Date().toISOString()) {
  return {
    id: generateId(),
    createdAt: timestamp,
    strategy: values.strategyName || "Sin estrategia",
    notes: values.tradeNotes || "",
    capital: values.capital,
    riskPercent: values.riskPercent,
    entryPrice: values.entryPrice,
    stopLoss: values.stopLoss,
    exitPrice: values.exitPrice,
    tradeType: metrics.tradeType,
    riskAmount: metrics.riskAmount,
    stopDistance: metrics.stopDistance,
    targetDistance: metrics.targetDistance,
    positionSize: metrics.positionSize,
    potentialLoss: metrics.potentialLoss,
    potentialProfit: metrics.potentialProfit,
    rrRatio: metrics.rrRatio,
    notionalValue: metrics.notionalValue,
    expectedTargetDirection: metrics.expectedTargetDirection,
  };
}

function persistScenarios() {
  window.localStorage.setItem(STORAGE_KEYS.scenarios, JSON.stringify(state.scenarios));
}

function persistHistory() {
  window.localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
}

function normalizeStoredRecord(rawRecord, index) {
  if (!rawRecord || typeof rawRecord !== "object") {
    return null;
  }

  const normalizedValues = {
    capital: Number(rawRecord.capital),
    riskPercent: Number(rawRecord.riskPercent),
    entryPrice: Number(rawRecord.entryPrice),
    stopLoss: Number(rawRecord.stopLoss),
    exitPrice: Number(rawRecord.exitPrice),
    strategyName: typeof rawRecord.strategy === "string" ? rawRecord.strategy : "",
    tradeNotes: typeof rawRecord.notes === "string" ? rawRecord.notes : "",
  };

  if (validateValues(normalizedValues)) {
    return null;
  }

  const metrics = calculateRisk(normalizedValues);
  const record = createScenarioRecord(
    normalizedValues,
    metrics,
    rawRecord.createdAt || new Date(Date.now() - index * 60000).toISOString(),
  );

  record.id = typeof rawRecord.id === "string" ? rawRecord.id : record.id;
  return record;
}

function loadRecords(storageKey) {
  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return [];
    }

    const parsedRecords = JSON.parse(rawValue);

    if (!Array.isArray(parsedRecords)) {
      return [];
    }

    return parsedRecords
      .map((record, index) => normalizeStoredRecord(record, index))
      .filter(Boolean);
  } catch (error) {
    console.error(`No se pudieron cargar los datos de ${storageKey}.`, error);
    return [];
  }
}

function escapeCsvValue(value) {
  const stringValue = String(value);

  if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
    return `"${stringValue.replaceAll("\"", "\"\"")}"`;
  }

  return stringValue;
}

function downloadCsvFile(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function updateBadge(tradeType) {
  outputs.tradeTypeBadge.textContent = tradeType;
  outputs.tradeTypeBadge.className = "trade-badge";
  outputs.tradeTypeBadge.classList.add(tradeType === "LONG" ? "long" : "short");
}

function updateResults(metrics) {
  outputs.riskAmount.textContent = formatCurrency(metrics.riskAmount);
  outputs.positionSize.textContent = `${formatNumber(metrics.positionSize, 2)} u`;
  outputs.potentialLoss.textContent = formatCurrency(metrics.potentialLoss);
  outputs.potentialProfit.textContent = formatCurrency(metrics.potentialProfit);
  outputs.rrRatio.textContent = `1 : ${formatNumber(metrics.rrRatio, 2)}`;
  outputs.stopDistance.textContent = formatNumber(metrics.stopDistance, 4);
  outputs.notionalValue.textContent = formatCurrency(metrics.notionalValue);

  const rrMessage =
    metrics.rrRatio >= 2
      ? "El ratio es atractivo y da margen para equivocarte sin romper la gestión de riesgo."
      : "El ratio es ajustado; conviene revisar si el objetivo compensa el riesgo asumido.";

  outputs.insightText.textContent =
    `Operación ${metrics.tradeType.toLowerCase()}: arriesgas ${formatCurrency(metrics.riskAmount)} ` +
    `con una distancia al stop de ${formatNumber(metrics.stopDistance, 4)}. ${rrMessage}`;

  updateBadge(metrics.tradeType);
}

function resetResults() {
  lastCalculation = null;
  outputs.riskAmount.textContent = "--";
  outputs.positionSize.textContent = "--";
  outputs.potentialLoss.textContent = "--";
  outputs.potentialProfit.textContent = "--";
  outputs.rrRatio.textContent = "--";
  outputs.stopDistance.textContent = "--";
  outputs.notionalValue.textContent = "--";
  outputs.insightText.textContent =
    "Completa el formulario para obtener una lectura de la operación y validar si el escenario tiene sentido.";
  outputs.tradeTypeBadge.textContent = "Esperando datos";
  outputs.tradeTypeBadge.className = "trade-badge neutral";
}

function renderScenarioTable() {
  if (state.scenarios.length === 0) {
    scenarioTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="13">Todavía no has guardado escenarios. Calcula una operación y pulsa "Guardar escenario".</td>
      </tr>
    `;
    scenarioCountBadge.textContent = "0 escenarios";
    scenarioCountBadge.className = "trade-badge neutral";
    exportScenariosButton.disabled = true;
    return;
  }

  scenarioTableBody.innerHTML = state.scenarios
    .map((scenario, index) => {
      const typeClass = scenario.tradeType === "LONG" ? "long" : "short";

      return `
        <tr>
          <td><strong>${index + 1}</strong></td>
          <td>${escapeHtml(formatDate(scenario.createdAt))}</td>
          <td>${escapeHtml(scenario.strategy)}</td>
          <td><span class="row-badge ${typeClass}">${escapeHtml(scenario.tradeType)}</span></td>
          <td>${formatCurrency(scenario.capital)}</td>
          <td>${formatPercent(scenario.riskPercent, 2)}</td>
          <td>${formatNumber(scenario.entryPrice, 4)}</td>
          <td>${formatNumber(scenario.stopLoss, 4)}</td>
          <td>${formatNumber(scenario.exitPrice, 4)}</td>
          <td>${formatNumber(scenario.positionSize, 2)} u</td>
          <td>1 : ${formatNumber(scenario.rrRatio, 2)}</td>
          <td>${formatCurrency(scenario.potentialProfit)}</td>
          <td><button type="button" class="icon-button" data-index="${index}">Eliminar</button></td>
        </tr>
      `;
    })
    .join("");

  scenarioCountBadge.textContent = `${state.scenarios.length} escenario${state.scenarios.length === 1 ? "" : "s"}`;
  scenarioCountBadge.className = "trade-badge neutral";
  exportScenariosButton.disabled = false;
}

function renderHistoryStrategyOptions() {
  const previousValue = historyStrategyFilter.value || "ALL";
  const strategies = [...new Set(state.history.map((record) => record.strategy))].sort((left, right) =>
    left.localeCompare(right, "es"),
  );

  historyStrategyFilter.innerHTML = `
    <option value="ALL">Todas</option>
    ${strategies.map((strategy) => `<option value="${escapeHtml(strategy)}">${escapeHtml(strategy)}</option>`).join("")}
  `;

  historyStrategyFilter.value = strategies.includes(previousValue) ? previousValue : "ALL";
}

function getFilteredHistory() {
  const searchValue = historySearchInput.value.trim().toLowerCase();
  const typeValue = historyTypeFilter.value;
  const strategyValue = historyStrategyFilter.value;

  return state.history.filter((record) => {
    const matchesType = typeValue === "ALL" || record.tradeType === typeValue;
    const matchesStrategy = strategyValue === "ALL" || record.strategy === strategyValue;
    const haystack = [record.strategy, record.notes, record.tradeType, formatDate(record.createdAt)]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !searchValue || haystack.includes(searchValue);
    return matchesType && matchesStrategy && matchesSearch;
  });
}

function renderHistoryTable() {
  renderHistoryStrategyOptions();

  if (state.history.length === 0) {
    historyTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="8">Aún no hay operaciones en el histórico.</td>
      </tr>
    `;
    historyCountBadge.textContent = "0 registros";
    historyCountBadge.className = "trade-badge neutral";
    exportHistoryButton.disabled = true;
    return;
  }

  const filteredHistory = getFilteredHistory();

  historyTableBody.innerHTML = filteredHistory.length
    ? filteredHistory
        .map((record) => {
          const typeClass = record.tradeType === "LONG" ? "long" : "short";

          return `
            <tr>
              <td>${escapeHtml(formatDate(record.createdAt))}</td>
              <td>${escapeHtml(record.strategy)}</td>
              <td>${escapeHtml(truncateText(record.notes, 72))}</td>
              <td><span class="row-badge ${typeClass}">${escapeHtml(record.tradeType)}</span></td>
              <td>${formatCurrency(record.capital)}</td>
              <td>${formatPercent(record.riskPercent, 2)}</td>
              <td>1 : ${formatNumber(record.rrRatio, 2)}</td>
              <td>${formatCurrency(record.potentialProfit)}</td>
            </tr>
          `;
        })
        .join("")
    : `
        <tr class="empty-row">
          <td colspan="8">No hay registros que coincidan con el filtro actual.</td>
        </tr>
      `;

  historyCountBadge.textContent = `${filteredHistory.length} / ${state.history.length} registros`;
  historyCountBadge.className = "trade-badge neutral";
  exportHistoryButton.disabled = false;
}

function exportScenariosToCsv() {
  if (state.scenarios.length === 0) {
    formMessage.textContent = "No hay escenarios para exportar.";
    return;
  }

  const headers = [
    "numero", "fecha", "estrategia", "notas", "tipo", "capital", "riesgo_percent",
    "entrada", "stop_loss", "objetivo", "riesgo_dinero", "distancia_stop",
    "distancia_objetivo", "tamano_posicion", "perdida_potencial",
    "beneficio_potencial", "ratio_r", "valor_nocional",
  ];

  const rows = state.scenarios.map((scenario, index) => [
    index + 1,
    scenario.createdAt,
    scenario.strategy,
    scenario.notes,
    scenario.tradeType,
    scenario.capital,
    scenario.riskPercent,
    scenario.entryPrice,
    scenario.stopLoss,
    scenario.exitPrice,
    scenario.riskAmount,
    scenario.stopDistance,
    scenario.targetDistance,
    scenario.positionSize,
    scenario.potentialLoss,
    scenario.potentialProfit,
    scenario.rrRatio,
    scenario.notionalValue,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");

  downloadCsvFile("escenarios-trading.csv", csvContent);
  formMessage.textContent = "CSV exportado con tus escenarios activos.";
}

function exportHistoryToCsv() {
  if (state.history.length === 0) {
    formMessage.textContent = "No hay histórico para exportar.";
    return;
  }

  const headers = [
    "fecha", "estrategia", "notas", "tipo", "capital", "riesgo_percent",
    "entrada", "stop_loss", "objetivo", "riesgo_dinero", "distancia_stop",
    "distancia_objetivo", "tamano_posicion", "perdida_potencial",
    "beneficio_potencial", "ratio_r", "valor_nocional",
  ];

  const rows = state.history.map((record) => [
    record.createdAt,
    record.strategy,
    record.notes,
    record.tradeType,
    record.capital,
    record.riskPercent,
    record.entryPrice,
    record.stopLoss,
    record.exitPrice,
    record.riskAmount,
    record.stopDistance,
    record.targetDistance,
    record.positionSize,
    record.potentialLoss,
    record.potentialProfit,
    record.rrRatio,
    record.notionalValue,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");

  downloadCsvFile("historial-trading.csv", csvContent);
  formMessage.textContent = "CSV exportado con el histórico completo.";
}

function saveScenario() {
  if (!lastCalculation) {
    formMessage.textContent = "Primero calcula una operación válida antes de guardarla como escenario.";
    return;
  }

  const timestamp = new Date().toISOString();
  const record = createScenarioRecord(lastCalculation.values, lastCalculation.metrics, timestamp);

  state.scenarios.unshift(record);
  state.history.unshift(record);
  persistScenarios();
  persistHistory();
  renderScenarioTable();
  renderHistoryTable();
  formMessage.textContent = "Escenario guardado en el comparador y añadido al histórico.";
}

function parsePriceSeries(rawValue) {
  return rawValue
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map(Number);
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildMovingAverage(prices, period) {
  return prices.map((_, index) => {
    if (index + 1 < period) {
      return null;
    }

    return average(prices.slice(index - period + 1, index + 1));
  });
}

function readBacktestValues() {
  const formData = new FormData(backtestForm);

  return {
    prices: parsePriceSeries(String(formData.get("priceSeries") || "")),
    shortPeriod: Number(formData.get("shortPeriod")),
    longPeriod: Number(formData.get("longPeriod")),
    initialCapital: Number(formData.get("initialCapital")),
    commissionPercent: Number(formData.get("commissionPercent")),
    slippagePercent: Number(formData.get("slippagePercent")),
  };
}

function validateBacktestValues(values) {
  if (values.prices.length < 3 || values.prices.some((value) => !Number.isFinite(value) || value <= 0)) {
    return "Introduce una serie de precios válida con al menos 3 valores positivos.";
  }

  if (!Number.isInteger(values.shortPeriod) || values.shortPeriod < 1) {
    return "La media corta debe ser un entero mayor que 0.";
  }

  if (!Number.isInteger(values.longPeriod) || values.longPeriod <= values.shortPeriod) {
    return "La media larga debe ser un entero mayor que la media corta.";
  }

  if (values.prices.length < values.longPeriod) {
    return "La serie debe tener al menos tantos precios como la media larga.";
  }

  if (!Number.isFinite(values.initialCapital) || values.initialCapital <= 0) {
    return "Introduce un capital inicial mayor que 0.";
  }

  if (!Number.isFinite(values.commissionPercent) || values.commissionPercent < 0) {
    return "La comisión debe ser 0 o un valor positivo.";
  }

  if (!Number.isFinite(values.slippagePercent) || values.slippagePercent < 0) {
    return "El slippage debe ser 0 o un valor positivo.";
  }

  return "";
}

function runBacktest(values) {
  const shortSeries = buildMovingAverage(values.prices, values.shortPeriod);
  const longSeries = buildMovingAverage(values.prices, values.longPeriod);
  const signals = [];
  const trades = [];

  let cash = values.initialCapital;
  let units = 0;
  let openTrade = null;
  let peakEquity = values.initialCapital;
  let maxDrawdown = 0;

  for (let index = 0; index < values.prices.length; index += 1) {
    const price = values.prices[index];
    const shortMa = shortSeries[index];
    const longMa = longSeries[index];
    let signal = "HOLD";

    if (shortMa !== null && longMa !== null) {
      if (shortMa > longMa) {
        signal = "BUY";
      } else if (shortMa < longMa) {
        signal = "SELL";
      }
    }

    const buyPrice = price * (1 + values.slippagePercent / 100);
    const sellPrice = price * (1 - values.slippagePercent / 100);

    if (signal === "BUY" && units === 0) {
      const entryCommission = cash * (values.commissionPercent / 100);
      const investableCapital = cash - entryCommission;
      units = investableCapital / buyPrice;
      openTrade = {
        entryBar: index + 1,
        entryPrice: buyPrice,
        entryCapital: cash,
      };
      cash = 0;
    } else if (signal === "SELL" && units > 0 && openTrade) {
      const grossProceeds = units * sellPrice;
      const exitCommission = grossProceeds * (values.commissionPercent / 100);
      const netProceeds = grossProceeds - exitCommission;
      const profit = netProceeds - openTrade.entryCapital;

      trades.push({
        entryBar: openTrade.entryBar,
        exitBar: index + 1,
        exitReason: "Cruce a SELL",
        entryPrice: openTrade.entryPrice,
        exitPrice: sellPrice,
        profit,
        returnPercent: (profit / openTrade.entryCapital) * 100,
      });

      cash = netProceeds;
      units = 0;
      openTrade = null;
    }

    const equity = cash + units * price;
    peakEquity = Math.max(peakEquity, equity);
    maxDrawdown = Math.max(maxDrawdown, ((peakEquity - equity) / peakEquity) * 100);

    signals.push({
      bar: index + 1,
      price,
      shortMa,
      longMa,
      signal,
      equity,
    });
  }

  if (units > 0 && openTrade) {
    const sellPrice = values.prices[values.prices.length - 1] * (1 - values.slippagePercent / 100);
    const grossProceeds = units * sellPrice;
    const exitCommission = grossProceeds * (values.commissionPercent / 100);
    const netProceeds = grossProceeds - exitCommission;
    const profit = netProceeds - openTrade.entryCapital;

    trades.push({
      entryBar: openTrade.entryBar,
      exitBar: values.prices.length,
      exitReason: "Cierre final",
      entryPrice: openTrade.entryPrice,
      exitPrice: sellPrice,
      profit,
      returnPercent: (profit / openTrade.entryCapital) * 100,
    });

    cash = netProceeds;
    signals[signals.length - 1].equity = cash;
  }

  const winningTrades = trades.filter((trade) => trade.profit > 0).length;

  return {
    shortSeries,
    longSeries,
    signals,
    trades,
    finalCapital: cash,
    totalReturn: ((cash - values.initialCapital) / values.initialCapital) * 100,
    winRate: trades.length ? (winningTrades / trades.length) * 100 : 0,
    maxDrawdown,
    lastSignal: signals[signals.length - 1]?.signal || "HOLD",
  };
}

function renderBacktestChart(prices, shortSeries, longSeries) {
  const width = 800;
  const height = 260;
  const padding = 24;
  const validValues = [...prices, ...shortSeries.filter(Number.isFinite), ...longSeries.filter(Number.isFinite)];

  if (validValues.length === 0) {
    backtestChart.innerHTML = `<text class="chart-empty" x="50%" y="50%" text-anchor="middle">Sin datos para dibujar</text>`;
    return;
  }

  const minValue = Math.min(...validValues);
  const maxValue = Math.max(...validValues);
  const range = maxValue - minValue || 1;

  const buildPoints = (series) =>
    series
      .map((value, index) => {
        if (!Number.isFinite(value)) {
          return null;
        }

        const x = padding + (index / Math.max(series.length - 1, 1)) * (width - padding * 2);
        const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
        return `${x},${y}`;
      })
      .filter(Boolean)
      .join(" ");

  const gridLines = [0.2, 0.4, 0.6, 0.8]
    .map((ratio) => {
      const y = padding + (height - padding * 2) * ratio;
      return `<line class="chart-grid-line" x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}"></line>`;
    })
    .join("");

  backtestChart.innerHTML = `
    ${gridLines}
    <polyline class="chart-series price" points="${buildPoints(prices)}"></polyline>
    <polyline class="chart-series short" points="${buildPoints(shortSeries)}"></polyline>
    <polyline class="chart-series long" points="${buildPoints(longSeries)}"></polyline>
  `;
}

function renderEquityChart(signals) {
  const width = 800;
  const height = 220;
  const padding = 24;
  const equitySeries = signals.map((signal) => signal.equity).filter(Number.isFinite);

  if (equitySeries.length === 0) {
    equityChart.innerHTML = `<text class="chart-empty" x="50%" y="50%" text-anchor="middle">Sin equity para dibujar</text>`;
    return;
  }

  const minValue = Math.min(...equitySeries);
  const maxValue = Math.max(...equitySeries);
  const range = maxValue - minValue || 1;

  const points = signals
    .map((signal, index) => {
      const x = padding + (index / Math.max(signals.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((signal.equity - minValue) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const gridLines = [0.25, 0.5, 0.75]
    .map((ratio) => {
      const y = padding + (height - padding * 2) * ratio;
      return `<line class="chart-grid-line" x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}"></line>`;
    })
    .join("");

  equityChart.innerHTML = `
    ${gridLines}
    <polyline class="chart-series equity" points="${points}"></polyline>
  `;
}

function renderBacktestTables(result) {
  const latestSignals = result.signals.slice(-12).reverse();

  backtestSignalBody.innerHTML = latestSignals.length
    ? latestSignals.map((signal) => `
        <tr>
          <td>${signal.bar}</td>
          <td>${formatNumber(signal.price, 2)}</td>
          <td>${signal.shortMa === null ? "—" : formatNumber(signal.shortMa, 2)}</td>
          <td>${signal.longMa === null ? "—" : formatNumber(signal.longMa, 2)}</td>
          <td>${escapeHtml(signal.signal)}</td>
        </tr>
      `).join("")
    : `
        <tr class="empty-row">
          <td colspan="5">Ejecuta un backtest para ver las señales generadas.</td>
        </tr>
      `;

  backtestTradesBody.innerHTML = result.trades.length
    ? result.trades.map((trade, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>Barra ${trade.entryBar} @ ${formatNumber(trade.entryPrice, 2)}</td>
          <td>Barra ${trade.exitBar} @ ${formatNumber(trade.exitPrice, 2)}</td>
          <td>${escapeHtml(trade.exitReason)}</td>
          <td>${formatCurrency(trade.profit)}</td>
          <td>${formatPercent(trade.returnPercent, 2)}</td>
        </tr>
      `).join("")
    : `
        <tr class="empty-row">
          <td colspan="6">Todavía no hay operaciones del backtest.</td>
        </tr>
      `;
}

function updateBacktestResults(result) {
  backtestOutputs.finalCapital.textContent = formatCurrency(result.finalCapital);
  backtestOutputs.totalReturn.textContent = formatPercent(result.totalReturn, 2);
  backtestOutputs.totalTrades.textContent = String(result.trades.length);
  backtestOutputs.winRate.textContent = formatPercent(result.winRate, 2);
  backtestOutputs.maxDrawdown.textContent = formatPercent(result.maxDrawdown, 2);
  backtestOutputs.lastSignal.textContent = result.lastSignal;
}

function resetBacktestResults() {
  backtestOutputs.finalCapital.textContent = "--";
  backtestOutputs.totalReturn.textContent = "--";
  backtestOutputs.totalTrades.textContent = "--";
  backtestOutputs.winRate.textContent = "--";
  backtestOutputs.maxDrawdown.textContent = "--";
  backtestOutputs.lastSignal.textContent = "--";
  backtestSignalBody.innerHTML = `
    <tr class="empty-row">
      <td colspan="5">Ejecuta un backtest para ver las señales generadas.</td>
    </tr>
  `;
  backtestTradesBody.innerHTML = `
    <tr class="empty-row">
      <td colspan="6">Todavía no hay operaciones del backtest.</td>
    </tr>
  `;
  backtestChart.innerHTML = `<text class="chart-empty" x="50%" y="50%" text-anchor="middle">Carga una serie y ejecuta el backtest</text>`;
  equityChart.innerHTML = `<text class="chart-empty" x="50%" y="50%" text-anchor="middle">La curva de equity aparecerá aquí</text>`;
}

function bootstrapState() {
  const hasHistoryStorage = window.localStorage.getItem(STORAGE_KEYS.history) !== null;
  state.scenarios = loadRecords(STORAGE_KEYS.scenarios);
  state.history = loadRecords(STORAGE_KEYS.history);

  if (!hasHistoryStorage && state.history.length === 0 && state.scenarios.length > 0) {
    state.history = [...state.scenarios];
    persistHistory();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = readFormValues();
  const validationMessage = validateValues(values);

  if (validationMessage) {
    formMessage.textContent = validationMessage;
    resetResults();
    return;
  }

  const metrics = calculateRisk(values);
  lastCalculation = { values, metrics };
  formMessage.textContent = "";
  updateResults(metrics);
});

form.addEventListener("reset", () => {
  formMessage.textContent = "";
  window.setTimeout(resetResults, 0);
});

fillExampleButton.addEventListener("click", () => {
  Object.entries(exampleValues).forEach(([key, value]) => {
    form.elements[key].value = value;
  });

  form.requestSubmit();
});

saveScenarioButton.addEventListener("click", () => {
  const values = readFormValues();
  const validationMessage = validateValues(values);

  if (validationMessage) {
    formMessage.textContent = validationMessage;
    resetResults();
    return;
  }

  const metrics = calculateRisk(values);
  lastCalculation = { values, metrics };
  updateResults(metrics);
  saveScenario();
});

scenarioTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-index]");

  if (!button) {
    return;
  }

  const index = Number(button.dataset.index);

  if (Number.isInteger(index)) {
    state.scenarios.splice(index, 1);
    persistScenarios();
    renderScenarioTable();
  }
});

clearScenariosButton.addEventListener("click", () => {
  state.scenarios.length = 0;
  persistScenarios();
  formMessage.textContent = "La tabla comparativa se ha vaciado, pero el histórico sigue intacto.";
  renderScenarioTable();
});

clearHistoryButton.addEventListener("click", () => {
  state.history.length = 0;
  persistHistory();
  renderHistoryTable();
});

exportScenariosButton.addEventListener("click", exportScenariosToCsv);
exportHistoryButton.addEventListener("click", exportHistoryToCsv);

[historySearchInput, historyTypeFilter, historyStrategyFilter].forEach((element) => {
  element.addEventListener("input", renderHistoryTable);
  element.addEventListener("change", renderHistoryTable);
});

backtestForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = readBacktestValues();
  const validationMessage = validateBacktestValues(values);

  if (validationMessage) {
    backtestMessage.textContent = validationMessage;
    resetBacktestResults();
    return;
  }

  const result = runBacktest(values);
  updateBacktestResults(result);
  renderBacktestChart(values.prices, result.shortSeries, result.longSeries);
  renderEquityChart(result.signals);
  renderBacktestTables(result);
  backtestMessage.textContent = "";
});

loadBacktestExampleButton.addEventListener("click", () => {
  backtestForm.elements.priceSeries.value = demoPriceSeries;
  backtestForm.elements.shortPeriod.value = 3;
  backtestForm.elements.longPeriod.value = 6;
  backtestForm.elements.initialCapital.value = 10000;
  backtestForm.elements.commissionPercent.value = 0.1;
  backtestForm.elements.slippagePercent.value = 0.05;
  backtestForm.requestSubmit();
});

bootstrapState();
renderScenarioTable();
renderHistoryTable();
resetResults();
resetBacktestResults();
