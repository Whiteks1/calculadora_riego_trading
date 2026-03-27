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

function main() {
  const fixturePath = path.join(__dirname, "risk_cases.csv");
  const cases = parseCases(fs.readFileSync(fixturePath, "utf8"));
  const runnerPath = path.join(__dirname, "..", "risk_case_runner.exe");

  if (!fs.existsSync(runnerPath)) {
    throw new Error("No existe risk_case_runner.exe. Compílalo antes de ejecutar este test.");
  }

  cases.forEach((testCase) => {
    const values = {
      capital: Number(testCase.capital),
      riskPercent: Number(testCase.riskPercent),
      entryPrice: Number(testCase.entryPrice),
      stopLoss: Number(testCase.stopLoss),
      exitPrice: Number(testCase.exitPrice),
    };

    const jsMetrics = RiskCore.calculateRiskMetrics(values);
    const rawCpp = execFileSync(
      runnerPath,
      [
        String(values.capital),
        String(values.riskPercent),
        String(values.entryPrice),
        String(values.stopLoss),
        String(values.exitPrice),
      ],
      { encoding: "utf8" },
    ).trim();

    const [
      tradeType,
      riskAmount,
      stopDistance,
      targetDistance,
      positionSize,
      potentialLoss,
      potentialProfit,
      rrRatio,
      notionalValue,
    ] = rawCpp.split("|");

    if (tradeType !== jsMetrics.tradeType) {
      throw new Error(`${testCase.name}: tradeType JS/C++ distinto.`);
    }

    assertClose(Number(riskAmount), jsMetrics.riskAmount, `${testCase.name} riskAmount JS/C++`);
    assertClose(Number(stopDistance), jsMetrics.stopDistance, `${testCase.name} stopDistance JS/C++`);
    assertClose(Number(targetDistance), jsMetrics.targetDistance, `${testCase.name} targetDistance JS/C++`);
    assertClose(Number(positionSize), jsMetrics.positionSize, `${testCase.name} positionSize JS/C++`);
    assertClose(Number(potentialLoss), jsMetrics.potentialLoss, `${testCase.name} potentialLoss JS/C++`);
    assertClose(Number(potentialProfit), jsMetrics.potentialProfit, `${testCase.name} potentialProfit JS/C++`);
    assertClose(Number(rrRatio), jsMetrics.rrRatio, `${testCase.name} rrRatio JS/C++`);
    assertClose(Number(notionalValue), jsMetrics.notionalValue, `${testCase.name} notionalValue JS/C++`);
  });

  console.log(`Cross tests ok: ${cases.length} casos verificados entre JS y C++.`);
}

main();
