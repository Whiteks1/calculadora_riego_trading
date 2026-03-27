# Calculadora web de riesgo para trading

Proyecto base en HTML, CSS y JavaScript para practicar interfaz, validacion y logica aplicada a trading.

El repositorio tambien empieza a actuar como un **pre-trade risk workbench** reusable dentro del ecosistema QuantLab:
- el navegador sigue siendo una superficie de operador
- el calculo vive en un core compartido
- los trade plans ya pueden exportarse de forma determinista en JSON y CSV
- la consola C++ puede producir el mismo shape basico para validaciones cruzadas

## Incluye

- Formulario con capital, riesgo por operacion, entrada, stop loss y objetivo.
- Fees y slippage opcionales en la calculadora principal.
- Calculo del dinero arriesgado y del tamano estimado de la posicion.
- Beneficio potencial y ratio riesgo/beneficio.
- Trade plan canonico con costes estimados y resultados netos.
- Tabla para comparar escenarios guardados.
- Persistencia de escenarios con `localStorage`.
- Historico con fecha, estrategia y notas.
- Filtros y busqueda sobre operaciones guardadas.
- Exportacion CSV de escenarios guardados.
- Exportacion CSV del historico completo.
- Exportacion de trade plan JSON/CSV desde la web.
- Mini backtester visual con medias moviles, comision, slippage y equity curve.
- Workflow de GitHub Pages para desplegar la web automatica desde `main`.
- Version en C++ consola del motor de calculo con exportacion CSV/JSON.
- Casos de prueba compartidos entre JS y C++ para metricas y trade plans.
- Interfaz preparada para crecer sin rehacer la base.

## Archivos

- `index.html`: estructura de la aplicacion.
- `styles.css`: diseno responsive.
- `risk-core.js`: core reutilizable de riesgo, costes y trade-plan exports.
- `app.js`: validacion y calculos.
- `cli/trade-plan.js`: CLI headless para generar trade plans deterministas sin navegador.
- `package.json`: entrypoint CLI y scripts de test ligeros.
- `.github/workflows/deploy-pages.yml`: despliegue automatico a GitHub Pages.
- `cpp/main.cpp`: version consola del motor.
- `cpp/risk_engine.cpp`: motor compartido de calculo en C++.
- `cpp/risk_case_runner.cpp`: runner C++ para verificar paridad contra los fixtures compartidos.
- `cpp/trade_plan_runner.cpp`: runner C++ para verificar paridad del trade plan canonico.
- `cpp/CMakeLists.txt`: configuracion minima para compilar con CMake.
- `tests/risk_cases.csv`: fixtures compartidos para verificar calculos.
- `tests/run_js_tests.js`: runner de pruebas JS.
- `tests/run_cross_tests.js`: pruebas de paridad entre JS y C++.
- `tests/run_trade_plan_cross_tests.js`: pruebas de paridad del trade plan entre JS y C++.
- `tests/run_cli_tests.js`: pruebas del path headless/CLI.

## Como abrirlo

1. Abre `index.html` en tu navegador.
2. Completa los datos de la operacion.
3. Pulsa `Calcular riesgo`.
4. Si quieres guardarla, pulsa `Guardar escenario`.
5. Los escenarios activos se pueden exportar a CSV y limpiar sin perder el historico.
6. El historico conserva fecha, estrategia y notas, y se puede filtrar o buscar.
7. El historico completo tambien se puede exportar a CSV.
8. El trade plan actual tambien se puede exportar a JSON y CSV.
9. En el mini backtester puedes pegar precios, elegir parametros y ver señales, operaciones, metricas y la equity curve.

## GitHub Pages

La web queda preparada para publicarse con GitHub Pages usando GitHub Actions.

URL esperada del sitio:

- `https://whiteks1.github.io/calculadora_riego_trading/`

Si es la primera vez que activas Pages en el repositorio, revisa en GitHub que la fuente de Pages use `GitHub Actions`.

## Version C++ consola

La version de consola permite calcular varias operaciones seguidas, validar mejor el setup y exportar automaticamente:
- `escenarios_cpp.csv`
- `trade_plan_cpp.json`
- `trade_plans_cpp.csv`

### Compilar con g++

```bash
g++ -std=c++17 -O2 -o trading_risk_calculator cpp/main.cpp cpp/risk_engine.cpp
```

### Ejecutar

```bash
./trading_risk_calculator
```

Al terminar, la app genera `escenarios_cpp.csv`, `trade_plan_cpp.json` y `trade_plans_cpp.csv`.

### Compilar con CMake

```bash
cmake -S cpp -B cpp/build
cmake --build cpp/build --config Release
```

## Pruebas compartidas

### JS

```bash
node tests/run_js_tests.js
node tests/run_cli_tests.js
```

### C++

```bash
g++ -std=c++17 -O2 -o risk_case_runner.exe cpp/risk_case_runner.cpp cpp/risk_engine.cpp
g++ -std=c++17 -O2 -o trade_plan_runner.exe cpp/trade_plan_runner.cpp cpp/risk_engine.cpp
node tests/run_cross_tests.js
node tests/run_trade_plan_cross_tests.js
```

## Siguientes pasos recomendados

1. Documentar el contrato de handoff para QuantLab.
2. Incorporar shorts reales y mas reglas al backtester.
3. Guardar y exportar resultados del backtester.

## CLI headless

Ejemplo con archivo JSON:

```bash
node cli/trade-plan.js --input-file request.json --json-out outputs/trade_plan.json --csv-out outputs/trade_plan.csv
```

Ejemplo con flags directos:

```bash
node cli/trade-plan.js --capital 1000 --risk-percent 1 --entry-price 2000 --stop-loss 1950 --exit-price 2100 --fee-percent 0.1 --slippage-percent 0.05 --strategy-name "ETH breakout" --trade-notes "Headless smoke"
```

La CLI:

- no depende del DOM ni de `localStorage`
- reutiliza `risk-core.js`
- imprime el trade plan JSON canónico por `stdout`
- puede escribir JSON y CSV de forma determinista
- devuelve código distinto de cero si el setup es inválido
