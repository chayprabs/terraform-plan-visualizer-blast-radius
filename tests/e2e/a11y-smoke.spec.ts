import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { availableProductTools } from "../../src/lib/shared/tools-registry";

for (const tool of availableProductTools) {
  test(`${tool.title} route passes landmark and axe checks`, async ({ page }) => {
    await page.goto(tool.href);

    await expect(page.getByRole("heading", { level: 1 })).toBeAttached();
    await expect(
      page.getByRole("banner").getByRole("navigation", { name: /External links/i }),
    ).toBeVisible();
    await expect(page.locator('section[aria-label="Privacy notice"]')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
}
