import { expect, test } from "@playwright/test";

test("renders the secrets redactor route", async ({ page }) => {
  await page.goto("/tools/secrets-redactor");

  await expect(
    page.getByRole("heading", { name: /secrets redactor/i }),
  ).toBeVisible();
  await expect(
    page
      .locator('section[aria-label="Privacy notice"]')
      .getByText(/Local processing: your text is redacted entirely in this browser tab\./),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /Paste text/i })).toBeVisible();
  await expect(
    page.getByText(/Paste or upload text to preview redacted output\./i),
  ).toBeVisible();
});

test("redacts pasted secret-like text in the preview", async ({ page }) => {
  await page.goto("/tools/secrets-redactor");

  const secret = "AKIAIOSFODNN7EXAMPLE";
  await page.locator("#secrets-redactor-input").fill(
    `export AWS_ACCESS_KEY_ID=${secret}`,
  );

  const preview = page.getByLabel(/Redacted output preview/i);
  await expect(preview).not.toHaveValue(new RegExp(secret));
  await expect(preview).toHaveValue(/\[redacted\]/);
  await expect(page.getByText(/1 replacement applied/i)).toBeVisible();
});
