#include "risk_engine.h"

#include <cctype>
#include <cmath>
#include <iomanip>
#include <sstream>
#include <stdexcept>

namespace {
constexpr const char* kContractType = "calculadora_riesgo.trade_plan";
constexpr const char* kContractVersion = "1.0";

std::string sanitizeIdentifierPart(const std::string& value) {
  std::string result;
  result.reserve(value.size());

  for (char character : value) {
    const bool isAlphaNumeric =
        (character >= 'a' && character <= 'z') ||
        (character >= 'A' && character <= 'Z') ||
        (character >= '0' && character <= '9');

    if (isAlphaNumeric) {
      result.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(character))));
    } else if (result.empty() || result.back() != '-') {
      result.push_back('-');
    }
  }

  while (!result.empty() && result.front() == '-') {
    result.erase(result.begin());
  }

  while (!result.empty() && result.back() == '-') {
    result.pop_back();
  }

  if (result.empty()) {
    return "trade-plan";
  }

  if (result.size() > 48) {
    result.resize(48);
  }

  return result;
}

std::string formatNumber(double value, int precision = 6) {
  std::ostringstream stream;
  stream << std::fixed << std::setprecision(precision) << value;
  return stream.str();
}

std::string escapeJson(const std::string& value) {
  std::string escaped;
  escaped.reserve(value.size());

  for (char character : value) {
    switch (character) {
      case '\\':
        escaped += "\\\\";
        break;
      case '"':
        escaped += "\\\"";
        break;
      case '\n':
        escaped += "\\n";
        break;
      case '\r':
        escaped += "\\r";
        break;
      case '\t':
        escaped += "\\t";
        break;
      default:
        escaped += character;
        break;
    }
  }

  return escaped;
}

std::string escapeCsv(const std::string& value) {
  if (value.find_first_of(",\"\n") == std::string::npos) {
    return value;
  }

  std::string escaped = "\"";
  for (char character : value) {
    if (character == '"') {
      escaped += "\"\"";
    } else {
      escaped += character;
    }
  }
  escaped += "\"";
  return escaped;
}
}  // namespace

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

  if (input.feePercent < 0.0 || input.feePercent > 100.0) {
    throw std::invalid_argument("Las fees deben estar entre 0 y 100.");
  }

  if (input.slippagePercent < 0.0 || input.slippagePercent > 100.0) {
    throw std::invalid_argument("El slippage debe estar entre 0 y 100.");
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

TradeCosts calculateTradeCosts(const TradeInput& input, const TradeMetrics& metrics) {
  TradeCosts costs;
  const double feeRate = input.feePercent / 100.0;
  const double slippageRate = input.slippagePercent / 100.0;

  costs.feePercent = input.feePercent;
  costs.slippagePercent = input.slippagePercent;
  costs.estimatedEntryFees = metrics.notionalValue * feeRate;
  costs.estimatedExitFees = metrics.notionalValue * feeRate;
  costs.estimatedEntrySlippage = metrics.notionalValue * slippageRate;
  costs.estimatedExitSlippage = metrics.notionalValue * slippageRate;
  costs.estimatedRoundTripCosts = costs.estimatedEntryFees + costs.estimatedExitFees
      + costs.estimatedEntrySlippage + costs.estimatedExitSlippage;
  costs.netPotentialLoss = metrics.potentialLoss + costs.estimatedRoundTripCosts;
  costs.netPotentialProfit = metrics.potentialProfit - costs.estimatedRoundTripCosts;
  costs.netRrRatio = costs.netPotentialLoss == 0.0 ? 0.0 : costs.netPotentialProfit / costs.netPotentialLoss;

  return costs;
}

TradePlan createTradePlan(
    const TradeInput& input,
    const std::string& generatedAt,
    const std::string& planId,
    const std::string& planner) {
  validateTradeInput(input);

  const TradeMetrics metrics = calculateRisk(input);
  const TradeCosts costs = calculateTradeCosts(input, metrics);
  const std::string resolvedGeneratedAt = generatedAt.empty() ? "1970-01-01T00:00:00Z" : generatedAt;
  const std::string strategyLabel = input.strategy.empty() ? "sin-estrategia" : input.strategy;

  TradePlan plan;
  plan.contractType = kContractType;
  plan.contractVersion = kContractVersion;
  plan.planner = planner.empty() ? "calculadora_riego_trading" : planner;
  plan.planId = planId.empty()
      ? sanitizeIdentifierPart(strategyLabel) + "-" + resolvedGeneratedAt
      : planId;
  plan.generatedAt = resolvedGeneratedAt;
  plan.input = input;
  plan.metrics = metrics;
  plan.costs = costs;

  return plan;
}

std::string tradePlanToJson(const TradePlan& plan) {
  std::ostringstream stream;
  stream << "{\n"
         << "  \"contractType\": \"" << escapeJson(plan.contractType) << "\",\n"
         << "  \"contractVersion\": \"" << escapeJson(plan.contractVersion) << "\",\n"
         << "  \"planner\": \"" << escapeJson(plan.planner) << "\",\n"
         << "  \"planId\": \"" << escapeJson(plan.planId) << "\",\n"
         << "  \"generatedAt\": \"" << escapeJson(plan.generatedAt) << "\",\n"
         << "  \"input\": {\n"
         << "    \"capital\": " << formatNumber(plan.input.capital) << ",\n"
         << "    \"riskPercent\": " << formatNumber(plan.input.riskPercent) << ",\n"
         << "    \"entryPrice\": " << formatNumber(plan.input.entryPrice) << ",\n"
         << "    \"stopLoss\": " << formatNumber(plan.input.stopLoss) << ",\n"
         << "    \"exitPrice\": " << formatNumber(plan.input.exitPrice) << ",\n"
         << "    \"feePercent\": " << formatNumber(plan.input.feePercent) << ",\n"
         << "    \"slippagePercent\": " << formatNumber(plan.input.slippagePercent) << ",\n"
         << "    \"strategyName\": \"" << escapeJson(plan.input.strategy) << "\",\n"
         << "    \"tradeNotes\": \"" << escapeJson(plan.input.notes) << "\"\n"
         << "  },\n"
         << "  \"metrics\": {\n"
         << "    \"tradeType\": \"" << escapeJson(plan.metrics.tradeType) << "\",\n"
         << "    \"riskAmount\": " << formatNumber(plan.metrics.riskAmount) << ",\n"
         << "    \"stopDistance\": " << formatNumber(plan.metrics.stopDistance) << ",\n"
         << "    \"targetDistance\": " << formatNumber(plan.metrics.targetDistance) << ",\n"
         << "    \"positionSize\": " << formatNumber(plan.metrics.positionSize) << ",\n"
         << "    \"potentialLoss\": " << formatNumber(plan.metrics.potentialLoss) << ",\n"
         << "    \"potentialProfit\": " << formatNumber(plan.metrics.potentialProfit) << ",\n"
         << "    \"rrRatio\": " << formatNumber(plan.metrics.rrRatio) << ",\n"
         << "    \"notionalValue\": " << formatNumber(plan.metrics.notionalValue) << ",\n"
         << "    \"expectedTargetDirection\": "
         << (plan.metrics.expectedTargetDirection ? "true" : "false") << "\n"
         << "  },\n"
         << "  \"costs\": {\n"
         << "    \"feePercent\": " << formatNumber(plan.costs.feePercent) << ",\n"
         << "    \"slippagePercent\": " << formatNumber(plan.costs.slippagePercent) << ",\n"
         << "    \"estimatedEntryFees\": " << formatNumber(plan.costs.estimatedEntryFees) << ",\n"
         << "    \"estimatedExitFees\": " << formatNumber(plan.costs.estimatedExitFees) << ",\n"
         << "    \"estimatedEntrySlippage\": " << formatNumber(plan.costs.estimatedEntrySlippage) << ",\n"
         << "    \"estimatedExitSlippage\": " << formatNumber(plan.costs.estimatedExitSlippage) << ",\n"
         << "    \"estimatedRoundTripCosts\": " << formatNumber(plan.costs.estimatedRoundTripCosts) << "\n"
         << "  },\n"
         << "  \"outcomes\": {\n"
         << "    \"netPotentialLoss\": " << formatNumber(plan.costs.netPotentialLoss) << ",\n"
         << "    \"netPotentialProfit\": " << formatNumber(plan.costs.netPotentialProfit) << ",\n"
         << "    \"netRrRatio\": " << formatNumber(plan.costs.netRrRatio) << "\n"
         << "  }\n"
         << "}\n";

  return stream.str();
}

std::string tradePlanCsvHeader() {
  return "contract_type,contract_version,planner,plan_id,generated_at,strategy,notes,trade_type,capital,"
         "risk_percent,entry_price,stop_loss,exit_price,fee_percent,slippage_percent,risk_amount,"
         "stop_distance,target_distance,position_size,potential_loss,potential_profit,rr_ratio,"
         "notional_value,estimated_entry_fees,estimated_exit_fees,estimated_entry_slippage,"
         "estimated_exit_slippage,estimated_round_trip_costs,net_potential_loss,net_potential_profit,"
         "net_rr_ratio,expected_target_direction";
}

std::string tradePlanToCsvRow(const TradePlan& plan) {
  std::ostringstream stream;
  stream << escapeCsv(plan.contractType) << ','
         << escapeCsv(plan.contractVersion) << ','
         << escapeCsv(plan.planner) << ','
         << escapeCsv(plan.planId) << ','
         << escapeCsv(plan.generatedAt) << ','
         << escapeCsv(plan.input.strategy) << ','
         << escapeCsv(plan.input.notes) << ','
         << escapeCsv(plan.metrics.tradeType) << ','
         << formatNumber(plan.input.capital) << ','
         << formatNumber(plan.input.riskPercent) << ','
         << formatNumber(plan.input.entryPrice) << ','
         << formatNumber(plan.input.stopLoss) << ','
         << formatNumber(plan.input.exitPrice) << ','
         << formatNumber(plan.input.feePercent) << ','
         << formatNumber(plan.input.slippagePercent) << ','
         << formatNumber(plan.metrics.riskAmount) << ','
         << formatNumber(plan.metrics.stopDistance) << ','
         << formatNumber(plan.metrics.targetDistance) << ','
         << formatNumber(plan.metrics.positionSize) << ','
         << formatNumber(plan.metrics.potentialLoss) << ','
         << formatNumber(plan.metrics.potentialProfit) << ','
         << formatNumber(plan.metrics.rrRatio) << ','
         << formatNumber(plan.metrics.notionalValue) << ','
         << formatNumber(plan.costs.estimatedEntryFees) << ','
         << formatNumber(plan.costs.estimatedExitFees) << ','
         << formatNumber(plan.costs.estimatedEntrySlippage) << ','
         << formatNumber(plan.costs.estimatedExitSlippage) << ','
         << formatNumber(plan.costs.estimatedRoundTripCosts) << ','
         << formatNumber(plan.costs.netPotentialLoss) << ','
         << formatNumber(plan.costs.netPotentialProfit) << ','
         << formatNumber(plan.costs.netRrRatio) << ','
         << (plan.metrics.expectedTargetDirection ? "true" : "false");

  return stream.str();
}
