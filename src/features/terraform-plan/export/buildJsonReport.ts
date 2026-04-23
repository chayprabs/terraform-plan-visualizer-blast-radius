import {
  getDestructiveResources,
  getReplacementResources,
} from "@/features/terraform-plan/domain/planSummary";
import type {
  ModuleSummary,
  NormalizedPlan,
  NormalizedResourceChange,
  ProviderSummary,
} from "@/features/terraform-plan/domain/normalizedPlanTypes";
import type { PlanCostEstimate } from "@/features/terraform-plan/cost/costTypes";
import { createStableAnonymizer } from "@/features/terraform-plan/privacy/stableAnonymizer";
import { redactTerraformValue } from "@/features/terraform-plan/privacy/redactTerraformPlan";
import {
  DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
  type TerraformPlanRedactionSettings,
} from "@/features/terraform-plan/privacy/redactionTypes";
import type { RiskFinding } from "@/features/terraform-plan/risk/riskTypes";
import {
  TERRAFORM_PLAN_EXPORT_SCHEMA_VERSION,
  TERRAFORM_PLAN_EXPORT_TITLE,
  type TerraformPlanExportBlastRadius,
  type TerraformPlanExportCostEntry,
  type TerraformPlanExportCostImpact,
  type TerraformPlanExportData,
  type TerraformPlanExportFinding,
  type TerraformPlanExportInput,
  type TerraformPlanExportModuleSummary,
  type TerraformPlanExportPrivacy,
  type TerraformPlanExportProviderSummary,
  type TerraformPlanExportResourceChange,
} from "@/features/terraform-plan/export/exportTypes";

function formatReplacePath(path: Array<number | string>): string {
  return path.reduce<string>((formatted, segment) => {
    if (typeof segment === "number") {
      return `${formatted}[${segment}]`;
    }

    return formatted ? `${formatted}.${segment}` : segment;
  }, "");
}

function countDestructiveActions(actionCounts: Record<string, number | undefined>): number {
  return (actionCounts.delete ?? 0) + (actionCounts.replace ?? 0);
}

function buildExportPrivacy(
  settings: TerraformPlanRedactionSettings,
): TerraformPlanExportPrivacy {
  const appliedRedactions = [
    "Terraform-sensitive values are masked before export.",
    settings.detectSecretLikeStrings
      ? "Secret-like strings are masked before export."
      : null,
    settings.maskCloudAccountIdsInExports
      ? "Cloud account IDs are masked in exported content."
      : null,
    settings.maskIpAddressesInExports
      ? "IPv4 addresses are masked in exported content."
      : null,
    settings.maskDomainNamesInExports
      ? "Domain names are masked in exported content."
      : null,
    settings.anonymizeResourceNamesInExports
      ? "Resource and module names are replaced with stable placeholders."
      : null,
  ].filter((entry): entry is string => Boolean(entry));

  return {
    appliedRedactions,
    note: "All exported reports are generated from the local redaction pipeline. Review the output before sharing.",
    redacted: true,
    settings,
  };
}

function buildExportFinding(finding: RiskFinding): TerraformPlanExportFinding {
  return {
    actionKind: finding.actionKind,
    category: finding.category,
    confidence: finding.confidence,
    evidence: [...finding.evidence],
    explanation: finding.explanation,
    id: finding.id,
    resourceAddress: finding.resourceAddress ?? null,
    resourceType: finding.resourceType ?? null,
    severity: finding.severity,
    suggestion: finding.suggestion,
    title: finding.title,
  };
}

function buildResourceChangeSummary(
  resourceChange: NormalizedResourceChange,
): TerraformPlanExportResourceChange {
  return {
    action: resourceChange.action,
    address: resourceChange.address,
    highestSeverity: resourceChange.riskSummary?.highestSeverity ?? null,
    isDestructive: resourceChange.isDestructive,
    module: resourceChange.moduleAddress ?? "root",
    provider: resourceChange.providerShortName,
    replacePaths: resourceChange.replacePaths.map((path) => formatReplacePath(path)),
    riskScore: resourceChange.riskSummary?.score ?? 0,
    type: resourceChange.type,
  };
}

function buildProviderSummary(
  provider: ProviderSummary,
): TerraformPlanExportProviderSummary {
  return {
    destructiveCount: countDestructiveActions(provider.actionCounts),
    providerName: provider.providerName,
    resourceCount: provider.resourceCount,
    resourceTypes: [...provider.resourceTypes],
    shortName: provider.shortName,
  };
}

function buildModuleSummary(module: ModuleSummary): TerraformPlanExportModuleSummary {
  return {
    address: module.addressPrefix,
    depth: module.depth,
    destructiveCount: countDestructiveActions(module.actionCounts),
    path: [...module.path],
    resourceCount: module.resourceCount,
  };
}

function buildCostEntry(costEntry: PlanCostEstimate["resourceEntries"][number]): TerraformPlanExportCostEntry {
  return {
    address: costEntry.address,
    currency: costEntry.currency,
    monthlyCostAfter: costEntry.monthlyCostAfter,
    monthlyCostBefore: costEntry.monthlyCostBefore,
    monthlyDelta: costEntry.monthlyDelta,
    name: costEntry.name,
    source: costEntry.source,
  };
}

function buildCostImpact(
  costEstimate: PlanCostEstimate | null | undefined,
): TerraformPlanExportCostImpact | undefined {
  if (!costEstimate) {
    return undefined;
  }

  return {
    currency: costEstimate.currency,
    hasMappedResources: costEstimate.hasMappedResources,
    importedEntryCount: costEstimate.importedEntryCount,
    manualEntryCount: costEstimate.manualEntryCount,
    mappedResourceCount: costEstimate.mappedResourceCount,
    note: costEstimate.note,
    resourceEntries: costEstimate.resourceEntries.map((entry) => buildCostEntry(entry)),
    source: costEstimate.source,
    thresholds: costEstimate.thresholds,
    totalMonthlyCostAfter: costEstimate.totalMonthlyCostAfter,
    totalMonthlyCostBefore: costEstimate.totalMonthlyCostBefore,
    totalMonthlyDelta: costEstimate.totalMonthlyDelta,
  };
}

function buildBlastRadius(
  normalizedPlan: NormalizedPlan,
  input: TerraformPlanExportInput,
): TerraformPlanExportBlastRadius | null {
  const analysis = input.blastRadiusAnalysis;

  if (!analysis?.focusNode) {
    return null;
  }

  return {
    dependencyCaveat: analysis.dependencyCompleteness.isIncomplete
      ? analysis.dependencyCompleteness.summary
      : null,
    directChangesCount: analysis.directChangedNodes.length,
    downstreamDependentsCount: analysis.downstream.length,
    focusResource: analysis.focusNode.id,
    highRiskResources: analysis.highRiskNodes.map((node) => node.id).slice(0, 8),
    overallRisk: analysis.highestRiskSeverity ?? "none",
    reviewerChecklist: [...analysis.reviewerChecklist],
    totalResourcesInRadius: analysis.radiusNodes.length,
  };
}

function buildReviewerChecklist(input: TerraformPlanExportInput): string[] {
  const checklist = new Set<string>();
  const normalizedPlan = input.normalizedPlan;
  const destructiveChanges = getDestructiveResources(normalizedPlan);
  const findings = normalizedPlan.riskReport?.findings ?? [];

  if (destructiveChanges.length > 0) {
    checklist.add(
      "Confirm every delete or replacement is intentional and scheduled for an acceptable rollout window.",
    );
  }

  if (normalizedPlan.resourceChanges.some((resourceChange) => resourceChange.typeGroup === "database")) {
    checklist.add(
      "Verify backups, cutover steps, and rollback plans for database-related changes.",
    );
  }

  if (normalizedPlan.resourceChanges.some((resourceChange) => resourceChange.typeGroup === "iam")) {
    checklist.add(
      "Review effective IAM principals and permissions for least-privilege access.",
    );
  }

  if (
    findings.some((finding) => finding.category === "public_access") ||
    normalizedPlan.resourceChanges.some((resourceChange) => resourceChange.typeGroup === "network")
  ) {
    checklist.add(
      "Validate any internet-facing access, CIDR changes, and edge controls before apply.",
    );
  }

  if (normalizedPlan.outputChanges.length > 0) {
    checklist.add(
      "Notify downstream consumers about output, endpoint, or integration changes before apply.",
    );
  }

  if (findings.some((finding) => finding.category === "provider")) {
    checklist.add(
      "Confirm provider versions and aliases match the expected deployment environment.",
    );
  }

  for (const item of input.blastRadiusAnalysis?.reviewerChecklist ?? []) {
    checklist.add(item);
  }

  if (checklist.size === 0) {
    checklist.add(
      "Confirm service owners understand the expected impact and apply sequence.",
    );
  }

  return Array.from(checklist);
}

export function buildTerraformPlanExportData(
  input: TerraformPlanExportInput,
): TerraformPlanExportData {
  const settings =
    input.settings ?? DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const normalizedPlan = input.normalizedPlan;
  const findings = (normalizedPlan.riskReport?.findings ?? []).map((finding) =>
    buildExportFinding(finding),
  );
  const exportData: TerraformPlanExportData = {
    blastRadius: buildBlastRadius(normalizedPlan, input),
    costImpact: buildCostImpact(normalizedPlan.costEstimate),
    destructiveChanges: getDestructiveResources(normalizedPlan).map((resourceChange) =>
      buildResourceChangeSummary(resourceChange),
    ),
    findings,
    modules: normalizedPlan.modules.map((module) => buildModuleSummary(module)),
    overallRisk: {
      highRiskFindingCount: normalizedPlan.riskReport?.highRiskFindingCount ?? 0,
      highestSeverity: normalizedPlan.riskReport?.highestSeverity ?? null,
      level: normalizedPlan.riskReport?.level ?? "low",
      score: normalizedPlan.riskReport?.score ?? 0,
      totalFindings: findings.length,
    },
    privacy: buildExportPrivacy(settings),
    providers: normalizedPlan.providers.map((provider) => buildProviderSummary(provider)),
    replacements: getReplacementResources(normalizedPlan).map((resourceChange) =>
      buildResourceChangeSummary(resourceChange),
    ),
    reviewerChecklist: buildReviewerChecklist(input),
    schemaVersion: TERRAFORM_PLAN_EXPORT_SCHEMA_VERSION,
    source: {
      formatVersion: normalizedPlan.formatVersion,
      generatedAt,
      name: input.sourceName ?? "plan.json",
      planTimestamp: normalizedPlan.timestamp ?? null,
      terraformVersion: normalizedPlan.terraformVersion ?? null,
    },
    summary: normalizedPlan.summary,
    title: TERRAFORM_PLAN_EXPORT_TITLE,
    topFindings: findings.slice(0, 5),
  };

  return redactTerraformValue(exportData, {
    anonymizer: createStableAnonymizer(),
    scope: "export",
    settings,
  }) as TerraformPlanExportData;
}

export function buildJsonReport(exportData: TerraformPlanExportData): string {
  return JSON.stringify(exportData, null, 2);
}
