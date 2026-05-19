import { expect, test } from "@playwright/test";
import { analyzeRiskySample } from "./terraform-plan-helpers";

test("exports a redacted PR comment after analyzing risky sample", async ({
  page,
}) => {
  await page.goto("/tools/terraform-plan-visualizer");

  await analyzeRiskySample(page);

  const exportSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Export" }) });

  const copyButton = exportSection.getByRole("button", {
    name: "Copy PR comment",
    exact: true,
  });

  await expect(copyButton).toBeEnabled();
  await copyButton.click();

  await expect(
    exportSection.getByRole("status").filter({ hasText: /Copied PR comment/i }),
  ).toBeVisible();
});
