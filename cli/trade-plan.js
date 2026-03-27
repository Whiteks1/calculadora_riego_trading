#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const RiskCore = require(path.join(__dirname, "..", "risk-core.js"));

function printHelp() {
  console.log(`trade-plan CLI

Usage:
  node cli/trade-plan.js --input-file <request.json> [--json-out <file>] [--csv-out <file>]
  node cli/trade-plan.js --capital 1000 --risk-percent 1 --entry-price 2000 --stop-loss 1950 --exit-price 2100 [options]

Options:
  --input-file <path>         Read trade input from JSON file.
  --json-out <path>           Write canonical trade plan JSON to file.
  --csv-out <path>            Write canonical trade plan CSV to file.
  --quantlab-handoff-out <path>
                              Write a bounded QuantLab handoff JSON artifact.
  --stdout-format <format>    One of: trade-plan, quantlab-handoff.
  --generated-at <iso>        Override generatedAt for deterministic output.
  --plan-id <id>              Override planId.
  --handoff-id <id>           Override handoffId for QuantLab handoff export.
  --planner <name>            Override planner name.
  --capital <value>
  --risk-percent <value>
  --entry-price <value>
  --stop-loss <value>
  --exit-price <value>
  --fee-percent <value>
  --slippage-percent <value>
  --symbol <value>
  --venue <value>
  --side <value>              buy, sell, long, short.
  --account-id <value>
  --strategy-id <value>
  --strategy-name <text>
  --trade-notes <text>
  --help                      Show this message.

Notes:
  - JSON input may use camelCase or snake_case keys.
  - The canonical trade plan JSON is always printed to stdout.
  - Validation errors are printed to stderr and exit with code 1.
`);
}

function parseArgs(argv) {
  const parsed = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      parsed._.push(token);
      continue;
    }

    const key = token.slice(2);
    if (key === "help") {
      parsed.help = true;
      continue;
    }

    const nextValue = argv[index + 1];
    if (nextValue === undefined || nextValue.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    parsed[key] = nextValue;
    index += 1;
  }

  return parsed;
}

function readInputPayload(args) {
  if (args["input-file"]) {
    const inputPath = path.resolve(process.cwd(), args["input-file"]);
    const rawText = fs.readFileSync(inputPath, "utf8");
    return JSON.parse(rawText);
  }

  return {
    capital: args.capital,
    risk_percent: args["risk-percent"],
    entry_price: args["entry-price"],
    stop_loss: args["stop-loss"],
    exit_price: args["exit-price"],
    fee_percent: args["fee-percent"],
    slippage_percent: args["slippage-percent"],
    symbol: args.symbol,
    venue: args.venue,
    side: args.side,
    account_id: args["account-id"],
    strategy_id: args["strategy-id"],
    strategy_name: args["strategy-name"],
    trade_notes: args["trade-notes"],
  };
}

function normalizeInput(raw) {
  return {
    capital: raw.capital,
    riskPercent: raw.riskPercent ?? raw.risk_percent,
    entryPrice: raw.entryPrice ?? raw.entry_price,
    stopLoss: raw.stopLoss ?? raw.stop_loss,
    exitPrice: raw.exitPrice ?? raw.exit_price,
    feePercent: raw.feePercent ?? raw.fee_percent ?? 0,
    slippagePercent: raw.slippagePercent ?? raw.slippage_percent ?? 0,
    symbol: raw.symbol,
    venue: raw.venue,
    side: raw.side,
    accountId: raw.accountId ?? raw.account_id,
    strategyId: raw.strategyId ?? raw.strategy_id,
    strategyName: raw.strategyName ?? raw.strategy_name ?? "",
    tradeNotes: raw.tradeNotes ?? raw.trade_notes ?? raw.notes ?? "",
  };
}

function ensureParentDir(filePath) {
  const parent = path.dirname(filePath);
  fs.mkdirSync(parent, { recursive: true });
}

function writeOutputs(plan, handoff, args) {
  if (args["json-out"]) {
    const jsonPath = path.resolve(process.cwd(), args["json-out"]);
    ensureParentDir(jsonPath);
    fs.writeFileSync(jsonPath, RiskCore.serializeTradePlanJson(plan), "utf8");
  }

  if (args["csv-out"]) {
    const csvPath = path.resolve(process.cwd(), args["csv-out"]);
    ensureParentDir(csvPath);
    fs.writeFileSync(csvPath, RiskCore.serializeTradePlanCsv(plan), "utf8");
  }

  if (args["quantlab-handoff-out"]) {
    const handoffPath = path.resolve(process.cwd(), args["quantlab-handoff-out"]);
    ensureParentDir(handoffPath);
    fs.writeFileSync(handoffPath, RiskCore.serializeQuantLabHandoffJson(handoff), "utf8");
  }
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));

    if (args.help) {
      printHelp();
      return;
    }

    const input = normalizeInput(readInputPayload(args));
    const plan = RiskCore.createTradePlan(input, {
      generatedAt: args["generated-at"],
      planId: args["plan-id"],
      planner: args.planner,
    });
    const handoff = RiskCore.createQuantLabHandoff(plan, {
      generatedAt: args["generated-at"],
      handoffId: args["handoff-id"],
    });

    writeOutputs(plan, handoff, args);

    const stdoutFormat = args["stdout-format"] || "trade-plan";
    if (stdoutFormat === "trade-plan") {
      process.stdout.write(RiskCore.serializeTradePlanJson(plan));
      return;
    }

    if (stdoutFormat === "quantlab-handoff") {
      process.stdout.write(RiskCore.serializeQuantLabHandoffJson(handoff));
      return;
    }

    throw new Error(`Unsupported stdout format: ${stdoutFormat}`);
  } catch (error) {
    process.stderr.write(`trade-plan CLI error: ${error.message}\n`);
    process.exitCode = 1;
  }
}

main();
