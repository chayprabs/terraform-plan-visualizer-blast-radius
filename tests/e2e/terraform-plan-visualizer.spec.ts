import { expect, test } from "@playwright/test";
import { analyzeRiskySample } from "./terraform-plan-helpers";

test("renders the terraform plan visualizer route", async ({ page }) => {
  await page.goto("/tools/terraform-plan-visualizer");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /terraform plan visualizer/i,
    }),
  ).toBeVisible();
  await expect(
    page
      .getByLabel("Workspace privacy notice")
      .getByText(/Local processing: your plan is parsed in this browser tab\./),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /Paste JSON/i })).toBeVisible();
  await expect(
    page.getByText(/Analyze a Terraform plan to see the change summary\./i),
  ).toBeVisible();
});

test("loads the risky sample and analyzes it", async ({ page }) => {
  await page.goto("/tools/terraform-plan-visualizer");

  await analyzeRiskySample(page);

  const outputPanel = page.getByLabel("Analysis output");

  await expect(outputPanel.getByText(/Total resource changes/i)).toBeVisible();
  await expect(outputPanel.getByText(/Provider breakdown/i)).toBeVisible();
  await expect(
    outputPanel.getByRole("button", {
      name: "module.network.aws_security_group.web",
      exact: true,
    }),
  ).toBeVisible();
});
