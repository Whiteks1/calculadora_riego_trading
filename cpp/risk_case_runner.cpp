#include "risk_engine.h"

#include <iomanip>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>

std::string formatNumber(double value, int precision = 6) {
  std::ostringstream stream;
  stream << std::fixed << std::setprecision(precision) << value;
  return stream.str();
}

int main(int argc, char* argv[]) {
  try {
    if (argc != 6 && argc != 8) {
      throw std::runtime_error(
          "Uso: risk_case_runner <capital> <riskPercent> <entry> <stop> <exit> [feePercent slippagePercent]");
    }

    TradeInput input;
    input.capital = std::stod(argv[1]);
    input.riskPercent = std::stod(argv[2]);
    input.entryPrice = std::stod(argv[3]);
    input.stopLoss = std::stod(argv[4]);
    input.exitPrice = std::stod(argv[5]);
    if (argc == 8) {
      input.feePercent = std::stod(argv[6]);
      input.slippagePercent = std::stod(argv[7]);
    }

    const TradeMetrics metrics = calculateRisk(input);

    std::cout << metrics.tradeType << '|'
              << formatNumber(metrics.riskAmount) << '|'
              << formatNumber(metrics.stopDistance) << '|'
              << formatNumber(metrics.targetDistance) << '|'
              << formatNumber(metrics.positionSize) << '|'
              << formatNumber(metrics.potentialLoss) << '|'
              << formatNumber(metrics.potentialProfit) << '|'
              << formatNumber(metrics.rrRatio) << '|'
              << formatNumber(metrics.notionalValue) << '\n';
  } catch (const std::exception& error) {
    std::cerr << error.what() << '\n';
    return 1;
  }

  return 0;
}
