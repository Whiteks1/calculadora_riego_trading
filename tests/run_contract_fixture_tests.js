const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const CLI_PATH = path.join(__dirname, "..", "cli", "trade-plan.js");
const EXAMPLE_REQUEST_PATH = path.join(__dirname, "..", "examples", "quantlab_handoff_request.json");
const FIXTURES_DIR = path.join(__dirname, "fixtures");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertDeepEqual(actual, expected, label) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`${label}: el fixture canónico no coincide con la salida actual.`);
  }
}

function normalizeText(value) {
  return String(value).replace(/\r\n/g, "\n").trimEnd();
}

function run() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trade-plan-contract-"));
  const jsonOut = path.join(tempRoot, "trade_plan.json");
  const csvOut = path.join(tempRoot, "trade_plan.csv");
  const handoffOut = path.join(tempRoot, "quantlab_handoff.json");

  const stdout = execFileSync(
    process.execPath,
    [
      CLI_PATH,
      "--input-file",
      EXAMPLE_REQUEST_PATH,
      "--generated-at",
      "2026-03-27T12:00:00.000Z",
      "--plan-id",
      "quantlab-example-001",
      "--handoff-id",
      "quantlab-example-001-handoff",
      "--planner",
      "contract-fixture",
      "--json-out",
      jsonOut,
      "--csv-out",
      csvOut,
      "--quantlab-handoff-out",
      handoffOut,
      "--stdout-format",
      "quantlab-handoff",
    ],
    { encoding: "utf8" },
  );

  const expectedPlan = readJson(path.join(FIXTURES_DIR, "expected_trade_plan.json"));
  const expectedHandoff = readJson(path.join(FIXTURES_DIR, "expected_quantlab_handoff.json"));
  const expectedCsv = fs.readFileSync(path.join(FIXTURES_DIR, "expected_trade_plan.csv"), "utf8");

  const actualPlan = readJson(jsonOut);
  const actualHandoff = readJson(handoffOut);
  const actualStdout = JSON.parse(stdout);
  const actualCsv = fs.readFileSync(csvOut, "utf8");

  assertDeepEqual(actualPlan, expectedPlan, "trade_plan.json");
  assertDeepEqual(actualHandoff, expectedHandoff, "quantlab_handoff.json");
  assertDeepEqual(actualStdout, expectedHandoff, "stdout quantlab-handoff");

  if (normalizeText(actualCsv) !== normalizeText(expectedCsv)) {
    throw new Error("trade_plan.csv: el fixture canónico no coincide con la salida actual.");
  }

  console.log("Contract fixture tests ok: artifacts canónicos verificados.");
}

run();
