(() => {
  const appNamespace = window.TradingRiskApp || {};
  const shared = appNamespace.shared;
  const riskEngine = window.RiskCore;

  if (
    !shared ||
    !riskEngine ||
    typeof appNamespace.createRiskWorkbench !== "function" ||
    typeof appNamespace.createBacktester !== "function"
  ) {
    throw new Error("No se pudieron cargar los módulos de la calculadora.");
  }

  const riskWorkbench = appNamespace.createRiskWorkbench({
    form: document.getElementById("riskForm"),
    fillExampleButton: document.getElementById("fillExample"),
    saveScenarioButton: document.getElementById("saveScenario"),
    exportPlanJsonButton: document.getElementById("exportPlanJson"),
    exportPlanCsvButton: document.getElementById("exportPlanCsv"),
    exportScenariosButton: document.getElementById("exportScenarios"),
    exportHistoryButton: document.getElementById("exportHistory"),
    clearScenariosButton: document.getElementById("clearScenarios"),
    clearHistoryButton: document.getElementById("clearHistory"),
    formMessage: document.getElementById("formMessage"),
    scenarioTableBody: document.getElementById("scenarioTableBody"),
    scenarioCountBadge: document.getElementById("scenarioCountBadge"),
    historyCountBadge: document.getElementById("historyCountBadge"),
    historyTableBody: document.getElementById("historyTableBody"),
    historySearchInput: document.getElementById("historySearch"),
    historyTypeFilter: document.getElementById("historyTypeFilter"),
    historyStrategyFilter: document.getElementById("historyStrategyFilter"),
    outputs: {
      riskAmount: document.getElementById("riskAmount"),
      positionSize: document.getElementById("positionSize"),
      potentialLoss: document.getElementById("potentialLoss"),
      potentialProfit: document.getElementById("potentialProfit"),
      estimatedRoundTripCosts: document.getElementById("estimatedRoundTripCosts"),
      netPotentialProfit: document.getElementById("netPotentialProfit"),
      rrRatio: document.getElementById("rrRatio"),
      stopDistance: document.getElementById("stopDistance"),
      notionalValue: document.getElementById("notionalValue"),
      netRrRatio: document.getElementById("netRrRatio"),
      insightText: document.getElementById("insightText"),
      tradeTypeBadge: document.getElementById("tradeTypeBadge"),
    },
    riskEngine,
    shared,
  });

  const backtester = appNamespace.createBacktester({
    backtestForm: document.getElementById("backtestForm"),
    loadBacktestExampleButton: document.getElementById("loadBacktestExample"),
    backtestMessage: document.getElementById("backtestMessage"),
    backtestChart: document.getElementById("backtestChart"),
    equityChart: document.getElementById("equityChart"),
    backtestSignalBody: document.getElementById("backtestSignalBody"),
    backtestTradesBody: document.getElementById("backtestTradesBody"),
    backtestOutputs: {
      finalCapital: document.getElementById("backtestFinalCapital"),
      totalReturn: document.getElementById("backtestReturn"),
      totalTrades: document.getElementById("backtestTrades"),
      winRate: document.getElementById("backtestWinRate"),
      maxDrawdown: document.getElementById("backtestDrawdown"),
      lastSignal: document.getElementById("backtestLastSignal"),
    },
    shared,
  });

  riskWorkbench.init();
  backtester.init();
})();
