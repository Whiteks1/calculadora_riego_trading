#pragma once

#include <string>

struct TradeInput {
  double capital {};
  double riskPercent {};
  double entryPrice {};
  double stopLoss {};
  double exitPrice {};
  double feePercent {};
  double slippagePercent {};
  std::string strategy;
  std::string notes;
};

struct TradeMetrics {
  std::string tradeType;
  double riskAmount {};
  double stopDistance {};
  double targetDistance {};
  double positionSize {};
  double potentialLoss {};
  double potentialProfit {};
  double rrRatio {};
  double notionalValue {};
  bool expectedTargetDirection {};
};

struct TradeCosts {
  double feePercent {};
  double slippagePercent {};
  double estimatedEntryFees {};
  double estimatedExitFees {};
  double estimatedEntrySlippage {};
  double estimatedExitSlippage {};
  double estimatedRoundTripCosts {};
  double netPotentialLoss {};
  double netPotentialProfit {};
  double netRrRatio {};
};

struct TradePlan {
  std::string contractType;
  std::string contractVersion;
  std::string planner;
  std::string planId;
  std::string generatedAt;
  TradeInput input;
  TradeMetrics metrics;
  TradeCosts costs;
};

std::string detectTradeType(double entryPrice, double stopLoss);
void validateTradeInput(const TradeInput& input);
TradeMetrics calculateRisk(const TradeInput& input);
TradeCosts calculateTradeCosts(const TradeInput& input, const TradeMetrics& metrics);
TradePlan createTradePlan(
    const TradeInput& input,
    const std::string& generatedAt = "",
    const std::string& planId = "",
    const std::string& planner = "calculadora_riego_trading");
std::string tradePlanToJson(const TradePlan& plan);
std::string tradePlanCsvHeader();
std::string tradePlanToCsvRow(const TradePlan& plan);
