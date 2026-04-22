import { describe, expect, it } from "vitest";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import {
  buildPlanSummary,
  getChangedResources,
  getDestructiveResources,
  getReplacementResources,
} from "@/features/terraform-plan/domain/planSummary";
import type { TerraformPlan } from "@/features/terraform-plan/domain/terraformPlanTypes";
import { riskyPlan, tinyPlan } from "@/features/terraform-plan/fixtures/samplePlans";

describe("normalizeTerraformPlan", () => {
  it("normalizes tinyPlan into a summary, providers, modules, and resource groups", () => {
    const normalizedPlan = normalizeTerraformPlan(tinyPlan);

    expect(normalizedPlan.summary).toEqual({
      totalResourceChanges: 3,
      totalOutputChanges: 0,
      createCount: 1,
      updateCount: 1,
      deleteCount: 0,
      replaceCount: 0,
      noOpCount: 1,
      readCount: 0,
      importCount: 0,
      forgetCount: 0,
      unknownCount: 0,
      highRiskCount: 0,
    });
    expect(normalizedPlan.riskReport?.level).toBe("low");
    expect(normalizedPlan.providers[0]?.shortName).toBe("aws");
    expect(normalizedPlan.modules.map((module) => module.addressPrefix)).toEqual(
      ["root", "module.network"],
    );
    expect(
      normalizedPlan.resourceTypeGroups.find((group) => group.group === "network")
        ?.resourceCount,
    ).toBe(1);
  });

  it("normalizes riskyPlan with destructive resources and output changes", () => {
    const normalizedPlan = normalizeTerraformPlan(riskyPlan);

    expect(normalizedPlan.summary.replaceCount).toBe(1);
    expect(normalizedPlan.summary.highRiskCount).toBe(4);
    expect(normalizedPlan.riskReport?.level).toBe("critical");
    expect(normalizedPlan.riskReport?.highRiskFindingCount).toBe(4);
    expect(normalizedPlan.outputChanges).toHaveLength(1);
    expect(getDestructiveResources(normalizedPlan)).toHaveLength(1);
    expect(getReplacementResources(normalizedPlan)[0]?.type).toBe(
      "aws_db_instance",
    );
    expect(getChangedResources(normalizedPlan)).toHaveLength(4);
  });

  it("treats unusual action arrays as unknown during normalization", () => {
    const unusualPlan: TerraformPlan = {
      format_version: "1.3",
      resource_changes: [
        {
          address: "aws_instance.example",
          mode: "managed",
          type: "aws_instance",
          name: "example",
          provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
          change: {
            actions: ["create", "read"],
            before: null,
            after: {
              ami: "ami-12345",
            },
          },
        },
      ],
      output_changes: {
        report: {
          actions: ["read", "delete"],
          before: "old",
          after: "new",
        },
      },
    };

    const normalizedPlan = normalizeTerraformPlan(unusualPlan);

    expect(normalizedPlan.resourceChanges[0]?.action).toBe("unknown");
    expect(normalizedPlan.summary.unknownCount).toBe(1);
    expect(normalizedPlan.outputChanges[0]?.action).toBe("unknown");
  });

  it("rebuilds plan summary deterministically from normalized data", () => {
    const normalizedPlan = normalizeTerraformPlan(riskyPlan);

    expect(buildPlanSummary(normalizedPlan)).toEqual(normalizedPlan.summary);
  });
});
