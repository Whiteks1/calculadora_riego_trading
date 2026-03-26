#include <cmath>
#include <iomanip>
#include <iostream>
#include <limits>
#include <sstream>
#include <stdexcept>
#include <string>

struct TradeInput {
  double capital {};
  double riskPercent {};
  double entryPrice {};
  double stopLoss {};
  double exitPrice {};
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

double readPositiveNumber(const std::string& label) {
  while (true) {
    std::cout << label;

    double value {};
    if (std::cin >> value && value > 0.0) {
      return value;
    }

    std::cout << "Valor invalido. Introduce un numero mayor que 0.\n";
    std::cin.clear();
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
  }
}

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

std::string formatNumber(double value, int precision = 2) {
  std::ostringstream stream;
  stream << std::fixed << std::setprecision(precision) << value;
  return stream.str();
}

int main() {
  std::cout << "Calculadora de riesgo para trading en C++\n";
  std::cout << "Introduce los datos de la operacion.\n\n";

  TradeInput input;
  input.capital = readPositiveNumber("Capital disponible: ");
  input.riskPercent = readPositiveNumber("Riesgo por operacion (%): ");
  input.entryPrice = readPositiveNumber("Precio de entrada: ");
  input.stopLoss = readPositiveNumber("Stop loss: ");
  input.exitPrice = readPositiveNumber("Precio objetivo / salida: ");

  try {
    const TradeMetrics metrics = calculateRisk(input);

    std::cout << "\nResumen de la operacion\n";
    std::cout << "Tipo: " << metrics.tradeType << '\n';
    std::cout << "Riesgo en dinero: EUR " << formatNumber(metrics.riskAmount) << '\n';
    std::cout << "Tamano estimado: " << formatNumber(metrics.positionSize) << " unidades\n";
    std::cout << "Perdida potencial: EUR " << formatNumber(metrics.potentialLoss) << '\n';
    std::cout << "Beneficio potencial: EUR " << formatNumber(metrics.potentialProfit) << '\n';
    std::cout << "Relacion riesgo/beneficio: 1 : " << formatNumber(metrics.rrRatio) << '\n';
    std::cout << "Distancia al stop: " << formatNumber(metrics.stopDistance, 4) << '\n';
    std::cout << "Valor nocional aprox.: EUR " << formatNumber(metrics.notionalValue) << '\n';

    if (metrics.expectedTargetDirection) {
      std::cout << "El objetivo es coherente con la direccion de la operacion.\n";
    } else {
      std::cout << "El objetivo no acompana la direccion del setup.\n";
    }
  } catch (const std::exception& error) {
    std::cerr << "\nError: " << error.what() << '\n';
    return 1;
  }

  return 0;
}
