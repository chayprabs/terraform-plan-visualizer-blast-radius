import {
  createScoreBreakdown,
  getFindingScore,
  getHighestSeverityValue,
  getModuleTags,
  getPlanRiskLevel,
  isHighSeverity,
} from "@/features/terraform-plan/risk/riskCopy";
import {
  evaluatePlanRules,
  evaluateResourceRules,
} from "@/features/terraform-plan/risk/riskRules";
import type {
  NormalizedPlan,
  NormalizedResourceChange,
} from "@/features/terraform-plan/domain/normalizedPlanTypes";
import type {
  PlanRiskReport,
  ResourceRiskSummary,
  RiskFinding,
} from "@/features/terraform-plan/risk/riskTypes";

function sortFindings(left: RiskFinding, right: RiskFinding): number {
  const severityComparison =
    ["critical", "high", "medium", "low", "info"].indexOf(left.severity) -
    ["critical", "high", "medium", "low", "info"].indexOf(right.severity);

  if (severityComparison !== 0) {
    return severityComparison;
  }

  return left.id.localeCompare(right.id);
}

export function getHighestSeverity(
  findings: RiskFinding[],
): RiskFinding["severity"] | null {
  return getHighestSeverityValue(findings.map((finding) => finding.severity));
}

export function evaluateResourceRisk(
  resourceChange: NormalizedResourceChange,
): ResourceRiskSummary {
  const findings = evaluateResourceRules(resourceChange).sort(sortFindings);
  const highestSeverity = getHighestSeverity(findings);
  const score = Math.min(
    100,
    findings.reduce((total, finding) => total + getFindingScore(finding.severity), 0),
  );
  const tags = [
    ...new Set([
      ...getModuleTags(resourceChange.moduleAddress),
      ...(resourceChange.providerShortName === "unknown" ? ["unknown-provider"] : []),
    ]),
  ];

  return {
    resourceAddress: resourceChange.address,
    resourceType: resourceChange.type,
    actionKind: resourceChange.action,
    findings,
    highestSeverity,
    score,
    tags,
  };
}

export function evaluatePlanRisk(normalizedPlan: NormalizedPlan): PlanRiskReport {
  const resourceSummaries = normalizedPlan.resourceChanges.map(
    (resourceChange) => resourceChange.riskSummary ?? evaluateResourceRisk(resourceChange),
  );
  const findings = [
    ...resourceSummaries.flatMap((summary) => summary.findings),
    ...evaluatePlanRules(normalizedPlan, resourceSummaries),
  ].sort(sortFindings);
  const highestSeverity = getHighestSeverity(findings);
  const scoreBreakdown = createScoreBreakdown(findings);
  const score = Math.min(
    100,
    scoreBreakdown.reduce((total, entry) => total + entry.points, 0),
  );

  return {
    findings,
    resourceSummaries,
    highestSeverity,
    highRiskFindingCount: findings.filter((finding) =>
      isHighSeverity(finding.severity),
    ).length,
    level: getPlanRiskLevel(score, highestSeverity),
    score,
    scoreBreakdown,
  };
}
