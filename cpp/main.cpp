#include <cmath>
#include <iomanip>
#include <iostream>
#include <limits>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

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

struct ScenarioRecord {
  TradeInput input;
  TradeMetrics metrics;
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

TradeInput readTradeInput() {
  TradeInput input;
  input.capital = readPositiveNumber("Capital disponible: ");
  input.riskPercent = readPositiveNumber("Riesgo por operacion (%): ");
  input.entryPrice = readPositiveNumber("Precio de entrada: ");
  input.stopLoss = readPositiveNumber("Stop loss: ");
  input.exitPrice = readPositiveNumber("Precio objetivo / salida: ");
  return input;
}

void printScenarioSummary(const TradeInput& input, const TradeMetrics& metrics) {
  std::cout << "\nResumen de la operacion\n";
  std::cout << "Tipo: " << metrics.tradeType << '\n';
  std::cout << "Capital: EUR " << formatNumber(input.capital) << '\n';
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
}

bool askToContinue() {
  while (true) {
    std::cout << "\nQuieres calcular otra operacion? (s/n): ";
    std::string answer;
    std::cin >> answer;

    if (answer == "s" || answer == "S") {
      return true;
    }

    if (answer == "n" || answer == "N") {
      return false;
    }

    std::cout << "Respuesta invalida. Escribe s o n.\n";
  }
}

void printFinalTable(const std::vector<ScenarioRecord>& scenarios) {
  if (scenarios.empty()) {
    return;
  }

  std::cout << "\nResumen final de escenarios\n";
  std::cout << std::left << std::setw(4) << "#"
            << std::setw(8) << "Tipo"
            << std::setw(14) << "Riesgo EUR"
            << std::setw(16) << "Posicion"
            << std::setw(12) << "Ratio R"
            << std::setw(16) << "Beneficio"
            << '\n';

  for (std::size_t i = 0; i < scenarios.size(); ++i) {
    const ScenarioRecord& scenario = scenarios[i];
    std::cout << std::left << std::setw(4) << (i + 1)
              << std::setw(8) << scenario.metrics.tradeType
              << std::setw(14) << formatNumber(scenario.metrics.riskAmount)
              << std::setw(16) << formatNumber(scenario.metrics.positionSize)
              << std::setw(12) << formatNumber(scenario.metrics.rrRatio)
              << std::setw(16) << formatNumber(scenario.metrics.potentialProfit)
              << '\n';
  }
}

int main() {
  std::cout << "Calculadora de riesgo para trading en C++\n";
  std::cout << "Puedes calcular varias operaciones en una sola ejecucion.\n";

  std::vector<ScenarioRecord> scenarios;

  try {
    do {
      std::cout << "\nIntroduce los datos de la operacion.\n\n";
      const TradeInput input = readTradeInput();
      const TradeMetrics metrics = calculateRisk(input);

      scenarios.push_back({input, metrics});
      printScenarioSummary(input, metrics);
    } while (askToContinue());

    printFinalTable(scenarios);
  } catch (const std::exception& error) {
    std::cerr << "\nError: " << error.what() << '\n';
    return 1;
  }

  return 0;
}
