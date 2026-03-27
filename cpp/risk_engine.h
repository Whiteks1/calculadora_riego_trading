#pragma once

#include <string>

struct TradeInput {
  double capital {};
  double riskPercent {};
  double entryPrice {};
  double stopLoss {};
  double exitPrice {};
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

std::string detectTradeType(double entryPrice, double stopLoss);
void validateTradeInput(const TradeInput& input);
TradeMetrics calculateRisk(const TradeInput& input);
