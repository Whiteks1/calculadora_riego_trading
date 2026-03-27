(function attachBacktesterModule(globalObject) {
  const appNamespace = globalObject.TradingRiskApp || (globalObject.TradingRiskApp = {});

  appNamespace.createBacktester = function createBacktester(config) {
    const {
      backtestForm,
      loadBacktestExampleButton,
      backtestMessage,
      backtestChart,
      equityChart,
      backtestSignalBody,
      backtestTradesBody,
      backtestOutputs,
      shared,
    } = config;

    function average(values) {
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    function buildMovingAverage(prices, period) {
      return prices.map((_, index) => {
        if (index + 1 < period) {
          return null;
        }

        return average(prices.slice(index - period + 1, index + 1));
      });
    }

    function validateBacktestValues(values) {
      if (values.prices.length < 3 || values.prices.some((value) => !Number.isFinite(value) || value <= 0)) {
        return "Introduce una serie de precios válida con al menos 3 valores positivos.";
      }

      if (!Number.isInteger(values.shortPeriod) || values.shortPeriod < 1) {
        return "La media corta debe ser un entero mayor que 0.";
      }

      if (!Number.isInteger(values.longPeriod) || values.longPeriod <= values.shortPeriod) {
        return "La media larga debe ser un entero mayor que la media corta.";
      }

      if (values.prices.length < values.longPeriod) {
        return "La serie debe tener al menos tantos precios como la media larga.";
      }

      if (!Number.isFinite(values.initialCapital) || values.initialCapital <= 0) {
        return "Introduce un capital inicial mayor que 0.";
      }

      if (!Number.isFinite(values.commissionPercent) || values.commissionPercent < 0) {
        return "La comisión debe ser 0 o un valor positivo.";
      }

      if (!Number.isFinite(values.slippagePercent) || values.slippagePercent < 0) {
        return "El slippage debe ser 0 o un valor positivo.";
      }

      return "";
    }

    function runBacktest(values) {
      const shortSeries = buildMovingAverage(values.prices, values.shortPeriod);
      const longSeries = buildMovingAverage(values.prices, values.longPeriod);
      const signals = [];
      const trades = [];
      let cash = values.initialCapital;
      let units = 0;
      let openTrade = null;
      let peakEquity = values.initialCapital;
      let maxDrawdown = 0;

      for (let index = 0; index < values.prices.length; index += 1) {
        const price = values.prices[index];
        const shortMa = shortSeries[index];
        const longMa = longSeries[index];
        let signal = "HOLD";

        if (shortMa !== null && longMa !== null) {
          if (shortMa > longMa) {
            signal = "BUY";
          } else if (shortMa < longMa) {
            signal = "SELL";
          }
        }

        const buyPrice = price * (1 + values.slippagePercent / 100);
        const sellPrice = price * (1 - values.slippagePercent / 100);

        if (signal === "BUY" && units === 0) {
          const entryCommission = cash * (values.commissionPercent / 100);
          const investableCapital = cash - entryCommission;
          units = investableCapital / buyPrice;
          openTrade = {
            entryBar: index + 1,
            entryPrice: buyPrice,
            entryCapital: cash,
          };
          cash = 0;
        } else if (signal === "SELL" && units > 0 && openTrade) {
          const grossProceeds = units * sellPrice;
          const exitCommission = grossProceeds * (values.commissionPercent / 100);
          const netProceeds = grossProceeds - exitCommission;
          const profit = netProceeds - openTrade.entryCapital;

          trades.push({
            entryBar: openTrade.entryBar,
            exitBar: index + 1,
            exitReason: "Cruce a SELL",
            entryPrice: openTrade.entryPrice,
            exitPrice: sellPrice,
            profit,
            returnPercent: (profit / openTrade.entryCapital) * 100,
          });

          cash = netProceeds;
          units = 0;
          openTrade = null;
        }

        const equity = cash + units * price;
        peakEquity = Math.max(peakEquity, equity);
        maxDrawdown = Math.max(maxDrawdown, ((peakEquity - equity) / peakEquity) * 100);

        signals.push({
          bar: index + 1,
          price,
          shortMa,
          longMa,
          signal,
          equity,
        });
      }

      if (units > 0 && openTrade) {
        const sellPrice = values.prices[values.prices.length - 1] * (1 - values.slippagePercent / 100);
        const grossProceeds = units * sellPrice;
        const exitCommission = grossProceeds * (values.commissionPercent / 100);
        const netProceeds = grossProceeds - exitCommission;
        const profit = netProceeds - openTrade.entryCapital;

        trades.push({
          entryBar: openTrade.entryBar,
          exitBar: values.prices.length,
          exitReason: "Cierre final",
          entryPrice: openTrade.entryPrice,
          exitPrice: sellPrice,
          profit,
          returnPercent: (profit / openTrade.entryCapital) * 100,
        });

        cash = netProceeds;
        signals[signals.length - 1].equity = cash;
      }

      const winningTrades = trades.filter((trade) => trade.profit > 0).length;

      return {
        shortSeries,
        longSeries,
        signals,
        trades,
        finalCapital: cash,
        totalReturn: ((cash - values.initialCapital) / values.initialCapital) * 100,
        winRate: trades.length ? (winningTrades / trades.length) * 100 : 0,
        maxDrawdown,
        lastSignal: signals[signals.length - 1] ? signals[signals.length - 1].signal : "HOLD",
      };
    }

    function renderBacktestChart(prices, shortSeries, longSeries) {
      const width = 800;
      const height = 260;
      const padding = 24;
      const validValues = prices
        .concat(shortSeries.filter(Number.isFinite))
        .concat(longSeries.filter(Number.isFinite));

      if (validValues.length === 0) {
        backtestChart.innerHTML = "<text class=\"chart-empty\" x=\"50%\" y=\"50%\" text-anchor=\"middle\">Sin datos para dibujar</text>";
        return;
      }

      const minValue = Math.min(...validValues);
      const maxValue = Math.max(...validValues);
      const range = maxValue - minValue || 1;

      function buildPoints(series) {
        return series
          .map((value, index) => {
            if (!Number.isFinite(value)) {
              return null;
            }

            const x = padding + (index / Math.max(series.length - 1, 1)) * (width - padding * 2);
            const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
            return `${x},${y}`;
          })
          .filter(Boolean)
          .join(" ");
      }

      const gridLines = [0.2, 0.4, 0.6, 0.8]
        .map((ratio) => {
          const y = padding + (height - padding * 2) * ratio;
          return `<line class="chart-grid-line" x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}"></line>`;
        })
        .join("");

      backtestChart.innerHTML = `
        ${gridLines}
        <polyline class="chart-series price" points="${buildPoints(prices)}"></polyline>
        <polyline class="chart-series short" points="${buildPoints(shortSeries)}"></polyline>
        <polyline class="chart-series long" points="${buildPoints(longSeries)}"></polyline>
      `;
    }

    function renderEquityChart(signals) {
      const width = 800;
      const height = 220;
      const padding = 24;
      const equitySeries = signals.map((signal) => signal.equity).filter(Number.isFinite);

      if (equitySeries.length === 0) {
        equityChart.innerHTML = "<text class=\"chart-empty\" x=\"50%\" y=\"50%\" text-anchor=\"middle\">Sin equity para dibujar</text>";
        return;
      }

      const minValue = Math.min(...equitySeries);
      const maxValue = Math.max(...equitySeries);
      const range = maxValue - minValue || 1;

      const points = signals
        .map((signal, index) => {
          const x = padding + (index / Math.max(signals.length - 1, 1)) * (width - padding * 2);
          const y = height - padding - ((signal.equity - minValue) / range) * (height - padding * 2);
          return `${x},${y}`;
        })
        .join(" ");

      const gridLines = [0.25, 0.5, 0.75]
        .map((ratio) => {
          const y = padding + (height - padding * 2) * ratio;
          return `<line class="chart-grid-line" x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}"></line>`;
        })
        .join("");

      equityChart.innerHTML = `
        ${gridLines}
        <polyline class="chart-series equity" points="${points}"></polyline>
      `;
    }

    function renderBacktestTables(result) {
      const latestSignals = result.signals.slice(-12).reverse();

      backtestSignalBody.innerHTML = latestSignals.length
        ? latestSignals.map((signal) => `
            <tr>
              <td>${signal.bar}</td>
              <td>${shared.formatNumber(signal.price, 2)}</td>
              <td>${signal.shortMa === null ? "—" : shared.formatNumber(signal.shortMa, 2)}</td>
              <td>${signal.longMa === null ? "—" : shared.formatNumber(signal.longMa, 2)}</td>
              <td>${shared.escapeHtml(signal.signal)}</td>
            </tr>
          `).join("")
        : `
            <tr class="empty-row">
              <td colspan="5">Ejecuta un backtest para ver las señales generadas.</td>
            </tr>
          `;

      backtestTradesBody.innerHTML = result.trades.length
        ? result.trades.map((trade, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>Barra ${trade.entryBar} @ ${shared.formatNumber(trade.entryPrice, 2)}</td>
              <td>Barra ${trade.exitBar} @ ${shared.formatNumber(trade.exitPrice, 2)}</td>
              <td>${shared.escapeHtml(trade.exitReason)}</td>
              <td>${shared.formatCurrency(trade.profit)}</td>
              <td>${shared.formatPercent(trade.returnPercent, 2)}</td>
            </tr>
          `).join("")
        : `
            <tr class="empty-row">
              <td colspan="6">Todavía no hay operaciones del backtest.</td>
            </tr>
          `;
    }

    function updateBacktestResults(result) {
      backtestOutputs.finalCapital.textContent = shared.formatCurrency(result.finalCapital);
      backtestOutputs.totalReturn.textContent = shared.formatPercent(result.totalReturn, 2);
      backtestOutputs.totalTrades.textContent = String(result.trades.length);
      backtestOutputs.winRate.textContent = shared.formatPercent(result.winRate, 2);
      backtestOutputs.maxDrawdown.textContent = shared.formatPercent(result.maxDrawdown, 2);
      backtestOutputs.lastSignal.textContent = result.lastSignal;
    }

    function resetBacktestResults() {
      backtestOutputs.finalCapital.textContent = "--";
      backtestOutputs.totalReturn.textContent = "--";
      backtestOutputs.totalTrades.textContent = "--";
      backtestOutputs.winRate.textContent = "--";
      backtestOutputs.maxDrawdown.textContent = "--";
      backtestOutputs.lastSignal.textContent = "--";
      backtestSignalBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="5">Ejecuta un backtest para ver las señales generadas.</td>
        </tr>
      `;
      backtestTradesBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="6">Todavía no hay operaciones del backtest.</td>
        </tr>
      `;
      backtestChart.innerHTML = "<text class=\"chart-empty\" x=\"50%\" y=\"50%\" text-anchor=\"middle\">Carga una serie y ejecuta el backtest</text>";
      equityChart.innerHTML = "<text class=\"chart-empty\" x=\"50%\" y=\"50%\" text-anchor=\"middle\">La curva de equity aparecerá aquí</text>";
    }

    function bindEvents() {
      backtestForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = shared.readBacktestValues(backtestForm);
        const validationMessage = validateBacktestValues(values);

        if (validationMessage) {
          backtestMessage.textContent = validationMessage;
          resetBacktestResults();
          return;
        }

        const result = runBacktest(values);
        updateBacktestResults(result);
        renderBacktestChart(values.prices, result.shortSeries, result.longSeries);
        renderEquityChart(result.signals);
        renderBacktestTables(result);
        backtestMessage.textContent = "";
      });

      loadBacktestExampleButton.addEventListener("click", () => {
        backtestForm.elements.priceSeries.value = shared.demoPriceSeries;
        backtestForm.elements.shortPeriod.value = 3;
        backtestForm.elements.longPeriod.value = 6;
        backtestForm.elements.initialCapital.value = 10000;
        backtestForm.elements.commissionPercent.value = 0.1;
        backtestForm.elements.slippagePercent.value = 0.05;
        backtestForm.requestSubmit();
      });
    }

    function init() {
      bindEvents();
      resetBacktestResults();
    }

    return {
      init,
    };
  };
}(window));
