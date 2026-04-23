import { describe, expect, it } from "vitest";
import { applyCostImpactToPlan } from "@/features/terraform-plan/cost/applyCostImpact";
import { DEFAULT_COST_IMPACT_STATE } from "@/features/terraform-plan/cost/costTypes";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import { buildJsonReport, buildTerraformPlanExportData } from "@/features/terraform-plan/export/buildJsonReport";
import { createBlastRadiusPlan } from "./blastRadiusTestPlan";
import { SECRET_TEST_VALUES } from "./secretTestValues";

describe("buildJsonReport", () => {
  it("includes schemaVersion and excludes known secret fixture values by default", () => {
    const normalizedPlan = applyCostImpactToPlan(
      normalizeTerraformPlan(createBlastRadiusPlan()),
      {
        ...DEFAULT_COST_IMPACT_STATE,
        importedReport: {
          currency: "USD",
          entries: [
            {
              address: "module.data.aws_db_instance.primary",
              currency: "USD",
              id: "db-primary",
              monthlyCostAfter: 860,
              monthlyCostBefore: 240,
              monthlyDelta: 620,
              name: "module.data.aws_db_instance.primary",
              projectName: "app",
              source: "infracost",
            },
          ],
          totalMonthlyCostAfter: 860,
          totalMonthlyCostBefore: 240,
          totalMonthlyDelta: 620,
          warnings: [],
        },
      },
    );
    const report = normalizedPlan.riskReport;

    if (!report) {
      throw new Error("Expected a risk report for export test data.");
    }

    normalizedPlan.riskReport = {
      ...report,
      findings: report.findings.map((finding, index) =>
        index === 0
          ? {
              ...finding,
              evidence: [
                ...finding.evidence,
                `GitHub token: ${SECRET_TEST_VALUES.githubToken}`,
                `Private key: ${SECRET_TEST_VALUES.privateKey.replace(/\n/g, "")}`,
              ],
            }
          : finding,
      ),
    };

    const exportData = buildTerraformPlanExportData({
      normalizedPlan,
      sourceName: `plan-${SECRET_TEST_VALUES.githubToken}.json`,
    });
    const json = buildJsonReport(exportData);
    const parsed = JSON.parse(json) as {
      findings: Array<{ evidence: string[] }>;
      privacy: { redacted: boolean };
      schemaVersion: string;
      costImpact?: {
        mappedResourceCount: number;
        totalMonthlyDelta: number | null;
      };
      topFindings: Array<{ title: string }>;
    };

    expect(parsed.schemaVersion).toBe("1.1.0");
    expect(parsed.privacy.redacted).toBe(true);
    expect(parsed.costImpact?.mappedResourceCount).toBe(1);
    expect(parsed.costImpact?.totalMonthlyDelta).toBe(620);
    expect(parsed.topFindings.length).toBeGreaterThan(0);
    expect(parsed.findings.length).toBeGreaterThan(0);
    expect(json).not.toContain(SECRET_TEST_VALUES.githubToken);
    expect(json).not.toContain("-----BEGIN PRIVATE KEY-----");
    expect(json).toContain("[redacted]");
  });
});
