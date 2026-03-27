const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
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
  const runnerPath = path.join(__dirname, "..", "trade_plan_runner.exe");

  if (!fs.existsSync(runnerPath)) {
    throw new Error("No existe trade_plan_runner.exe. Compílalo antes de ejecutar este test.");
  }

  cases.forEach((testCase) => {
    const values = {
      capital: Number(testCase.capital),
      riskPercent: Number(testCase.riskPercent),
      entryPrice: Number(testCase.entryPrice),
      stopLoss: Number(testCase.stopLoss),
      exitPrice: Number(testCase.exitPrice),
      feePercent: 0.1,
      slippagePercent: 0.05,
      strategyName: "CLI parity",
      tradeNotes: "trade-plan-runner",
    };

    const jsPlan = RiskCore.createTradePlan(values, {
      generatedAt: "2026-03-27T12:00:00Z",
      planId: `${testCase.name}-cpp`,
      planner: "calculadora_riego_trading_cpp",
    });

    const cppPlanRaw = execFileSync(
      runnerPath,
      [
        String(values.capital),
        String(values.riskPercent),
        String(values.entryPrice),
        String(values.stopLoss),
        String(values.exitPrice),
        String(values.feePercent),
        String(values.slippagePercent),
        "2026-03-27T12:00:00Z",
        `${testCase.name}-cpp`,
      ],
      { encoding: "utf8" },
    );

    const cppPlan = JSON.parse(cppPlanRaw);

    if (cppPlan.contractType !== jsPlan.contractType) {
      throw new Error(`${testCase.name}: contractType JS/C++ distinto.`);
    }

    if (cppPlan.planId !== jsPlan.planId) {
      throw new Error(`${testCase.name}: planId JS/C++ distinto.`);
    }

    if (cppPlan.metrics.tradeType !== jsPlan.metrics.tradeType) {
      throw new Error(`${testCase.name}: tradeType JS/C++ distinto.`);
    }

    assertClose(cppPlan.metrics.positionSize, jsPlan.metrics.positionSize, `${testCase.name} positionSize JS/C++`);
    assertClose(
      cppPlan.costs.estimatedRoundTripCosts,
      jsPlan.costs.estimatedRoundTripCosts,
      `${testCase.name} estimatedRoundTripCosts JS/C++`,
    );
    assertClose(
      cppPlan.outcomes.netPotentialProfit,
      jsPlan.outcomes.netPotentialProfit,
      `${testCase.name} netPotentialProfit JS/C++`,
    );
    assertClose(cppPlan.outcomes.netRrRatio, jsPlan.outcomes.netRrRatio, `${testCase.name} netRrRatio JS/C++`);
  });

  console.log(`Trade plan cross tests ok: ${cases.length} casos verificados entre JS y C++.`);
}

run();
