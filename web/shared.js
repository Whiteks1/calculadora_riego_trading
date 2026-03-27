(function attachSharedModule(globalObject) {
  const appNamespace = globalObject.TradingRiskApp || (globalObject.TradingRiskApp = {});

  const STORAGE_KEYS = {
    scenarios: "trading-risk-scenarios",
    history: "trading-risk-history",
  };

  const exampleValues = {
    capital: 10000,
    riskPercent: 1,
    entryPrice: 1.205,
    stopLoss: 1.198,
    exitPrice: 1.219,
    feePercent: 0.08,
    slippagePercent: 0.02,
    strategyName: "Breakout diario",
    tradeNotes: "Ruptura con objetivo 2R y contexto favorable en sesión europea.",
  };

  const demoPriceSeries = [
    100, 102, 101, 104, 106, 107, 108, 106, 109, 111, 114, 113,
    116, 118, 117, 119, 121, 120, 122, 124, 123, 126, 128, 127,
    129, 131, 130, 132, 135, 134, 136, 138, 137, 139, 141, 140,
  ].join(", ");

  function formatCurrency(value) {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }).format(value);
  }

  function formatNumber(value, digits) {
    const maximumFractionDigits = typeof digits === "number" ? digits : 2;

    return new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 0,
      maximumFractionDigits,
    }).format(value);
  }

  function formatPercent(value, digits) {
    return `${formatNumber(value, typeof digits === "number" ? digits : 2)}%`;
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  }

  function truncateText(value, maxLength) {
    if (!value) {
      return "—";
    }

    const limit = typeof maxLength === "number" ? maxLength : 48;
    return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
  }

  function generateId() {
    if (globalObject.crypto && typeof globalObject.crypto.randomUUID === "function") {
      return globalObject.crypto.randomUUID();
    }

    return `scenario-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function readTradeFormValues(form) {
    const formData = new FormData(form);

    return {
      capital: Number(formData.get("capital")),
      riskPercent: Number(formData.get("riskPercent")),
      entryPrice: Number(formData.get("entryPrice")),
      stopLoss: Number(formData.get("stopLoss")),
      exitPrice: Number(formData.get("exitPrice")),
      feePercent: Number(formData.get("feePercent") || 0),
      slippagePercent: Number(formData.get("slippagePercent") || 0),
      strategyName: String(formData.get("strategyName") || "").trim(),
      tradeNotes: String(formData.get("tradeNotes") || "").trim(),
    };
  }

  function parsePriceSeries(rawValue) {
    return rawValue
      .split(/[\s,;]+/)
      .map((value) => value.trim())
      .filter(Boolean)
      .map(Number);
  }

  function readBacktestValues(form) {
    const formData = new FormData(form);

    return {
      prices: parsePriceSeries(String(formData.get("priceSeries") || "")),
      shortPeriod: Number(formData.get("shortPeriod")),
      longPeriod: Number(formData.get("longPeriod")),
      initialCapital: Number(formData.get("initialCapital")),
      commissionPercent: Number(formData.get("commissionPercent")),
      slippagePercent: Number(formData.get("slippagePercent")),
    };
  }

  function persistRecords(storageKey, records) {
    globalObject.localStorage.setItem(storageKey, JSON.stringify(records));
  }

  function normalizeStoredRecord(rawRecord, index, riskEngine) {
    if (!rawRecord || typeof rawRecord !== "object") {
      return null;
    }

    const normalizedValues = {
      capital: Number(rawRecord.capital),
      riskPercent: Number(rawRecord.riskPercent),
      entryPrice: Number(rawRecord.entryPrice),
      stopLoss: Number(rawRecord.stopLoss),
      exitPrice: Number(rawRecord.exitPrice),
      feePercent: Number(rawRecord.feePercent || 0),
      slippagePercent: Number(rawRecord.slippagePercent || 0),
      strategyName: typeof rawRecord.strategy === "string" ? rawRecord.strategy : "",
      tradeNotes: typeof rawRecord.notes === "string" ? rawRecord.notes : "",
    };

    if (riskEngine.validateTradeValues(normalizedValues)) {
      return null;
    }

    const timestamp = rawRecord.createdAt || new Date(Date.now() - index * 60000).toISOString();
    const tradePlan = riskEngine.createTradePlan(normalizedValues, {
      generatedAt: timestamp,
    });

    return {
      id: typeof rawRecord.id === "string" ? rawRecord.id : generateId(),
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

  function loadRecords(storageKey, riskEngine) {
    try {
      const rawValue = globalObject.localStorage.getItem(storageKey);

      if (!rawValue) {
        return [];
      }

      const parsedRecords = JSON.parse(rawValue);

      if (!Array.isArray(parsedRecords)) {
        return [];
      }

      return parsedRecords
        .map((record, index) => normalizeStoredRecord(record, index, riskEngine))
        .filter(Boolean);
    } catch (error) {
      console.error(`No se pudieron cargar los datos de ${storageKey}.`, error);
      return [];
    }
  }

  function escapeCsvValue(value) {
    const stringValue = String(value);

    if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
      return `"${stringValue.replaceAll("\"", "\"\"")}"`;
    }

    return stringValue;
  }

  function downloadTextFile(filename, content, mimeType) {
    const blob = new Blob([content], {
      type: mimeType || "text/plain;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }

  appNamespace.shared = {
    STORAGE_KEYS,
    exampleValues,
    demoPriceSeries,
    formatCurrency,
    formatNumber,
    formatPercent,
    formatDate,
    escapeHtml,
    truncateText,
    generateId,
    readTradeFormValues,
    readBacktestValues,
    loadRecords,
    persistRecords,
    escapeCsvValue,
    downloadTextFile,
  };
}(window));
