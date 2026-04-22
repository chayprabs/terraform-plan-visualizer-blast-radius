import { describe, expect, it } from "vitest";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import {
  buildModuleBreakdownRows,
  buildOutputChangeSummary,
  buildProviderBreakdownRows,
  buildResourceTypeBreakdownRows,
  buildSummaryMetrics,
  buildTerraformVersionSummary,
  hasMeaningfulResourceChanges,
} from "@/features/terraform-plan/domain/planDashboardSummary";
import type { TerraformPlan } from "@/features/terraform-plan/domain/terraformPlanTypes";
import { riskyPlan, tinyPlan } from "@/features/terraform-plan/fixtures/samplePlans";

function getMetricMap(plan: ReturnType<typeof normalizeTerraformPlan>) {
  return Object.fromEntries(
    buildSummaryMetrics(plan).map((metric) => [metric.key, metric.value]),
  );
}

describe("planDashboardSummary", () => {
  it("builds the riskyPlan dashboard counts and breakdowns", () => {
    const normalizedPlan = normalizeTerraformPlan(riskyPlan);
    const metrics = getMetricMap(normalizedPlan);
    const providerRows = buildProviderBreakdownRows(normalizedPlan.providers);
    const moduleRows = buildModuleBreakdownRows(normalizedPlan.modules);
    const resourceTypeRows = buildResourceTypeBreakdownRows(
      normalizedPlan.resourceTypeGroups,
    );
    const outputSummary = buildOutputChangeSummary(normalizedPlan.outputChanges);
    const versionSummary = buildTerraformVersionSummary(normalizedPlan);

    expect(metrics).toMatchObject({
      totalResourceChanges: 4,
      creates: 0,
      updates: 3,
      deletes: 0,
      replacements: 1,
      highRiskFindings: 4,
    });
    expect(providerRows).toEqual([
      {
        destructiveCount: 1,
        providerShortName: "aws",
        resourceCount: 4,
        resourceTypes: [
          "aws_db_instance",
          "aws_iam_role",
          "aws_s3_bucket_policy",
          "aws_security_group",
        ],
      },
    ]);
    expect(moduleRows).toEqual([
      {
        depth: 0,
        destructiveCount: 0,
        label: "Root module",
        resourceCount: 1,
      },
      {
        depth: 1,
        destructiveCount: 1,
        label: "module.data",
        resourceCount: 1,
      },
      {
        depth: 1,
        destructiveCount: 0,
        label: "module.identity",
        resourceCount: 1,
      },
      {
        depth: 1,
        destructiveCount: 0,
        label: "module.network",
        resourceCount: 1,
      },
    ]);
    expect(
      Object.fromEntries(resourceTypeRows.map((row) => [row.group, row.resourceCount])),
    ).toMatchObject({
      iam: 1,
      network: 1,
      database: 1,
      storage: 1,
      compute: 0,
      dns: 0,
      kms: 0,
      unknown: 0,
    });
    expect(outputSummary).toEqual({
      createdCount: 0,
      deletedCount: 0,
      sensitiveCount: 0,
      totalCount: 1,
      updatedCount: 1,
    });
    expect(versionSummary).toEqual({
      formatVersion: "1.3",
      terraformVersion: "1.8.5",
    });
    expect(normalizedPlan.riskReport?.level).toBe("critical");
    expect(hasMeaningfulResourceChanges(normalizedPlan.summary)).toBe(true);
  });

  it("builds the tinyPlan dashboard counts including no-op and unknown resource groups", () => {
    const normalizedPlan = normalizeTerraformPlan(tinyPlan);
    const metrics = getMetricMap(normalizedPlan);
    const providerRows = buildProviderBreakdownRows(normalizedPlan.providers);
    const moduleRows = buildModuleBreakdownRows(normalizedPlan.modules);
    const resourceTypeRows = buildResourceTypeBreakdownRows(
      normalizedPlan.resourceTypeGroups,
    );

    expect(metrics).toMatchObject({
      totalResourceChanges: 3,
      creates: 1,
      updates: 1,
      deletes: 0,
      replacements: 0,
      highRiskFindings: 0,
      noOps: 1,
    });
    expect(providerRows[0]).toMatchObject({
      providerShortName: "aws",
      resourceCount: 3,
      destructiveCount: 0,
    });
    expect(moduleRows).toEqual([
      {
        depth: 0,
        destructiveCount: 0,
        label: "Root module",
        resourceCount: 2,
      },
      {
        depth: 1,
        destructiveCount: 0,
        label: "module.network",
        resourceCount: 1,
      },
    ]);
    expect(
      Object.fromEntries(resourceTypeRows.map((row) => [row.group, row.resourceCount])),
    ).toMatchObject({
      storage: 1,
      network: 1,
      unknown: 1,
    });
  });

  it("stays resilient when optional Terraform metadata is absent and no-op is the only action", () => {
    const noChangePlan: TerraformPlan = {
      format_version: "1.3",
      resource_changes: [
        {
          address: "aws_s3_bucket.logs",
          mode: "managed",
          type: "aws_s3_bucket",
          name: "logs",
          provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
          change: {
            actions: ["no-op"],
            before: {
              bucket: "logs",
            },
            after: {
              bucket: "logs",
            },
          },
        },
      ],
    };

    const normalizedPlan = normalizeTerraformPlan(noChangePlan);
    const metrics = getMetricMap(normalizedPlan);
    const outputSummary = buildOutputChangeSummary(normalizedPlan.outputChanges);
    const versionSummary = buildTerraformVersionSummary(normalizedPlan);

    expect(metrics).toMatchObject({
      totalResourceChanges: 1,
      creates: 0,
      updates: 0,
      deletes: 0,
      replacements: 0,
      highRiskFindings: 0,
      noOps: 1,
    });
    expect(outputSummary).toEqual({
      createdCount: 0,
      deletedCount: 0,
      sensitiveCount: 0,
      totalCount: 0,
      updatedCount: 0,
    });
    expect(versionSummary).toEqual({
      formatVersion: "1.3",
      terraformVersion: null,
    });
    expect(normalizedPlan.riskReport?.level).toBe("low");
    expect(hasMeaningfulResourceChanges(normalizedPlan.summary)).toBe(false);
  });
});
