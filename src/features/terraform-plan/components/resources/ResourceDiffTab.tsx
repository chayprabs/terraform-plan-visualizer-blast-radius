import type { NormalizedResourceChange } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { AttributeDiffViewer } from "@/features/terraform-plan/components/diff/AttributeDiffViewer";

interface ResourceDiffTabProps {
  resourceChange: NormalizedResourceChange;
}

export function ResourceDiffTab({ resourceChange }: ResourceDiffTabProps) {
  return <AttributeDiffViewer resourceChange={resourceChange} />;
}
