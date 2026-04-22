import { describe, expect, it } from "vitest";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import type { TerraformPlan } from "@/features/terraform-plan/domain/terraformPlanTypes";
import { riskyPlan, tinyPlan } from "@/features/terraform-plan/fixtures/samplePlans";
import {
  buildResourceTableItems,
  filterAndSortResourceTableItems,
  shouldIncludeNoOpByDefault,
} from "@/features/terraform-plan/components/resources/resourceTableModel";

function createLargePlanWithNoOps(): TerraformPlan {
  return {
    format_version: "1.3",
    resource_changes: [
      ...Array.from({ length: 22 }, (_, index) => ({
        address: `aws_cloudwatch_log_group.app_${index}`,
        mode: "managed" as const,
        type: "aws_cloudwatch_log_group",
        name: `app_${index}`,
        provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
        change: {
          actions: ["no-op"],
          before: {
            retention_in_days: 30,
          },
          after: {
            retention_in_days: 30,
          },
        },
      })),
      {
        address: "module.compute.aws_instance.api",
        module_address: "module.compute",
        mode: "managed",
        type: "aws_instance",
        name: "api",
        provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
        change: {
          actions: ["update"],
          before: {
            instance_type: "t3.small",
          },
          after: {
            instance_type: "t3.medium",
          },
        },
      },
      {
        address: "module.compute.aws_instance.worker",
        module_address: "module.compute",
        mode: "managed",
        type: "aws_instance",
        name: "worker",
        provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
        change: {
          actions: ["update"],
          before: {
            instance_type: "t3.small",
          },
          after: {
            instance_type: "t3.medium",
          },
        },
      },
    ],
  };
}

describe("resourceTableModel", () => {
  it("builds table rows with derived counts and risk metadata", () => {
    const normalizedPlan = normalizeTerraformPlan(riskyPlan);
    const items = buildResourceTableItems(normalizedPlan.resourceChanges);
    const databaseItem = items.find((item) => item.type === "aws_db_instance");
    const storageItem = items.find((item) => item.type === "aws_s3_bucket_policy");

    expect(databaseItem?.riskSeverity).toBe("critical");
    expect(databaseItem?.replacePathsCount).toBe(1);
    expect(databaseItem?.changedAttributesCount).toBe(2);
    expect(storageItem?.hasSensitiveChange).toBe(true);
    expect(storageItem?.changedAttributesCount).toBe(1);
  });

  it("filters and sorts deterministically", () => {
    const normalizedPlan = normalizeTerraformPlan(riskyPlan);
    const items = buildResourceTableItems(normalizedPlan.resourceChanges);
    const sortedByRisk = filterAndSortResourceTableItems(items, {
      action: "all",
      includeNoOp: true,
      module: "all",
      provider: "all",
      resourceGroup: "all",
      search: "",
      severity: "all",
      sortBy: "risk",
    });
    const filteredHighUpdates = filterAndSortResourceTableItems(items, {
      action: "update",
      includeNoOp: true,
      module: "all",
      provider: "all",
      resourceGroup: "all",
      search: "",
      severity: "high",
      sortBy: "address",
    });

    expect(sortedByRisk.map((item) => item.address)).toEqual([
      "module.data.aws_db_instance.primary",
      "aws_s3_bucket_policy.logs",
      "module.network.aws_security_group.web",
      "module.identity.aws_iam_role.app",
    ]);
    expect(filteredHighUpdates.map((item) => item.address)).toEqual([
      "aws_s3_bucket_policy.logs",
      "module.network.aws_security_group.web",
    ]);
  });

  it("only hides no-op resources by default when the plan is large", () => {
    const normalizedTinyPlan = normalizeTerraformPlan(tinyPlan);
    const normalizedLargePlan = normalizeTerraformPlan(createLargePlanWithNoOps());

    expect(shouldIncludeNoOpByDefault(normalizedTinyPlan)).toBe(true);
    expect(shouldIncludeNoOpByDefault(normalizedLargePlan)).toBe(false);
  });
});
