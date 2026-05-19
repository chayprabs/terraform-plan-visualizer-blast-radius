import { expect, test } from "@playwright/test";

test("renders the kubernetes manifest analyzer route", async ({ page }) => {
  await page.goto("/tools/kubernetes-manifest-analyzer");

  await expect(
    page.getByRole("heading", { name: /kubernetes manifest analyzer/i }),
  ).toBeVisible();
  await expect(
    page
      .locator('section[aria-label="Privacy notice"]')
      .getByText(/Local processing: your manifests are parsed in this browser tab\./),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /Paste YAML/i })).toBeVisible();
  await expect(
    page.getByText(/Analyze Kubernetes YAML to see the change summary\./i),
  ).toBeVisible();
});

test("loads the risky sample and analyzes it", async ({ page }) => {
  await page.goto("/tools/kubernetes-manifest-analyzer");

  await page.getByLabel(/Load sample manifests/i).selectOption("riskyManifest");
  await expect(page.locator("textarea")).toHaveValue(/kind: Deployment/);

  await page.getByRole("button", { name: /Analyze manifests/i }).click();

  await expect(page.getByText(/Success/i).first()).toBeVisible();
  await expect(page.getByText(/Overall risk: critical/i)).toBeVisible();
  await expect(page.getByText(/cluster-admin/i).first()).toBeVisible();
  await expect(page.getByText(/deprecated API version/i).first()).toBeVisible();
});
