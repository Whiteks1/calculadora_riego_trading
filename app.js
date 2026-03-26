const form = document.getElementById("riskForm");
const fillExampleButton = document.getElementById("fillExample");
const saveScenarioButton = document.getElementById("saveScenario");
const clearScenariosButton = document.getElementById("clearScenarios");
const formMessage = document.getElementById("formMessage");
const scenarioTableBody = document.getElementById("scenarioTableBody");
const scenarioCountBadge = document.getElementById("scenarioCountBadge");

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

const STORAGE_KEY = "trading-risk-scenarios";
const scenarios = [];
let lastCalculation = null;

const exampleValues = {
  capital: 10000,
  riskPercent: 1,
  entryPrice: 1.205,
  stopLoss: 1.198,
  exitPrice: 1.219,
};

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

function readFormValues() {
  const formData = new FormData(form);

  return {
    capital: Number(formData.get("capital")),
    riskPercent: Number(formData.get("riskPercent")),
    entryPrice: Number(formData.get("entryPrice")),
    stopLoss: Number(formData.get("stopLoss")),
    exitPrice: Number(formData.get("exitPrice")),
  };
}

function validateValues(values) {
  const requiredFields = [
    ["capital", "Introduce un capital mayor que 0."],
    ["riskPercent", "Introduce un porcentaje de riesgo mayor que 0."],
    ["entryPrice", "Introduce un precio de entrada valido."],
    ["stopLoss", "Introduce un stop loss valido."],
    ["exitPrice", "Introduce un precio objetivo valido."],
  ];

  for (const [key, message] of requiredFields) {
    if (!Number.isFinite(values[key]) || values[key] <= 0) {
      return message;
    }
  }

  if (values.riskPercent > 100) {
    return "El porcentaje de riesgo no puede ser mayor que 100%.";
  }

  if (values.entryPrice === values.stopLoss) {
    return "El precio de entrada y el stop loss no pueden ser iguales.";
  }

  if (values.entryPrice === values.exitPrice) {
    return "El precio de entrada y el precio objetivo no pueden ser iguales.";
  }

  return "";
}

function detectTradeType(entryPrice, stopLoss) {
  return stopLoss < entryPrice ? "LONG" : "SHORT";
}

function calculateRisk(values) {
  const tradeType = detectTradeType(values.entryPrice, values.stopLoss);
  const riskAmount = values.capital * (values.riskPercent / 100);
  const stopDistance = Math.abs(values.entryPrice - values.stopLoss);
  const targetDistance = Math.abs(values.exitPrice - values.entryPrice);
  const positionSize = riskAmount / stopDistance;
  const potentialLoss = positionSize * stopDistance;
  const potentialProfit = positionSize * targetDistance;
  const rrRatio = potentialProfit / potentialLoss;
  const notionalValue = positionSize * values.entryPrice;

  const expectedTargetDirection =
    tradeType === "LONG" ? values.exitPrice > values.entryPrice : values.exitPrice < values.entryPrice;

  return {
    tradeType,
    riskAmount,
    stopDistance,
    targetDistance,
    positionSize,
    potentialLoss,
    potentialProfit,
    rrRatio,
    notionalValue,
    expectedTargetDirection,
  };
}

function createScenarioRecord(values, metrics) {
  return {
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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
}

function loadScenarios() {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return;
    }

    const parsedScenarios = JSON.parse(rawValue);

    if (!Array.isArray(parsedScenarios)) {
      return;
    }

    parsedScenarios.forEach((scenario) => {
      if (
        Number.isFinite(scenario.capital) &&
        Number.isFinite(scenario.riskPercent) &&
        Number.isFinite(scenario.entryPrice) &&
        Number.isFinite(scenario.stopLoss) &&
        Number.isFinite(scenario.exitPrice) &&
        typeof scenario.tradeType === "string"
      ) {
        scenarios.push(scenario);
      }
    });
  } catch (error) {
    console.error("No se pudieron cargar los escenarios guardados.", error);
  }
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

  const directionMessage = metrics.expectedTargetDirection
    ? "La dirección del objetivo es coherente con el tipo de operación."
    : "El objetivo no acompaña la dirección del setup, así que deberías revisarlo.";

  outputs.insightText.textContent =
    `Operacion ${metrics.tradeType.toLowerCase()}: arriesgas ${formatCurrency(metrics.riskAmount)} ` +
    `con una distancia al stop de ${formatNumber(metrics.stopDistance, 4)}. ${rrMessage} ${directionMessage}`;

  updateBadge(metrics.tradeType);
}

function renderScenarioTable() {
  if (scenarios.length === 0) {
    scenarioTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="11">Todavia no has guardado escenarios. Calcula una operacion y pulsa "Anadir escenario".</td>
      </tr>
    `;
    scenarioCountBadge.textContent = "0 escenarios";
    scenarioCountBadge.className = "trade-badge neutral";
    return;
  }

  scenarioTableBody.innerHTML = scenarios
    .map((scenario, index) => {
      const typeClass = scenario.tradeType === "LONG" ? "long" : "short";

      return `
        <tr>
          <td><strong>${index + 1}</strong></td>
          <td><span class="row-badge ${typeClass}">${scenario.tradeType}</span></td>
          <td>${formatCurrency(scenario.capital)}</td>
          <td>${formatNumber(scenario.riskPercent, 2)}%</td>
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

  scenarioCountBadge.textContent = `${scenarios.length} escenario${scenarios.length === 1 ? "" : "s"}`;
  scenarioCountBadge.className = "trade-badge neutral";
}

function saveScenario() {
  if (!lastCalculation) {
    formMessage.textContent = "Primero calcula una operacion valida antes de guardarla como escenario.";
    return;
  }

  scenarios.push(createScenarioRecord(lastCalculation.values, lastCalculation.metrics));

  persistScenarios();
  formMessage.textContent = "Escenario anadido a la tabla comparativa.";
  renderScenarioTable();
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
    scenarios.splice(index, 1);
    persistScenarios();
    renderScenarioTable();
  }
});

clearScenariosButton.addEventListener("click", () => {
  scenarios.length = 0;
  window.localStorage.removeItem(STORAGE_KEY);
  formMessage.textContent = "La tabla de escenarios se ha vaciado.";
  renderScenarioTable();
});

loadScenarios();
renderScenarioTable();
resetResults();
