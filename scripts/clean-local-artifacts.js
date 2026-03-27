const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const targets = [
  "neuronetworksbook.pdf",
  "risk_case_runner.exe",
  "risk_engine_suite.exe",
  "risk_engine_tests.exe",
  "trade_plan_runner.exe",
  "trading_risk_calculator.exe",
  "trading_risk_calculator_app.exe",
  "trading_risk_calculator_check.exe",
  "cpp/build",
  "escenarios_cpp.csv",
];

let removedCount = 0;

targets.forEach((target) => {
  const absolutePath = path.join(repoRoot, target);

  if (!fs.existsSync(absolutePath)) {
    return;
  }

  fs.rmSync(absolutePath, {
    recursive: true,
    force: true,
  });
  removedCount += 1;
  console.log(`Removed ${target}`);
});

if (removedCount === 0) {
  console.log("No local artifacts found.");
}
