#include "risk_engine.h"

#include <iostream>
#include <stdexcept>
#include <string>

int main(int argc, char* argv[]) {
  try {
    if (argc != 10) {
      throw std::runtime_error(
          "Uso: trade_plan_runner <capital> <riskPercent> <entry> <stop> <exit> <feePercent> <slippagePercent> <generatedAt> <planId>");
    }

    TradeInput input;
    input.capital = std::stod(argv[1]);
    input.riskPercent = std::stod(argv[2]);
    input.entryPrice = std::stod(argv[3]);
    input.stopLoss = std::stod(argv[4]);
    input.exitPrice = std::stod(argv[5]);
    input.feePercent = std::stod(argv[6]);
    input.slippagePercent = std::stod(argv[7]);
    input.strategy = "CLI parity";
    input.notes = "trade-plan-runner";

    const TradePlan plan = createTradePlan(input, argv[8], argv[9], "calculadora_riego_trading_cpp");
    std::cout << tradePlanToJson(plan);
  } catch (const std::exception& error) {
    std::cerr << error.what() << '\n';
    return 1;
  }

  return 0;
}
