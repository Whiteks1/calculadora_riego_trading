const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const CLI_PATH = path.join(__dirname, "..", "cli", "trade-plan.js");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function run() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trade-plan-cli-"));
  const inputPath = path.join(tempRoot, "request.json");
  const jsonOut = path.join(tempRoot, "artifacts", "trade_plan.json");
  const csvOut = path.join(tempRoot, "artifacts", "trade_plan.csv");

  fs.writeFileSync(
    inputPath,
    JSON.stringify(
      {
        capital: 1000,
        risk_percent: 1,
        entry_price: 2000,
        stop_loss: 1950,
        exit_price: 2100,
        fee_percent: 0.1,
        slippage_percent: 0.05,
        strategy_name: "CLI test",
        trade_notes: "Deterministic headless check",
      },
      null,
      2,
    ),
    "utf8",
  );

  const stdout = execFileSync(
    process.execPath,
    [
      CLI_PATH,
      "--input-file",
      inputPath,
      "--generated-at",
      "2026-03-27T12:00:00.000Z",
      "--plan-id",
      "cli-case-001",
      "--planner",
      "cli-test-runner",
      "--json-out",
      jsonOut,
      "--csv-out",
      csvOut,
    ],
    { encoding: "utf8" },
  );

  const outputPlan = JSON.parse(stdout);
  const savedPlan = readJson(jsonOut);
  const savedCsv = fs.readFileSync(csvOut, "utf8");

  if (outputPlan.planId !== "cli-case-001") {
    throw new Error(`planId inesperado: ${outputPlan.planId}`);
  }

  if (savedPlan.contractType !== "calculadora_riesgo.trade_plan") {
    throw new Error(`contractType inesperado: ${savedPlan.contractType}`);
  }

  if (!savedCsv.startsWith("contract_type,contract_version,planner")) {
    throw new Error("CSV sin cabecera canónica.");
  }

  const invalid = spawnSync(
    process.execPath,
    [
      CLI_PATH,
      "--capital",
      "1000",
      "--risk-percent",
      "1",
      "--entry-price",
      "2000",
      "--stop-loss",
      "2000",
      "--exit-price",
      "2100",
    ],
    { encoding: "utf8" },
  );

  if (invalid.status === 0) {
    throw new Error("La CLI debería fallar con un stop inválido.");
  }

  if (!invalid.stderr.includes("trade-plan CLI error:")) {
    throw new Error("La CLI no reportó un error legible.");
  }

  console.log("CLI tests ok: generación headless y errores validados.");
}

run();
