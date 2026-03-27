const fs = require("fs");
const path = require("path");
const RiskCore = require(path.join(__dirname, "..", "risk-core.js"));

function parseCases(csvText) {
  const [headerLine, ...rows] = csvText.trim().split(/\r?\n/);
  const headers = headerLine.split(",");

  return rows.map((row) => {
    const values = row.split(",");
    return headers.reduce((accumulator, header, index) => {
      accumulator[header] = values[index];
      return accumulator;
    }, {});
  });
}

function assertClose(actual, expected, label, tolerance = 1e-6) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: esperado ${expected}, recibido ${actual}`);
  }
}

function run() {
  const fixturePath = path.join(__dirname, "risk_cases.csv");
  const cases = parseCases(fs.readFileSync(fixturePath, "utf8"));

  cases.forEach((testCase) => {
    const values = {
      capital: Number(testCase.capital),
      riskPercent: Number(testCase.riskPercent),
      entryPrice: Number(testCase.entryPrice),
      stopLoss: Number(testCase.stopLoss),
      exitPrice: Number(testCase.exitPrice),
      feePercent: 0.1,
      slippagePercent: 0.05,
      strategyName: "Parity test",
      tradeNotes: "fixture",
    };

    const validationError = RiskCore.validateTradeValues(values);

    if (validationError) {
      throw new Error(`${testCase.name}: validación inesperada -> ${validationError}`);
    }

    const metrics = RiskCore.calculateRiskMetrics(values);

    if (metrics.tradeType !== testCase.tradeType) {
      throw new Error(`${testCase.name}: tradeType esperado ${testCase.tradeType}, recibido ${metrics.tradeType}`);
    }

    assertClose(metrics.riskAmount, Number(testCase.riskAmount), `${testCase.name} riskAmount`);
    assertClose(metrics.stopDistance, Number(testCase.stopDistance), `${testCase.name} stopDistance`);
    assertClose(metrics.targetDistance, Number(testCase.targetDistance), `${testCase.name} targetDistance`);
    assertClose(metrics.positionSize, Number(testCase.positionSize), `${testCase.name} positionSize`);
    assertClose(metrics.potentialLoss, Number(testCase.potentialLoss), `${testCase.name} potentialLoss`);
    assertClose(metrics.potentialProfit, Number(testCase.potentialProfit), `${testCase.name} potentialProfit`);
    assertClose(metrics.rrRatio, Number(testCase.rrRatio), `${testCase.name} rrRatio`);
    assertClose(metrics.notionalValue, Number(testCase.notionalValue), `${testCase.name} notionalValue`);

    const plan = RiskCore.createTradePlan(values, {
      generatedAt: "2026-03-27T12:00:00.000Z",
      planId: `${testCase.name}-plan`,
      planner: "js-test-runner",
    });

    if (plan.contractType !== RiskCore.CONTRACT_TYPE) {
      throw new Error(`${testCase.name}: contractType inesperado -> ${plan.contractType}`);
    }

    if (plan.planId !== `${testCase.name}-plan`) {
      throw new Error(`${testCase.name}: planId inesperado -> ${plan.planId}`);
    }

    if (plan.costs.estimatedRoundTripCosts <= 0) {
      throw new Error(`${testCase.name}: costes estimados no válidos.`);
    }

    if (plan.outcomes.netPotentialLoss <= metrics.potentialLoss) {
      throw new Error(`${testCase.name}: la pérdida neta debería incorporar costes.`);
    }

    const serializedJson = RiskCore.serializeTradePlanJson(plan);
    const serializedCsv = RiskCore.serializeTradePlanCsv(plan);

    if (!serializedJson.includes("\"contractType\":")) {
      throw new Error(`${testCase.name}: JSON sin contractType.`);
    }

    if (!serializedCsv.startsWith(RiskCore.tradePlanCsvHeaders().join(","))) {
      throw new Error(`${testCase.name}: CSV sin cabecera canónica.`);
    }

    const handoff = RiskCore.createQuantLabHandoff(plan, {
      handoffId: `${testCase.name}-handoff`,
    });

    if (handoff.machineContract.contractType !== RiskCore.QUANTLAB_HANDOFF_CONTRACT_TYPE) {
      throw new Error(`${testCase.name}: handoff contractType inesperado.`);
    }

    if (handoff.quantlabHints.readyForDraftExecutionIntent !== false) {
      throw new Error(`${testCase.name}: el handoff no debería quedar listo sin contexto.`);
    }

    const serializedHandoff = RiskCore.serializeQuantLabHandoffJson(handoff);
    if (!serializedHandoff.includes("\"pretradeContext\"")) {
      throw new Error(`${testCase.name}: handoff JSON sin pretradeContext.`);
    }
  });

  console.log(`JS tests ok: ${cases.length} casos verificados con trade plan.`);
}

run();
