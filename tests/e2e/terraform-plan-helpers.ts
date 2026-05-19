import { expect, type Page } from "@playwright/test";

export function getPlanEditor(page: Page) {
  return page.getByRole("textbox", { name: /Terraform plan JSON/i });
}

export async function analyzeRiskySample(page: Page) {
  await page.getByLabel(/Load sample plan/i).selectOption("riskyPlan");
  await expect(getPlanEditor(page)).toHaveValue(/"format_version": "1\.3"/);
  await page.getByRole("button", { name: /Analyze plan/i }).click();
  await expect(page.getByText(/Success/i).first()).toBeVisible({
    timeout: 30_000,
  });
}
