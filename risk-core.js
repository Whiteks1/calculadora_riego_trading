(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.RiskCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const CONTRACT_TYPE = "calculadora_riesgo.trade_plan";
  const CONTRACT_VERSION = "1.0";
  const DEFAULT_PLANNER = "calculadora_riego_trading";

  function normalizeNumber(value, defaultValue = 0) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : defaultValue;
  }

  function normalizeText(value, defaultValue = "") {
    return typeof value === "string" ? value.trim() : defaultValue;
  }

  function normalizeTradeInput(values) {
    return {
      capital: normalizeNumber(values.capital),
      riskPercent: normalizeNumber(values.riskPercent),
      entryPrice: normalizeNumber(values.entryPrice),
      stopLoss: normalizeNumber(values.stopLoss),
      exitPrice: normalizeNumber(values.exitPrice),
      feePercent: normalizeNumber(values.feePercent, 0),
      slippagePercent: normalizeNumber(values.slippagePercent, 0),
      strategyName: normalizeText(values.strategyName),
      tradeNotes: normalizeText(values.tradeNotes),
    };
  }

  function resolveTradeType(entryPrice, stopLoss) {
    return stopLoss < entryPrice ? "LONG" : "SHORT";
  }

  function validateTradeValues(values) {
    const normalizedValues = normalizeTradeInput(values);
    const requiredFields = [
      ["capital", "Introduce un capital mayor que 0."],
      ["riskPercent", "Introduce un porcentaje de riesgo mayor que 0."],
      ["entryPrice", "Introduce un precio de entrada válido."],
      ["stopLoss", "Introduce un stop loss válido."],
      ["exitPrice", "Introduce un precio objetivo válido."],
    ];

    for (const [key, message] of requiredFields) {
      if (!Number.isFinite(normalizedValues[key]) || normalizedValues[key] <= 0) {
        return message;
      }
    }

    if (normalizedValues.riskPercent > 100) {
      return "El porcentaje de riesgo no puede ser mayor que 100%.";
    }

    if (!Number.isFinite(normalizedValues.feePercent) || normalizedValues.feePercent < 0 || normalizedValues.feePercent > 100) {
      return "Las fees deben estar entre 0 y 100%.";
    }

    if (
      !Number.isFinite(normalizedValues.slippagePercent)
      || normalizedValues.slippagePercent < 0
      || normalizedValues.slippagePercent > 100
    ) {
      return "El slippage debe estar entre 0 y 100%.";
    }

    if (normalizedValues.entryPrice === normalizedValues.stopLoss) {
      return "El precio de entrada y el stop loss no pueden ser iguales.";
    }

    if (normalizedValues.entryPrice === normalizedValues.exitPrice) {
      return "El precio de entrada y el precio objetivo no pueden ser iguales.";
    }

    const tradeType = resolveTradeType(normalizedValues.entryPrice, normalizedValues.stopLoss);

    if (tradeType === "LONG" && normalizedValues.exitPrice <= normalizedValues.entryPrice) {
      return "En una operación LONG el objetivo debe quedar por encima de la entrada.";
    }

    if (tradeType === "SHORT" && normalizedValues.exitPrice >= normalizedValues.entryPrice) {
      return "En una operación SHORT el objetivo debe quedar por debajo de la entrada.";
    }

    return "";
  }

  function calculateRiskMetrics(values) {
    const normalizedValues = normalizeTradeInput(values);
    const tradeType = resolveTradeType(normalizedValues.entryPrice, normalizedValues.stopLoss);
    const riskAmount = normalizedValues.capital * (normalizedValues.riskPercent / 100);
    const stopDistance = Math.abs(normalizedValues.entryPrice - normalizedValues.stopLoss);
    const targetDistance = Math.abs(normalizedValues.exitPrice - normalizedValues.entryPrice);
    const positionSize = riskAmount / stopDistance;
    const potentialLoss = positionSize * stopDistance;
    const potentialProfit = positionSize * targetDistance;
    const rrRatio = potentialProfit / potentialLoss;
    const notionalValue = positionSize * normalizedValues.entryPrice;

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
      expectedTargetDirection: tradeType === "LONG"
        ? normalizedValues.exitPrice > normalizedValues.entryPrice
        : normalizedValues.exitPrice < normalizedValues.entryPrice,
    };
  }

  function calculateTradeCosts(values, metrics) {
    const normalizedValues = normalizeTradeInput(values);
    const feeRate = normalizedValues.feePercent / 100;
    const slippageRate = normalizedValues.slippagePercent / 100;
    const estimatedEntryFees = metrics.notionalValue * feeRate;
    const estimatedExitFees = metrics.notionalValue * feeRate;
    const estimatedEntrySlippage = metrics.notionalValue * slippageRate;
    const estimatedExitSlippage = metrics.notionalValue * slippageRate;
    const estimatedRoundTripCosts =
      estimatedEntryFees
      + estimatedExitFees
      + estimatedEntrySlippage
      + estimatedExitSlippage;
    const netPotentialLoss = metrics.potentialLoss + estimatedRoundTripCosts;
    const netPotentialProfit = metrics.potentialProfit - estimatedRoundTripCosts;
    const netRrRatio = netPotentialLoss === 0 ? 0 : netPotentialProfit / netPotentialLoss;

    return {
      feePercent: normalizedValues.feePercent,
      slippagePercent: normalizedValues.slippagePercent,
      estimatedEntryFees,
      estimatedExitFees,
      estimatedEntrySlippage,
      estimatedExitSlippage,
      estimatedRoundTripCosts,
      netPotentialLoss,
      netPotentialProfit,
      netRrRatio,
    };
  }

  function sanitizeIdentifierPart(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "trade-plan";
  }

  function createTradePlan(values, options = {}) {
    const normalizedValues = normalizeTradeInput(values);
    const validationMessage = validateTradeValues(normalizedValues);

    if (validationMessage) {
      throw new Error(validationMessage);
    }

    const generatedAt = typeof options.generatedAt === "string" && options.generatedAt
      ? options.generatedAt
      : new Date().toISOString();
    const metrics = calculateRiskMetrics(normalizedValues);
    const costs = calculateTradeCosts(normalizedValues, metrics);
    const strategyLabel = normalizedValues.strategyName || "sin-estrategia";
    const planId = typeof options.planId === "string" && options.planId
      ? options.planId
      : `${sanitizeIdentifierPart(strategyLabel)}-${generatedAt.replaceAll(/[:.]/g, "-")}`;

    return {
      contractType: CONTRACT_TYPE,
      contractVersion: CONTRACT_VERSION,
      planner: typeof options.planner === "string" && options.planner ? options.planner : DEFAULT_PLANNER,
      planId,
      generatedAt,
      input: {
        capital: normalizedValues.capital,
        riskPercent: normalizedValues.riskPercent,
        entryPrice: normalizedValues.entryPrice,
        stopLoss: normalizedValues.stopLoss,
        exitPrice: normalizedValues.exitPrice,
        feePercent: normalizedValues.feePercent,
        slippagePercent: normalizedValues.slippagePercent,
        strategyName: normalizedValues.strategyName,
        tradeNotes: normalizedValues.tradeNotes,
      },
      metrics: {
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
      },
      costs: {
        feePercent: costs.feePercent,
        slippagePercent: costs.slippagePercent,
        estimatedEntryFees: costs.estimatedEntryFees,
        estimatedExitFees: costs.estimatedExitFees,
        estimatedEntrySlippage: costs.estimatedEntrySlippage,
        estimatedExitSlippage: costs.estimatedExitSlippage,
        estimatedRoundTripCosts: costs.estimatedRoundTripCosts,
      },
      outcomes: {
        netPotentialLoss: costs.netPotentialLoss,
        netPotentialProfit: costs.netPotentialProfit,
        netRrRatio: costs.netRrRatio,
      },
    };
  }

  function serializeTradePlanJson(tradePlan) {
    return `${JSON.stringify(tradePlan, null, 2)}\n`;
  }

  function tradePlanCsvHeaders() {
    return [
      "contract_type",
      "contract_version",
      "planner",
      "plan_id",
      "generated_at",
      "strategy",
      "notes",
      "trade_type",
      "capital",
      "risk_percent",
      "entry_price",
      "stop_loss",
      "exit_price",
      "fee_percent",
      "slippage_percent",
      "risk_amount",
      "stop_distance",
      "target_distance",
      "position_size",
      "potential_loss",
      "potential_profit",
      "rr_ratio",
      "notional_value",
      "estimated_entry_fees",
      "estimated_exit_fees",
      "estimated_entry_slippage",
      "estimated_exit_slippage",
      "estimated_round_trip_costs",
      "net_potential_loss",
      "net_potential_profit",
      "net_rr_ratio",
      "expected_target_direction",
    ];
  }

  function escapeCsvValue(value) {
    const stringValue = String(value);

    if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
      return `"${stringValue.replaceAll("\"", "\"\"")}"`;
    }

    return stringValue;
  }

  function tradePlanToCsvRow(tradePlan) {
    return [
      tradePlan.contractType,
      tradePlan.contractVersion,
      tradePlan.planner,
      tradePlan.planId,
      tradePlan.generatedAt,
      tradePlan.input.strategyName,
      tradePlan.input.tradeNotes,
      tradePlan.metrics.tradeType,
      tradePlan.input.capital,
      tradePlan.input.riskPercent,
      tradePlan.input.entryPrice,
      tradePlan.input.stopLoss,
      tradePlan.input.exitPrice,
      tradePlan.input.feePercent,
      tradePlan.input.slippagePercent,
      tradePlan.metrics.riskAmount,
      tradePlan.metrics.stopDistance,
      tradePlan.metrics.targetDistance,
      tradePlan.metrics.positionSize,
      tradePlan.metrics.potentialLoss,
      tradePlan.metrics.potentialProfit,
      tradePlan.metrics.rrRatio,
      tradePlan.metrics.notionalValue,
      tradePlan.costs.estimatedEntryFees,
      tradePlan.costs.estimatedExitFees,
      tradePlan.costs.estimatedEntrySlippage,
      tradePlan.costs.estimatedExitSlippage,
      tradePlan.costs.estimatedRoundTripCosts,
      tradePlan.outcomes.netPotentialLoss,
      tradePlan.outcomes.netPotentialProfit,
      tradePlan.outcomes.netRrRatio,
      tradePlan.metrics.expectedTargetDirection,
    ];
  }

  function serializeTradePlanCsv(tradePlan) {
    const headers = tradePlanCsvHeaders();
    const row = tradePlanToCsvRow(tradePlan);

    return [headers, row]
      .map((values) => values.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");
  }

  return {
    CONTRACT_TYPE,
    CONTRACT_VERSION,
    normalizeTradeInput,
    resolveTradeType,
    validateTradeValues,
    calculateRiskMetrics,
    calculateTradeCosts,
    createTradePlan,
    serializeTradePlanJson,
    tradePlanCsvHeaders,
    tradePlanToCsvRow,
    serializeTradePlanCsv,
  };
});
