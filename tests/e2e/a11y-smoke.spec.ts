import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { availableAuthosTools } from "../../src/lib/authos/tools-registry";

for (const tool of availableAuthosTools) {
  test(`${tool.title} route passes landmark and axe checks`, async ({ page }) => {
    await page.goto(tool.href);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: /Authos tools/i })).toBeVisible();
    await expect(page.locator('section[aria-label="Privacy notice"]')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
}
