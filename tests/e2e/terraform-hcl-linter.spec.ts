import { expect, test } from "@playwright/test";

test("renders the terraform hcl linter route", async ({ page }) => {
  await page.goto("/tools/terraform-hcl-linter");

  await expect(
    page.getByRole("heading", { name: /terraform hcl linter/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: /terraform hcl input/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Analyze HCL/i })).toBeVisible();
});

test("analyzes sample hcl and shows lint and docs tabs", async ({ page }) => {
  await page.goto("/tools/terraform-hcl-linter");

  await page.getByRole("button", { name: /Analyze HCL/i }).click();

  await expect(page.getByText(/findings/i).first()).toBeVisible();
  await expect(page.getByRole("tab", { name: /^Lint$/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /^Docs$/i })).toBeVisible();
  await expect(page.getByText(/public-cidr/i).first()).toBeVisible();

  await page.getByRole("tab", { name: /^Docs$/i }).click();
  await expect(page.getByText(/## Variables/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Copy markdown/i })).toBeVisible();
});
