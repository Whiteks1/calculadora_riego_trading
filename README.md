# Calculadora web de riesgo para trading

Proyecto base en HTML, CSS y JavaScript para practicar interfaz, validacion y logica aplicada a trading.

## Incluye

- Formulario con capital, riesgo por operacion, entrada, stop loss y objetivo.
- Calculo del dinero arriesgado y del tamano estimado de la posicion.
- Beneficio potencial y ratio riesgo/beneficio.
- Tabla para comparar escenarios guardados.
- Persistencia de escenarios con `localStorage`.
- Historico con fecha, estrategia y notas.
- Filtros y busqueda sobre operaciones guardadas.
- Exportacion CSV de escenarios guardados.
- Exportacion CSV del historico completo.
- Mini backtester visual con medias moviles, comision, slippage y equity curve.
- Workflow de GitHub Pages para desplegar la web automatica desde `main`.
- Version en C++ consola del motor de calculo con exportacion CSV.
- Casos de prueba compartidos entre JS y C++.
- Interfaz preparada para crecer sin rehacer la base.

## Archivos

- `index.html`: estructura de la aplicacion.
- `styles.css`: diseno responsive.
- `risk-core.js`: logica compartida de riesgo para la web y los tests JS.
- `app.js`: validacion y calculos.
- `.github/workflows/deploy-pages.yml`: despliegue automatico a GitHub Pages.
- `cpp/main.cpp`: version consola del motor.
- `cpp/risk_engine.cpp`: motor compartido de calculo en C++.
- `cpp/risk_case_runner.cpp`: runner C++ para verificar paridad contra los fixtures compartidos.
- `cpp/CMakeLists.txt`: configuracion minima para compilar con CMake.
- `tests/risk_cases.csv`: fixtures compartidos para verificar calculos.
- `tests/run_js_tests.js`: runner de pruebas JS.
- `tests/run_cross_tests.js`: pruebas de paridad entre JS y C++.

## Como abrirlo

1. Abre `index.html` en tu navegador.
2. Completa los datos de la operacion.
3. Pulsa `Calcular riesgo`.
4. Si quieres guardarla, pulsa `Guardar escenario`.
5. Los escenarios activos se pueden exportar a CSV y limpiar sin perder el historico.
6. El historico conserva fecha, estrategia y notas, y se puede filtrar o buscar.
7. El historico completo tambien se puede exportar a CSV.
8. En el mini backtester puedes pegar precios, elegir parametros y ver señales, operaciones, metricas y la equity curve.

## GitHub Pages

La web queda preparada para publicarse con GitHub Pages usando GitHub Actions.

URL esperada del sitio:

- `https://whiteks1.github.io/calculadora_riego_trading/`

Si es la primera vez que activas Pages en el repositorio, revisa en GitHub que la fuente de Pages use `GitHub Actions`.

## Version C++ consola

La version de consola permite calcular varias operaciones seguidas, validar mejor el setup y exportar automaticamente el resumen final a CSV.

### Compilar con g++

```bash
g++ -std=c++17 -O2 -o trading_risk_calculator cpp/main.cpp cpp/risk_engine.cpp
```

### Ejecutar

```bash
./trading_risk_calculator
```

Al terminar, la app genera `escenarios_cpp.csv` con los escenarios calculados.

### Compilar con CMake

```bash
cmake -S cpp -B cpp/build
cmake --build cpp/build --config Release
```

## Pruebas compartidas

### JS

```bash
node tests/run_js_tests.js
```

### C++

```bash
g++ -std=c++17 -O2 -o risk_case_runner.exe cpp/risk_case_runner.cpp cpp/risk_engine.cpp
node tests/run_cross_tests.js
```

## Siguientes pasos recomendados

1. Anadir comisiones, slippage o leverage tambien a la calculadora principal.
2. Incorporar shorts reales y mas reglas al backtester.
3. Guardar y exportar resultados del backtester.
4. Evolucionar el motor C++ hacia backtesting y simulacion.
