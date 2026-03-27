#include "risk_engine.h"

#include <cmath>
#include <stdexcept>

std::string detectTradeType(double entryPrice, double stopLoss) {
  return stopLoss < entryPrice ? "LONG" : "SHORT";
}

void validateTradeInput(const TradeInput& input) {
  if (input.capital <= 0.0) {
    throw std::invalid_argument("El capital debe ser mayor que 0.");
  }

  if (input.riskPercent <= 0.0 || input.riskPercent > 100.0) {
    throw std::invalid_argument("El porcentaje de riesgo debe estar entre 0 y 100.");
  }

  if (input.entryPrice <= 0.0 || input.stopLoss <= 0.0 || input.exitPrice <= 0.0) {
    throw std::invalid_argument("Los precios deben ser mayores que 0.");
  }

  if (input.entryPrice == input.stopLoss) {
    throw std::invalid_argument("La entrada y el stop loss no pueden ser iguales.");
  }

  if (input.entryPrice == input.exitPrice) {
    throw std::invalid_argument("La entrada y el objetivo no pueden ser iguales.");
  }

  const std::string tradeType = detectTradeType(input.entryPrice, input.stopLoss);

  if (tradeType == "LONG" && input.exitPrice <= input.entryPrice) {
    throw std::invalid_argument("En una operacion LONG el objetivo debe quedar por encima de la entrada.");
  }

  if (tradeType == "SHORT" && input.exitPrice >= input.entryPrice) {
    throw std::invalid_argument("En una operacion SHORT el objetivo debe quedar por debajo de la entrada.");
  }
}

TradeMetrics calculateRisk(const TradeInput& input) {
  validateTradeInput(input);

  TradeMetrics metrics;
  metrics.tradeType = detectTradeType(input.entryPrice, input.stopLoss);
  metrics.riskAmount = input.capital * (input.riskPercent / 100.0);
  metrics.stopDistance = std::abs(input.entryPrice - input.stopLoss);
  metrics.targetDistance = std::abs(input.exitPrice - input.entryPrice);
  metrics.positionSize = metrics.riskAmount / metrics.stopDistance;
  metrics.potentialLoss = metrics.positionSize * metrics.stopDistance;
  metrics.potentialProfit = metrics.positionSize * metrics.targetDistance;
  metrics.rrRatio = metrics.potentialLoss == 0.0 ? 0.0 : metrics.potentialProfit / metrics.potentialLoss;
  metrics.notionalValue = metrics.positionSize * input.entryPrice;
  metrics.expectedTargetDirection =
      metrics.tradeType == "LONG" ? input.exitPrice > input.entryPrice : input.exitPrice < input.entryPrice;

  return metrics;
}
