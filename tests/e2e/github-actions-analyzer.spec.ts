import { expect, test } from "@playwright/test";

test("renders the github actions analyzer route", async ({ page }) => {
  await page.goto("/tools/github-actions-analyzer");

  await expect(
    page.getByRole("heading", { name: /github actions workflow analyzer/i }),
  ).toBeVisible();
  await expect(
    page
      .locator('section[aria-label="Privacy notice"]')
      .getByText(/Local processing: your workflow YAML is parsed in this browser tab\./),
  ).toBeVisible();
  await expect(
    page.getByText(/Analyze a workflow to inspect security findings\./i),
  ).toBeVisible();
});

test("loads the risky sample and analyzes it", async ({ page }) => {
  await page.goto("/tools/github-actions-analyzer");

  await page.getByLabel(/Load sample workflow/i).selectOption("risky");
  await expect(page.locator("textarea")).toHaveValue(/pull_request_target/);

  await page.getByRole("button", { name: /Analyze workflow/i }).click();

  await expect(page.getByText(/Analysis complete\./i)).toBeVisible();
  await expect(page.getByText(/pull_request_target/i).first()).toBeVisible();
  await expect(page.getByText(/write-all permissions/i).first()).toBeVisible();
  await expect(page.getByText(/unpinned action/i).first()).toBeVisible();
});
