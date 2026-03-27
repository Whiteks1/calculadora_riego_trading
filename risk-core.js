(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.RiskCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function resolveTradeType(entryPrice, stopLoss) {
    return stopLoss < entryPrice ? "LONG" : "SHORT";
  }

  function validateTradeValues(values) {
    const requiredFields = [
      ["capital", "Introduce un capital mayor que 0."],
      ["riskPercent", "Introduce un porcentaje de riesgo mayor que 0."],
      ["entryPrice", "Introduce un precio de entrada válido."],
      ["stopLoss", "Introduce un stop loss válido."],
      ["exitPrice", "Introduce un precio objetivo válido."],
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

    const tradeType = resolveTradeType(values.entryPrice, values.stopLoss);

    if (tradeType === "LONG" && values.exitPrice <= values.entryPrice) {
      return "En una operación LONG el objetivo debe quedar por encima de la entrada.";
    }

    if (tradeType === "SHORT" && values.exitPrice >= values.entryPrice) {
      return "En una operación SHORT el objetivo debe quedar por debajo de la entrada.";
    }

    return "";
  }

  function calculateRiskMetrics(values) {
    const tradeType = resolveTradeType(values.entryPrice, values.stopLoss);
    const riskAmount = values.capital * (values.riskPercent / 100);
    const stopDistance = Math.abs(values.entryPrice - values.stopLoss);
    const targetDistance = Math.abs(values.exitPrice - values.entryPrice);
    const positionSize = riskAmount / stopDistance;
    const potentialLoss = positionSize * stopDistance;
    const potentialProfit = positionSize * targetDistance;
    const rrRatio = potentialProfit / potentialLoss;
    const notionalValue = positionSize * values.entryPrice;

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
        ? values.exitPrice > values.entryPrice
        : values.exitPrice < values.entryPrice,
    };
  }

  return {
    resolveTradeType,
    validateTradeValues,
    calculateRiskMetrics,
  };
});
