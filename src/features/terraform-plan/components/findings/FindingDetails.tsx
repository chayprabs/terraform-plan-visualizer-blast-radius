import type { RiskFinding } from "@/features/terraform-plan/risk/riskTypes";
import {
  getRiskActionLabel,
  getRiskActionTooltip,
} from "@/features/terraform-plan/risk/riskCopy";

interface FindingDetailsProps {
  evidence: string[];
  finding: RiskFinding;
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function FindingDetails({ evidence, finding }: FindingDetailsProps) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <span
          className="border-border bg-surface-muted inline-flex rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground"
          title={getRiskActionTooltip(finding.actionKind)}
        >
          Action: {getRiskActionLabel(finding.actionKind)}
        </span>

        {finding.resourceType ? (
          <span
            className="border-border bg-surface-muted inline-flex rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground"
            title="Terraform resource type attached to this finding."
          >
            Type: {finding.resourceType}
          </span>
        ) : null}

        <span
          className="border-border bg-surface-muted inline-flex rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground"
          title="Deterministic rule confidence for this finding."
        >
          Confidence: {formatConfidence(finding.confidence)}
        </span>
      </div>

      <div>
        <p className="text-foreground text-xs font-semibold tracking-[0.18em] uppercase">
          Explanation
        </p>
        <p className="text-muted-foreground mt-2 text-sm leading-7">
          {finding.explanation}
        </p>
      </div>

      <div>
        <p className="text-foreground text-xs font-semibold tracking-[0.18em] uppercase">
          Evidence
        </p>
        {evidence.length > 0 ? (
          <ul className="text-muted-foreground mt-2 space-y-2 text-sm leading-6">
            {evidence.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            No additional evidence was attached to this finding.
          </p>
        )}
      </div>

      <div>
        <p className="text-foreground text-xs font-semibold tracking-[0.18em] uppercase">
          Suggestion
        </p>
        <p className="text-muted-foreground mt-2 text-sm leading-7">
          {finding.suggestion}
        </p>
      </div>
    </div>
  );
}
