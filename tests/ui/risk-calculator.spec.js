const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("guarda un escenario y lo restaura tras recargar", async ({ page }) => {
  await page.getByRole("button", { name: "Cargar ejemplo" }).click();

  await expect(page.locator("#tradeTypeBadge")).toHaveText("LONG");
  await page.getByRole("button", { name: "Guardar escenario" }).click();

  await expect(page.locator("#scenarioCountBadge")).toHaveText("1 escenario");
  await expect(page.locator("#historyCountBadge")).toHaveText("1 / 1 registros");
  await expect(page.locator("#scenarioTableBody")).toContainText("Breakout diario");

  await page.reload();

  await expect(page.locator("#scenarioCountBadge")).toHaveText("1 escenario");
  await expect(page.locator("#historyCountBadge")).toHaveText("1 / 1 registros");
  await expect(page.locator("#scenarioTableBody")).toContainText("Breakout diario");
});

test("bloquea un objetivo incoherente para un setup short", async ({ page }) => {
  await page.locator("#capital").fill("2000");
  await page.locator("#riskPercent").fill("1");
  await page.locator("#entryPrice").fill("50");
  await page.locator("#stopLoss").fill("55");
  await page.locator("#exitPrice").fill("60");
  await page.locator("#feePercent").fill("0");
  await page.locator("#slippagePercent").fill("0");
  await page.getByRole("button", { name: "Calcular riesgo" }).click();

  await expect(page.locator("#formMessage")).toContainText("SHORT");
  await expect(page.locator("#potentialProfit")).toHaveText("--");
  await expect(page.locator("#tradeTypeBadge")).toHaveText("Esperando datos");
});
