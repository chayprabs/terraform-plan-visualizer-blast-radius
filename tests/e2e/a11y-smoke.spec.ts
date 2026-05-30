import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("home page passes landmark and axe checks", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: /External links/i }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Workspace privacy notice"),
  ).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
