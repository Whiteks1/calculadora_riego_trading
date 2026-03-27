# Trading Risk Calculator

HTML, CSS, and JavaScript project focused on practical trading workflows, form handling, validation, and useful pre-trade logic.

Current status: `v1.0.0`, finalized as a first stable portfolio release.

Public portfolio positioning:
- repository description centered on a pre-trade risk workbench
- website pointing to the GitHub Pages deployment
- topics aligned with trading, risk management, JavaScript, C++, and QuantLab

Today, this repository should be read primarily as a reusable and bounded **pre-trade risk workbench**:
- the browser remains an operator-facing surface
- calculations live in a shared core
- trade plans are exported deterministically in JSON and CSV
- the headless CLI provides a reproducible path without depending on the DOM
- the C++ version acts as an alternate runtime for parity and cross-validation

## Repository Role

This repo:
- plans trades
- generates deterministic artifacts
- exports a bounded handoff toward QuantLab

This repo does not own:
- `ExecutionPolicy`
- `ExecutionIntent`
- approval or submit flows
- broker adapters
- paper or live execution

Base rule:
- the calculator plans
- QuantLab validates
- QuantLab decides
- QuantLab executes

Short repo roadmap:

- `docs/pretrade-workbench-roadmap.md`
- `docs/portfolio-final-checklist.md`
- `CHANGELOG.md`

## Included Features

- Trade form with capital, risk per trade, entry, stop loss, and target price
- Optional fees and slippage in the main calculator
- Risk amount and estimated position size calculation
- Potential profit and risk/reward ratio
- Canonical trade plan with estimated costs and net outcomes
- Table for comparing saved scenarios
- Scenario persistence via `localStorage`
- History with timestamp, strategy, and notes
- Filters and search over saved trades
- CSV export for saved scenarios
- CSV export for full trade history
- Trade plan JSON/CSV export from the web app
- Visual mini backtester with moving averages, commission, slippage, and equity curve
- GitHub Pages workflow for automatic deployment from `main`
- C++ console version of the calculation engine with CSV/JSON export
- Shared test cases between JS and C++ for metrics and trade plans
- Frontend structure ready to grow without rebuilding the base

## Quick Start

```bash
npm ci
npm run dev
```

Then open:

- `http://127.0.0.1:4173`

To run the main verification suite:

```bash
npm test
```

## Project Files

- `index.html`: application structure
- `styles.css`: responsive styling
- `risk-core.js`: reusable core for risk, cost, and trade-plan exports
- `web/shared.js`: formatting, form reading, persistence, and downloads
- `web/risk-ui.js`: calculator, scenarios, history, and web exports
- `web/backtest-ui.js`: visual mini backtester and chart/table rendering
- `web/main.js`: final browser bootstrap
- `cli/trade-plan.js`: headless CLI for deterministic trade-plan generation without a browser
- `package.json`: CLI entry point and developer scripts
- `package-lock.json`: dependency lockfile for local and CI reproducibility
- `playwright.config.js`: browser/UI test configuration
- `scripts/serve-static.js`: minimal static server for browser testing and local preview
- `scripts/clean-local-artifacts.js`: optional cleanup for ignored local artifacts
- `docs/pretrade-workbench-roadmap.md`: positioning, boundaries, and short roadmap
- `docs/quantlab-handoff-contract.md`: boundary and handoff contract toward QuantLab
- `docs/portfolio-final-checklist.md`: final checklist for the portfolio-ready `v1.0.0` state
- `examples/quantlab_handoff_request.json`: example request for the headless path
- `.github/workflows/deploy-pages.yml`: automatic GitHub Pages deployment
- `.github/workflows/contract-parity-ci.yml`: contract and parity CI
- `cpp/main.cpp`: console application entry point
- `cpp/risk_engine.cpp`: shared C++ calculation engine
- `cpp/risk_case_runner.cpp`: C++ runner for parity checks against shared fixtures
- `cpp/trade_plan_runner.cpp`: C++ runner for canonical trade-plan parity checks
- `cpp/CMakeLists.txt`: minimal CMake configuration
- `tests/risk_cases.csv`: shared fixtures for risk calculations
- `tests/fixtures/expected_trade_plan.json`: canonical trade-plan fixture
- `tests/fixtures/expected_trade_plan.csv`: canonical trade-plan CSV fixture
- `tests/fixtures/expected_quantlab_handoff.json`: canonical QuantLab handoff fixture
- `tests/run_js_tests.js`: JS test runner
- `tests/run_cross_tests.js`: JS/C++ parity tests
- `tests/run_trade_plan_cross_tests.js`: trade-plan parity tests between JS and C++
- `tests/run_cli_tests.js`: headless/CLI tests
- `tests/run_contract_fixture_tests.js`: fixture verification against real CLI output

## How To Use It

1. Run `npm run dev` or open `index.html` directly in your browser.
2. Fill in the trade inputs.
3. Click `Calcular riesgo`.
4. If you want to save it, click `Guardar escenario`.
5. Active scenarios can be exported to CSV and cleared without losing history.
6. The history keeps date, strategy, and notes, and can be filtered or searched.
7. The full history can also be exported to CSV.
8. The current trade plan can be exported to JSON and CSV.
9. In the mini backtester, you can paste prices, choose parameters, and inspect signals, trades, metrics, and the equity curve.

## GitHub Pages

The site is ready to be published with GitHub Pages through GitHub Actions.

Expected public URL:

- `https://whiteks1.github.io/calculadora_riego_trading/`

If this is the first time you enable Pages for the repository, make sure the Pages source is set to `GitHub Actions`.

## C++ Console Version

The console version can calculate multiple trades in one run, validate setups more strictly, and export:
- `escenarios_cpp.csv`
- `trade_plan_cpp.json`
- `trade_plans_cpp.csv`

### Build with g++

```bash
g++ -std=c++17 -O2 -o trading_risk_calculator cpp/main.cpp cpp/risk_engine.cpp
```

### Run

```bash
./trading_risk_calculator
```

At the end, the app generates `escenarios_cpp.csv`, `trade_plan_cpp.json`, and `trade_plans_cpp.csv`.

### Build with CMake

```bash
cmake -S cpp -B cpp/build
cmake --build cpp/build --config Release
```

## Shared Testing

### JavaScript

```bash
npm ci
npm test
```

If you want to run only part of the suite:

```bash
npm run test:js
npm run test:cli
npm run test:contract-fixtures
npm run test:ui
```

### C++

```bash
g++ -std=c++17 -O2 -o risk_case_runner.exe cpp/risk_case_runner.cpp cpp/risk_engine.cpp
g++ -std=c++17 -O2 -o trade_plan_runner.exe cpp/trade_plan_runner.cpp cpp/risk_engine.cpp
node tests/run_cross_tests.js
node tests/run_trade_plan_cross_tests.js
```

## Contract And Parity CI

The repository includes a GitHub Actions workflow in:

- `.github/workflows/contract-parity-ci.yml`

That workflow validates:
- core and CLI syntax
- JS and headless CLI tests
- basic browser/UI coverage for the main flow
- canonical trade-plan and QuantLab handoff fixtures
- parity between JS and C++ for metrics and trade plans

This gives the repo the following baseline:
- versioned fixtures in source control
- automated parity across runtimes
- real browser smoke tests for the main interface
- visible drift before anything is integrated into QuantLab

## Pages Deployment

The GitHub Pages deployment publishes:

- `index.html`
- `styles.css`
- `risk-core.js`
- the full `web/` directory

That prevents the public site from breaking when the frontend uses split browser modules.

## Local Cleanup

If you want to remove ignored local artifacts generated during development:

```bash
npm run clean:artifacts
```

## Recommended Next Steps

1. Keep the handoff boundary and contract stable.
2. Extend downstream QuantLab intake only when it is actually needed.
3. Keep extra UX or backtester ideas outside the critical path unless they support the pre-trade boundary directly.

## Headless CLI

Example with a JSON input file:

```bash
node cli/trade-plan.js --input-file request.json --json-out outputs/trade_plan.json --csv-out outputs/trade_plan.csv
```

Example with direct flags:

```bash
node cli/trade-plan.js --capital 1000 --risk-percent 1 --entry-price 2000 --stop-loss 1950 --exit-price 2100 --fee-percent 0.1 --slippage-percent 0.05 --strategy-name "ETH breakout" --trade-notes "Headless smoke"
```

The CLI:
- does not depend on the DOM or `localStorage`
- reuses `risk-core.js`
- prints the canonical trade plan JSON to `stdout`
- can write deterministic JSON and CSV outputs
- returns a non-zero exit code when the setup is invalid

## QuantLab Handoff

The intended integration with QuantLab is deliberately bounded:

- this app proposes
- QuantLab validates
- QuantLab decides
- QuantLab executes

The documented contract lives in:

- `docs/quantlab-handoff-contract.md`

Optional handoff export:

```bash
node cli/trade-plan.js \
  --input-file examples/quantlab_handoff_request.json \
  --stdout-format quantlab-handoff \
  --quantlab-handoff-out outputs/quantlab_handoff.json
```
