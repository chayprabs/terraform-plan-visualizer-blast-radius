import { expect, test } from "@playwright/test";
import { analyzeRiskySample, getPlanEditor } from "./terraform-plan-helpers";

test("remembers and reopens a local analysis session", async ({ page }) => {
  await page.goto("/");

  await analyzeRiskySample(page);

  await page.getByRole("checkbox", { name: /Remember recent analyses/i }).check();

  const reopenButton = page.getByRole("button", { name: /^Reopen$/i }).first();

  await expect(reopenButton).toBeEnabled({ timeout: 15_000 });
  await expect(page.getByText(/riskyPlan\.json/i).first()).toBeVisible();

  await reopenButton.click();

  await expect(page.getByLabel("Analysis output")).toContainText(/Success/i, {
    timeout: 30_000,
  });
  await expect(getPlanEditor(page)).toHaveValue(/"format_version": "1\.3"/);
  await expect(page.getByText(/Total resource changes/i)).toBeVisible();
});

test("shows a friendly invalid JSON error", async ({ page }) => {
  await page.goto("/");

  await getPlanEditor(page).fill("{ not valid json");
  await page.getByRole("button", { name: /Analyze plan/i }).click();

  await expect(
    page
      .getByLabel("Analysis output")
      .getByText(/could not be parsed as JSON/i),
  ).toBeVisible();
});
