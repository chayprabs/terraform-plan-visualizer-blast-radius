import type {
  NormalizedPlan,
  NormalizedResourceChange,
  PlanSummary,
} from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { createEmptyPlanSummary } from "@/features/terraform-plan/domain/normalizedPlanTypes";

export function buildPlanSummary(normalizedPlan: NormalizedPlan): PlanSummary {
  const summary = createEmptyPlanSummary();

  summary.totalResourceChanges = normalizedPlan.resourceChanges.length;
  summary.totalOutputChanges = normalizedPlan.outputChanges.length;
  summary.highRiskCount =
    normalizedPlan.riskReport?.highRiskFindingCount ??
    normalizedPlan.resourceChanges.filter((change) => change.isHighRisk).length;

  for (const change of normalizedPlan.resourceChanges) {
    switch (change.action) {
      case "create":
        summary.createCount += 1;
        break;
      case "update":
        summary.updateCount += 1;
        break;
      case "delete":
        summary.deleteCount += 1;
        break;
      case "replace":
        summary.replaceCount += 1;
        break;
      case "no-op":
        summary.noOpCount += 1;
        break;
      case "read":
        summary.readCount += 1;
        break;
      case "import":
        summary.importCount += 1;
        break;
      case "forget":
        summary.forgetCount += 1;
        break;
      case "unknown":
        summary.unknownCount += 1;
        break;
      default:
        break;
    }
  }

  return summary;
}

export function getChangedResources(
  normalizedPlan: NormalizedPlan,
): NormalizedResourceChange[] {
  return normalizedPlan.resourceChanges.filter(
    (change) => change.action !== "no-op" && change.action !== "read",
  );
}

export function getDestructiveResources(
  normalizedPlan: NormalizedPlan,
): NormalizedResourceChange[] {
  return normalizedPlan.resourceChanges.filter(
    (change) => change.action === "delete" || change.action === "replace",
  );
}

export function getReplacementResources(
  normalizedPlan: NormalizedPlan,
): NormalizedResourceChange[] {
  return normalizedPlan.resourceChanges.filter(
    (change) => change.action === "replace",
  );
}
