import { describe, expect, it } from "vitest";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import type { NormalizedResourceChange } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import type { TerraformPlan } from "@/features/terraform-plan/domain/terraformPlanTypes";
import {
  evaluatePlanRisk,
  evaluateResourceRisk,
  getHighestSeverity,
} from "@/features/terraform-plan/risk/evaluateRisk";
import { riskyPlan, tinyPlan } from "@/features/terraform-plan/fixtures/samplePlans";

function getResourceByType(
  plan: ReturnType<typeof normalizeTerraformPlan>,
  type: string,
): NormalizedResourceChange {
  const resource = plan.resourceChanges.find((change) => change.type === type);

  if (!resource) {
    throw new Error(`Missing resource type ${type}`);
  }

  return resource;
}

describe("evaluateResourceRisk", () => {
  it("returns a scored resource summary with tags and highest severity", () => {
    const normalizedPlan = normalizeTerraformPlan(riskyPlan);
    const databaseResource = getResourceByType(normalizedPlan, "aws_db_instance");
    const summary = evaluateResourceRisk(databaseResource);

    expect(summary.highestSeverity).toBe("critical");
    expect(summary.score).toBeGreaterThan(0);
    expect(summary.tags).toEqual(
      expect.arrayContaining(["child-module", "module.data"]),
    );
    expect(
      summary.findings.some((finding) =>
        finding.id.startsWith("database-replacement"),
      ),
    ).toBe(true);
  });
});

describe("evaluatePlanRisk", () => {
  it("produces critical and high findings for riskyPlan", () => {
    const normalizedPlan = normalizeTerraformPlan(riskyPlan);
    const report = evaluatePlanRisk(normalizedPlan);

    expect(report.level).toBe("critical");
    expect(report.score).toBeGreaterThanOrEqual(75);
    expect(report.highRiskFindingCount).toBeGreaterThanOrEqual(3);
    expect(report.findings.map((finding) => finding.severity)).toEqual(
      expect.arrayContaining(["critical", "high"]),
    );
  });

  it("keeps tinyPlan at a lower overall risk level", () => {
    const normalizedPlan = normalizeTerraformPlan(tinyPlan);
    const report = evaluatePlanRisk(normalizedPlan);

    expect(report.level).toBe("low");
    expect(report.score).toBeLessThan(15);
    expect(report.highRiskFindingCount).toBe(0);
  });

  it("never renders secret values inside findings", () => {
    const secretPlan: TerraformPlan = {
      format_version: "1.3",
      resource_changes: [
        {
          address: "aws_secretsmanager_secret_version.api",
          mode: "managed",
          type: "aws_secretsmanager_secret_version",
          name: "api",
          provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
          change: {
            actions: ["update"],
            before: {
              secret_string: "old-secret-value",
            },
            after: {
              secret_string: "new-secret-value",
            },
          },
        },
      ],
    };
    const normalizedPlan = normalizeTerraformPlan(secretPlan);
    const report = evaluatePlanRisk(normalizedPlan);
    const serializedFindings = JSON.stringify(report.findings);

    expect(serializedFindings).not.toContain("old-secret-value");
    expect(serializedFindings).not.toContain("new-secret-value");
    expect(
      report.findings.some((finding) => finding.category === "secrets"),
    ).toBe(true);
  });
});

describe("getHighestSeverity", () => {
  it("returns the highest severity from a finding list and handles empty lists", () => {
    const normalizedPlan = normalizeTerraformPlan(riskyPlan);
    const report = evaluatePlanRisk(normalizedPlan);

    expect(getHighestSeverity(report.findings)).toBe("critical");
    expect(getHighestSeverity([])).toBeNull();
  });
});
