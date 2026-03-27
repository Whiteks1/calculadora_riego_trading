#include "risk_engine.h"

#include <chrono>
#include <ctime>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

struct ScenarioRecord {
  std::string timestamp;
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

double readBoundedRiskPercent(const std::string& label) {
  while (true) {
    const double value = readPositiveNumber(label);

    if (value <= 100.0) {
      return value;
    }

    std::cout << "El porcentaje de riesgo debe estar entre 0 y 100.\n";
  }
}

std::string readTextLine(const std::string& label) {
  std::cout << label;
  std::string value;
  std::getline(std::cin, value);
  return value;
}

std::string formatNumber(double value, int precision = 2) {
  std::ostringstream stream;
  stream << std::fixed << std::setprecision(precision) << value;
  return stream.str();
}

std::string currentTimestamp() {
  const auto now = std::chrono::system_clock::now();
  const std::time_t nowTime = std::chrono::system_clock::to_time_t(now);
  std::tm localTime {};
#ifdef _WIN32
  localtime_s(&localTime, &nowTime);
#else
  localtime_r(&nowTime, &localTime);
#endif
  std::ostringstream stream;
  stream << std::put_time(&localTime, "%Y-%m-%d %H:%M:%S");
  return stream.str();
}

TradeInput readTradeInput() {
  TradeInput input;
  input.capital = readPositiveNumber("Capital disponible: ");
  input.riskPercent = readBoundedRiskPercent("Riesgo por operacion (%): ");
  input.entryPrice = readPositiveNumber("Precio de entrada: ");
  input.stopLoss = readPositiveNumber("Stop loss: ");
  input.exitPrice = readPositiveNumber("Precio objetivo / salida: ");

  std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
  input.strategy = readTextLine("Estrategia (opcional): ");
  input.notes = readTextLine("Notas (opcional): ");

  if (input.strategy.empty()) {
    input.strategy = "Sin estrategia";
  }

  return input;
}

void printScenarioSummary(const ScenarioRecord& scenario) {
  const TradeMetrics& metrics = scenario.metrics;

  std::cout << "\nResumen de la operacion\n";
  std::cout << "Fecha: " << scenario.timestamp << '\n';
  std::cout << "Estrategia: " << scenario.input.strategy << '\n';
  std::cout << "Tipo: " << metrics.tradeType << '\n';
  std::cout << "Capital: EUR " << formatNumber(scenario.input.capital) << '\n';
  std::cout << "Riesgo en dinero: EUR " << formatNumber(metrics.riskAmount) << '\n';
  std::cout << "Tamano estimado: " << formatNumber(metrics.positionSize) << " unidades\n";
  std::cout << "Perdida potencial: EUR " << formatNumber(metrics.potentialLoss) << '\n';
  std::cout << "Beneficio potencial: EUR " << formatNumber(metrics.potentialProfit) << '\n';
  std::cout << "Relacion riesgo/beneficio: 1 : " << formatNumber(metrics.rrRatio) << '\n';
  std::cout << "Distancia al stop: " << formatNumber(metrics.stopDistance, 4) << '\n';
  std::cout << "Valor nocional aprox.: EUR " << formatNumber(metrics.notionalValue) << '\n';
}

bool askYesNo(const std::string& label) {
  while (true) {
    std::cout << label;
    std::string answer;
    if (!(std::cin >> answer)) {
      throw std::runtime_error("No se pudo leer la respuesta.");
    }
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');

    if (answer == "s" || answer == "S") {
      return true;
    }

    if (answer == "n" || answer == "N") {
      return false;
    }

    std::cout << "Respuesta invalida. Escribe s o n.\n";
  }
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

void exportScenariosToCsv(const std::vector<ScenarioRecord>& scenarios, const std::string& filename) {
  std::ofstream output(filename);

  if (!output) {
    throw std::runtime_error("No se pudo crear el archivo CSV.");
  }

  output << "fecha,estrategia,notas,tipo,capital,riesgo_percent,entrada,stop_loss,objetivo,riesgo_dinero,"
            "distancia_stop,distancia_objetivo,tamano_posicion,perdida_potencial,beneficio_potencial,ratio_r,"
            "valor_nocional\n";

  for (const ScenarioRecord& scenario : scenarios) {
    output << escapeCsv(scenario.timestamp) << ','
           << escapeCsv(scenario.input.strategy) << ','
           << escapeCsv(scenario.input.notes) << ','
           << escapeCsv(scenario.metrics.tradeType) << ','
           << scenario.input.capital << ','
           << scenario.input.riskPercent << ','
           << scenario.input.entryPrice << ','
           << scenario.input.stopLoss << ','
           << scenario.input.exitPrice << ','
           << scenario.metrics.riskAmount << ','
           << scenario.metrics.stopDistance << ','
           << scenario.metrics.targetDistance << ','
           << scenario.metrics.positionSize << ','
           << scenario.metrics.potentialLoss << ','
           << scenario.metrics.potentialProfit << ','
           << scenario.metrics.rrRatio << ','
           << scenario.metrics.notionalValue << '\n';
  }
}

void printFinalTable(const std::vector<ScenarioRecord>& scenarios) {
  if (scenarios.empty()) {
    return;
  }

  std::cout << "\nResumen final de escenarios\n";
  std::cout << std::left << std::setw(4) << "#"
            << std::setw(20) << "Fecha"
            << std::setw(18) << "Estrategia"
            << std::setw(8) << "Tipo"
            << std::setw(14) << "Riesgo EUR"
            << std::setw(16) << "Posicion"
            << std::setw(12) << "Ratio R"
            << std::setw(16) << "Beneficio"
            << '\n';

  for (std::size_t index = 0; index < scenarios.size(); ++index) {
    const ScenarioRecord& scenario = scenarios[index];
    std::cout << std::left << std::setw(4) << (index + 1)
              << std::setw(20) << scenario.timestamp.substr(0, 16)
              << std::setw(18) << scenario.input.strategy.substr(0, 17)
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
  std::cout << "Puedes calcular varias operaciones y exportarlas a CSV.\n";

  std::vector<ScenarioRecord> scenarios;

  try {
    do {
      std::cout << "\nIntroduce los datos de la operacion.\n\n";
      const TradeInput input = readTradeInput();
      const ScenarioRecord scenario {currentTimestamp(), input, calculateRisk(input)};

      scenarios.push_back(scenario);
      printScenarioSummary(scenario);
    } while (askYesNo("\nQuieres calcular otra operacion? (s/n): "));

    printFinalTable(scenarios);
    exportScenariosToCsv(scenarios, "escenarios_cpp.csv");
    std::cout << "\nCSV exportado en escenarios_cpp.csv\n";
  } catch (const std::exception& error) {
    std::cerr << "\nError: " << error.what() << '\n';
    return 1;
  }

  return 0;
}
