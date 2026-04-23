import { describe, expect, it } from "vitest";
import { applyCostImpactToPlan } from "@/features/terraform-plan/cost/applyCostImpact";
import {
  DEFAULT_COST_IMPACT_STATE,
  DEFAULT_COST_THRESHOLDS,
} from "@/features/terraform-plan/cost/costTypes";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import type { TerraformPlan } from "@/features/terraform-plan/domain/terraformPlanTypes";

const costPlanFixture: TerraformPlan = {
  format_version: "1.3",
  resource_changes: [
    {
      address: "module.app.aws_instance.medium",
      module_address: "module.app",
      mode: "managed",
      type: "aws_instance",
      name: "medium",
      provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
      change: {
        actions: ["update"],
        after: {
          instance_type: "t3.medium",
        },
        before: {
          instance_type: "t3.small",
        },
      },
    },
    {
      address: "module.app.aws_instance.high",
      module_address: "module.app",
      mode: "managed",
      type: "aws_instance",
      name: "high",
      provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
      change: {
        actions: ["update"],
        after: {
          instance_type: "m6i.large",
        },
        before: {
          instance_type: "t3.medium",
        },
      },
    },
    {
      address: "module.app.aws_instance.critical",
      module_address: "module.app",
      mode: "managed",
      type: "aws_instance",
      name: "critical",
      provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
      change: {
        actions: ["update"],
        after: {
          instance_type: "m6i.2xlarge",
        },
        before: {
          instance_type: "m6i.large",
        },
      },
    },
  ],
};

describe("cost threshold findings", () => {
  it("adds medium, high, critical, and plan-wide cost findings when thresholds are exceeded", () => {
    const normalizedPlan = normalizeTerraformPlan(costPlanFixture);
    const planWithCost = applyCostImpactToPlan(normalizedPlan, {
      ...DEFAULT_COST_IMPACT_STATE,
      importedReport: {
        currency: "USD",
        entries: [
          {
            address: "module.app.aws_instance.medium",
            currency: "USD",
            id: "medium",
            monthlyCostAfter: 170,
            monthlyCostBefore: 20,
            monthlyDelta: 150,
            name: "module.app.aws_instance.medium",
            projectName: "app",
            source: "infracost",
          },
          {
            address: "module.app.aws_instance.high",
            currency: "USD",
            id: "high",
            monthlyCostAfter: 720,
            monthlyCostBefore: 70,
            monthlyDelta: 650,
            name: "module.app.aws_instance.high",
            projectName: "app",
            source: "infracost",
          },
          {
            address: "module.app.aws_instance.critical",
            currency: "USD",
            id: "critical",
            monthlyCostAfter: 2550,
            monthlyCostBefore: 49,
            monthlyDelta: 2501,
            name: "module.app.aws_instance.critical",
            projectName: "app",
            source: "infracost",
          },
        ],
        totalMonthlyCostAfter: 3440,
        totalMonthlyCostBefore: 139,
        totalMonthlyDelta: 3301,
        warnings: [],
      },
      thresholds: DEFAULT_COST_THRESHOLDS,
    });

    const findings = planWithCost.riskReport?.findings ?? [];

    expect(
      findings.some(
        (finding) =>
          finding.id === "resource-cost-increase:module.app.aws_instance.medium" &&
          finding.severity === "medium",
      ),
    ).toBe(true);
    expect(
      findings.some(
        (finding) =>
          finding.id === "resource-cost-increase:module.app.aws_instance.high" &&
          finding.severity === "high",
      ),
    ).toBe(true);
    expect(
      findings.some(
        (finding) =>
          finding.id ===
            "resource-cost-increase:module.app.aws_instance.critical" &&
          finding.severity === "critical",
      ),
    ).toBe(true);
    expect(
      findings.some(
        (finding) =>
          finding.id === "plan-cost-increase" &&
          finding.severity === "critical",
      ),
    ).toBe(true);
    expect(planWithCost.costEstimate?.mappedResourceCount).toBe(3);
  });

  it("leaves the plan unchanged when no cost data is provided", () => {
    const normalizedPlan = normalizeTerraformPlan(costPlanFixture);

    expect(applyCostImpactToPlan(normalizedPlan, DEFAULT_COST_IMPACT_STATE)).toBe(
      normalizedPlan,
    );
  });
});
