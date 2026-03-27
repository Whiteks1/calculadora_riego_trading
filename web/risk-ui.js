(function attachRiskWorkbenchModule(globalObject) {
  const appNamespace = globalObject.TradingRiskApp || (globalObject.TradingRiskApp = {});

  appNamespace.createRiskWorkbench = function createRiskWorkbench(config) {
    const {
      form,
      fillExampleButton,
      saveScenarioButton,
      exportPlanJsonButton,
      exportPlanCsvButton,
      exportScenariosButton,
      exportHistoryButton,
      clearScenariosButton,
      clearHistoryButton,
      formMessage,
      scenarioTableBody,
      scenarioCountBadge,
      historyCountBadge,
      historyTableBody,
      historySearchInput,
      historyTypeFilter,
      historyStrategyFilter,
      outputs,
      riskEngine,
      shared,
    } = config;

    const state = {
      scenarios: [],
      history: [],
    };

    let lastCalculation = null;

    function createScenarioRecord(tradePlan, timestamp) {
      return {
        id: shared.generateId(),
        createdAt: timestamp,
        strategy: tradePlan.input.strategyName || "Sin estrategia",
        notes: tradePlan.input.tradeNotes || "",
        capital: tradePlan.input.capital,
        riskPercent: tradePlan.input.riskPercent,
        entryPrice: tradePlan.input.entryPrice,
        stopLoss: tradePlan.input.stopLoss,
        exitPrice: tradePlan.input.exitPrice,
        feePercent: tradePlan.input.feePercent,
        slippagePercent: tradePlan.input.slippagePercent,
        tradeType: tradePlan.metrics.tradeType,
        riskAmount: tradePlan.metrics.riskAmount,
        stopDistance: tradePlan.metrics.stopDistance,
        targetDistance: tradePlan.metrics.targetDistance,
        positionSize: tradePlan.metrics.positionSize,
        potentialLoss: tradePlan.metrics.potentialLoss,
        potentialProfit: tradePlan.metrics.potentialProfit,
        rrRatio: tradePlan.metrics.rrRatio,
        notionalValue: tradePlan.metrics.notionalValue,
        estimatedRoundTripCosts: tradePlan.costs.estimatedRoundTripCosts,
        netPotentialLoss: tradePlan.outcomes.netPotentialLoss,
        netPotentialProfit: tradePlan.outcomes.netPotentialProfit,
        netRrRatio: tradePlan.outcomes.netRrRatio,
        expectedTargetDirection: tradePlan.metrics.expectedTargetDirection,
      };
    }

    function persistScenarios() {
      shared.persistRecords(shared.STORAGE_KEYS.scenarios, state.scenarios);
    }

    function persistHistory() {
      shared.persistRecords(shared.STORAGE_KEYS.history, state.history);
    }

    function updateBadge(tradeType) {
      outputs.tradeTypeBadge.textContent = tradeType;
      outputs.tradeTypeBadge.className = "trade-badge";
      outputs.tradeTypeBadge.classList.add(tradeType === "LONG" ? "long" : "short");
    }

    function updateTradePlanButtons(enabled) {
      exportPlanJsonButton.disabled = !enabled;
      exportPlanCsvButton.disabled = !enabled;
    }

    function resetResults() {
      lastCalculation = null;
      outputs.riskAmount.textContent = "--";
      outputs.positionSize.textContent = "--";
      outputs.potentialLoss.textContent = "--";
      outputs.potentialProfit.textContent = "--";
      outputs.estimatedRoundTripCosts.textContent = "--";
      outputs.netPotentialProfit.textContent = "--";
      outputs.rrRatio.textContent = "--";
      outputs.stopDistance.textContent = "--";
      outputs.notionalValue.textContent = "--";
      outputs.netRrRatio.textContent = "--";
      outputs.insightText.textContent =
        "Completa el formulario para obtener una lectura de la operación y validar si el escenario tiene sentido.";
      outputs.tradeTypeBadge.textContent = "Esperando datos";
      outputs.tradeTypeBadge.className = "trade-badge neutral";
      updateTradePlanButtons(false);
    }

    function updateResults(tradePlan) {
      const metrics = tradePlan.metrics;
      const costs = tradePlan.costs;
      const outcomes = tradePlan.outcomes;
      const rrMessage = outcomes.netRrRatio >= 2
        ? "El ratio es atractivo y da margen para equivocarte sin romper la gestión de riesgo."
        : "El ratio es ajustado; conviene revisar si el objetivo compensa el riesgo asumido.";

      outputs.riskAmount.textContent = shared.formatCurrency(metrics.riskAmount);
      outputs.positionSize.textContent = `${shared.formatNumber(metrics.positionSize, 2)} u`;
      outputs.potentialLoss.textContent = shared.formatCurrency(metrics.potentialLoss);
      outputs.potentialProfit.textContent = shared.formatCurrency(metrics.potentialProfit);
      outputs.estimatedRoundTripCosts.textContent = shared.formatCurrency(costs.estimatedRoundTripCosts);
      outputs.netPotentialProfit.textContent = shared.formatCurrency(outcomes.netPotentialProfit);
      outputs.rrRatio.textContent = `1 : ${shared.formatNumber(metrics.rrRatio, 2)}`;
      outputs.stopDistance.textContent = shared.formatNumber(metrics.stopDistance, 4);
      outputs.notionalValue.textContent = shared.formatCurrency(metrics.notionalValue);
      outputs.netRrRatio.textContent = `1 : ${shared.formatNumber(outcomes.netRrRatio, 2)}`;
      outputs.insightText.textContent =
        `Operación ${metrics.tradeType.toLowerCase()}: arriesgas ${shared.formatCurrency(metrics.riskAmount)} ` +
        `con una distancia al stop de ${shared.formatNumber(metrics.stopDistance, 4)} y costes estimados de ` +
        `${shared.formatCurrency(costs.estimatedRoundTripCosts)}. ${rrMessage}`;

      updateBadge(metrics.tradeType);
      updateTradePlanButtons(true);
    }

    function renderScenarioTable() {
      if (state.scenarios.length === 0) {
        scenarioTableBody.innerHTML = `
          <tr class="empty-row">
            <td colspan="13">Todavía no has guardado escenarios. Calcula una operación y pulsa "Guardar escenario".</td>
          </tr>
        `;
        scenarioCountBadge.textContent = "0 escenarios";
        scenarioCountBadge.className = "trade-badge neutral";
        exportScenariosButton.disabled = true;
        return;
      }

      scenarioTableBody.innerHTML = state.scenarios
        .map((scenario, index) => {
          const typeClass = scenario.tradeType === "LONG" ? "long" : "short";

          return `
            <tr>
              <td><strong>${index + 1}</strong></td>
              <td>${shared.escapeHtml(shared.formatDate(scenario.createdAt))}</td>
              <td>${shared.escapeHtml(scenario.strategy)}</td>
              <td><span class="row-badge ${typeClass}">${shared.escapeHtml(scenario.tradeType)}</span></td>
              <td>${shared.formatCurrency(scenario.capital)}</td>
              <td>${shared.formatPercent(scenario.riskPercent, 2)}</td>
              <td>${shared.formatNumber(scenario.entryPrice, 4)}</td>
              <td>${shared.formatNumber(scenario.stopLoss, 4)}</td>
              <td>${shared.formatNumber(scenario.exitPrice, 4)}</td>
              <td>${shared.formatNumber(scenario.positionSize, 2)} u</td>
              <td>1 : ${shared.formatNumber(scenario.rrRatio, 2)}</td>
              <td>${shared.formatCurrency(scenario.potentialProfit)}</td>
              <td><button type="button" class="icon-button" data-index="${index}">Eliminar</button></td>
            </tr>
          `;
        })
        .join("");

      scenarioCountBadge.textContent = `${state.scenarios.length} escenario${state.scenarios.length === 1 ? "" : "s"}`;
      scenarioCountBadge.className = "trade-badge neutral";
      exportScenariosButton.disabled = false;
    }

    function renderHistoryStrategyOptions() {
      const previousValue = historyStrategyFilter.value || "ALL";
      const strategies = [...new Set(state.history.map((record) => record.strategy))].sort((left, right) =>
        left.localeCompare(right, "es"),
      );

      historyStrategyFilter.innerHTML = `
        <option value="ALL">Todas</option>
        ${strategies.map((strategy) => `<option value="${shared.escapeHtml(strategy)}">${shared.escapeHtml(strategy)}</option>`).join("")}
      `;

      historyStrategyFilter.value = strategies.includes(previousValue) ? previousValue : "ALL";
    }

    function getFilteredHistory() {
      const searchValue = historySearchInput.value.trim().toLowerCase();
      const typeValue = historyTypeFilter.value;
      const strategyValue = historyStrategyFilter.value;

      return state.history.filter((record) => {
        const matchesType = typeValue === "ALL" || record.tradeType === typeValue;
        const matchesStrategy = strategyValue === "ALL" || record.strategy === strategyValue;
        const haystack = [record.strategy, record.notes, record.tradeType, shared.formatDate(record.createdAt)]
          .join(" ")
          .toLowerCase();
        const matchesSearch = !searchValue || haystack.includes(searchValue);
        return matchesType && matchesStrategy && matchesSearch;
      });
    }

    function renderHistoryTable() {
      renderHistoryStrategyOptions();

      if (state.history.length === 0) {
        historyTableBody.innerHTML = `
          <tr class="empty-row">
            <td colspan="8">Aún no hay operaciones en el histórico.</td>
          </tr>
        `;
        historyCountBadge.textContent = "0 registros";
        historyCountBadge.className = "trade-badge neutral";
        exportHistoryButton.disabled = true;
        return;
      }

      const filteredHistory = getFilteredHistory();

      historyTableBody.innerHTML = filteredHistory.length
        ? filteredHistory
            .map((record) => {
              const typeClass = record.tradeType === "LONG" ? "long" : "short";

              return `
                <tr>
                  <td>${shared.escapeHtml(shared.formatDate(record.createdAt))}</td>
                  <td>${shared.escapeHtml(record.strategy)}</td>
                  <td>${shared.escapeHtml(shared.truncateText(record.notes, 72))}</td>
                  <td><span class="row-badge ${typeClass}">${shared.escapeHtml(record.tradeType)}</span></td>
                  <td>${shared.formatCurrency(record.capital)}</td>
                  <td>${shared.formatPercent(record.riskPercent, 2)}</td>
                  <td>1 : ${shared.formatNumber(record.rrRatio, 2)}</td>
                  <td>${shared.formatCurrency(record.potentialProfit)}</td>
                </tr>
              `;
            })
            .join("")
        : `
            <tr class="empty-row">
              <td colspan="8">No hay registros que coincidan con el filtro actual.</td>
            </tr>
          `;

      historyCountBadge.textContent = `${filteredHistory.length} / ${state.history.length} registros`;
      historyCountBadge.className = "trade-badge neutral";
      exportHistoryButton.disabled = false;
    }

    function exportRowsToCsv(filename, headers, rows, successMessage) {
      const csvContent = [headers, ...rows]
        .map((row) => row.map((value) => shared.escapeCsvValue(value)).join(","))
        .join("\n");

      shared.downloadTextFile(filename, csvContent, "text/csv;charset=utf-8;");
      formMessage.textContent = successMessage;
    }

    function exportScenariosToCsv() {
      if (state.scenarios.length === 0) {
        formMessage.textContent = "No hay escenarios para exportar.";
        return;
      }

      exportRowsToCsv(
        "escenarios-trading.csv",
        [
          "numero", "fecha", "estrategia", "notas", "tipo", "capital", "riesgo_percent",
          "entrada", "stop_loss", "objetivo", "fee_percent", "slippage_percent", "riesgo_dinero", "distancia_stop",
          "distancia_objetivo", "tamano_posicion", "perdida_potencial", "beneficio_potencial", "ratio_r",
          "valor_nocional", "costes_round_trip", "perdida_neta", "beneficio_neto", "ratio_r_neto",
        ],
        state.scenarios.map((scenario, index) => [
          index + 1,
          scenario.createdAt,
          scenario.strategy,
          scenario.notes,
          scenario.tradeType,
          scenario.capital,
          scenario.riskPercent,
          scenario.entryPrice,
          scenario.stopLoss,
          scenario.exitPrice,
          scenario.feePercent,
          scenario.slippagePercent,
          scenario.riskAmount,
          scenario.stopDistance,
          scenario.targetDistance,
          scenario.positionSize,
          scenario.potentialLoss,
          scenario.potentialProfit,
          scenario.rrRatio,
          scenario.notionalValue,
          scenario.estimatedRoundTripCosts,
          scenario.netPotentialLoss,
          scenario.netPotentialProfit,
          scenario.netRrRatio,
        ]),
        "CSV exportado con tus escenarios activos.",
      );
    }

    function exportHistoryToCsv() {
      if (state.history.length === 0) {
        formMessage.textContent = "No hay histórico para exportar.";
        return;
      }

      exportRowsToCsv(
        "historial-trading.csv",
        [
          "fecha", "estrategia", "notas", "tipo", "capital", "riesgo_percent",
          "entrada", "stop_loss", "objetivo", "fee_percent", "slippage_percent", "riesgo_dinero", "distancia_stop",
          "distancia_objetivo", "tamano_posicion", "perdida_potencial", "beneficio_potencial", "ratio_r",
          "valor_nocional", "costes_round_trip", "perdida_neta", "beneficio_neto", "ratio_r_neto",
        ],
        state.history.map((record) => [
          record.createdAt,
          record.strategy,
          record.notes,
          record.tradeType,
          record.capital,
          record.riskPercent,
          record.entryPrice,
          record.stopLoss,
          record.exitPrice,
          record.feePercent,
          record.slippagePercent,
          record.riskAmount,
          record.stopDistance,
          record.targetDistance,
          record.positionSize,
          record.potentialLoss,
          record.potentialProfit,
          record.rrRatio,
          record.notionalValue,
          record.estimatedRoundTripCosts,
          record.netPotentialLoss,
          record.netPotentialProfit,
          record.netRrRatio,
        ]),
        "CSV exportado con el histórico completo.",
      );
    }

    function saveScenario() {
      if (!lastCalculation) {
        formMessage.textContent = "Primero calcula una operación válida antes de guardarla como escenario.";
        return;
      }

      const timestamp = new Date().toISOString();
      const record = createScenarioRecord(lastCalculation.plan, timestamp);

      state.scenarios.unshift(record);
      state.history.unshift(record);
      persistScenarios();
      persistHistory();
      renderScenarioTable();
      renderHistoryTable();
      formMessage.textContent = "Escenario guardado en el comparador y añadido al histórico.";
    }

    function exportCurrentTradePlanJson() {
      if (!lastCalculation) {
        formMessage.textContent = "Primero calcula una operación válida antes de exportar el trade plan.";
        return;
      }

      const filename = `${lastCalculation.plan.planId}.json`;
      shared.downloadTextFile(
        filename,
        riskEngine.serializeTradePlanJson(lastCalculation.plan),
        "application/json;charset=utf-8;",
      );
      formMessage.textContent = "Trade plan JSON exportado.";
    }

    function exportCurrentTradePlanCsv() {
      if (!lastCalculation) {
        formMessage.textContent = "Primero calcula una operación válida antes de exportar el trade plan.";
        return;
      }

      const filename = `${lastCalculation.plan.planId}.csv`;
      shared.downloadTextFile(
        filename,
        riskEngine.serializeTradePlanCsv(lastCalculation.plan),
        "text/csv;charset=utf-8;",
      );
      formMessage.textContent = "Trade plan CSV exportado.";
    }

    function bootstrapState() {
      const hasHistoryStorage = globalObject.localStorage.getItem(shared.STORAGE_KEYS.history) !== null;
      state.scenarios = shared.loadRecords(shared.STORAGE_KEYS.scenarios, riskEngine);
      state.history = shared.loadRecords(shared.STORAGE_KEYS.history, riskEngine);

      if (!hasHistoryStorage && state.history.length === 0 && state.scenarios.length > 0) {
        state.history = state.scenarios.slice();
        persistHistory();
      }
    }

    function bindEvents() {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = shared.readTradeFormValues(form);
        const validationMessage = riskEngine.validateTradeValues(values);

        if (validationMessage) {
          formMessage.textContent = validationMessage;
          resetResults();
          return;
        }

        const tradePlan = riskEngine.createTradePlan(values);
        lastCalculation = {
          values,
          metrics: tradePlan.metrics,
          plan: tradePlan,
        };
        formMessage.textContent = "";
        updateResults(tradePlan);
      });

      form.addEventListener("reset", () => {
        formMessage.textContent = "";
        globalObject.setTimeout(resetResults, 0);
      });

      fillExampleButton.addEventListener("click", () => {
        Object.entries(shared.exampleValues).forEach(([key, value]) => {
          form.elements[key].value = value;
        });
        form.requestSubmit();
      });

      saveScenarioButton.addEventListener("click", () => {
        const values = shared.readTradeFormValues(form);
        const validationMessage = riskEngine.validateTradeValues(values);

        if (validationMessage) {
          formMessage.textContent = validationMessage;
          resetResults();
          return;
        }

        const tradePlan = riskEngine.createTradePlan(values);
        lastCalculation = {
          values,
          metrics: tradePlan.metrics,
          plan: tradePlan,
        };

        updateResults(tradePlan);
        saveScenario();
      });

      scenarioTableBody.addEventListener("click", (event) => {
        const button = event.target.closest("[data-index]");

        if (!button) {
          return;
        }

        const index = Number(button.dataset.index);

        if (Number.isInteger(index)) {
          state.scenarios.splice(index, 1);
          persistScenarios();
          renderScenarioTable();
        }
      });

      clearScenariosButton.addEventListener("click", () => {
        state.scenarios.length = 0;
        persistScenarios();
        formMessage.textContent = "La tabla comparativa se ha vaciado, pero el histórico sigue intacto.";
        renderScenarioTable();
      });

      clearHistoryButton.addEventListener("click", () => {
        state.history.length = 0;
        persistHistory();
        renderHistoryTable();
      });

      exportScenariosButton.addEventListener("click", exportScenariosToCsv);
      exportHistoryButton.addEventListener("click", exportHistoryToCsv);
      exportPlanJsonButton.addEventListener("click", exportCurrentTradePlanJson);
      exportPlanCsvButton.addEventListener("click", exportCurrentTradePlanCsv);

      [historySearchInput, historyTypeFilter, historyStrategyFilter].forEach((element) => {
        element.addEventListener("input", renderHistoryTable);
        element.addEventListener("change", renderHistoryTable);
      });
    }

    function init() {
      bootstrapState();
      bindEvents();
      renderScenarioTable();
      renderHistoryTable();
      resetResults();
    }

    return {
      init,
      state,
    };
  };
}(window));
