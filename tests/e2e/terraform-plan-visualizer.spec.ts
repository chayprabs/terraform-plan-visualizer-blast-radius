import { expect, test } from "@playwright/test";

test("renders the terraform plan visualizer route", async ({ page }) => {
  await page.goto("/tools/terraform-plan-visualizer");

  await expect(
    page.getByRole("heading", { name: /terraform plan visualizer/i }),
  ).toBeVisible();
  await expect(
    page
      .locator('section[aria-label="Privacy notice"]')
      .getByText(/Local processing: your plan is parsed in this browser tab\./),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /Paste JSON/i })).toBeVisible();
  await expect(
    page.getByText(/Analyze a Terraform plan to see the change summary\./i),
  ).toBeVisible();
});

test("loads the risky sample and analyzes it", async ({ page }) => {
  await page.goto("/tools/terraform-plan-visualizer");

  await page.getByLabel(/Load sample plan/i).selectOption("riskyPlan");
  await expect(page.locator("textarea")).toHaveValue(/"format_version": "1\.3"/);

  await page.getByRole("button", { name: /Analyze plan/i }).click();

  await expect(page.getByText(/Success/i).first()).toBeVisible();
  await expect(page.getByText(/Total resource changes/i)).toBeVisible();
  await expect(page.getByText(/Provider breakdown/i)).toBeVisible();
  await expect(page.getByText(/module\.network/i)).toBeVisible();
});
