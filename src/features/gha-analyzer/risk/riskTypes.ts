export type WorkflowRiskSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

export type WorkflowRiskCategory =
  | "permissions"
  | "triggers"
  | "supply_chain"
  | "secrets"
  | "artifacts"
  | "cache";

export interface WorkflowRiskFinding {
  id: string;
  severity: WorkflowRiskSeverity;
  category: WorkflowRiskCategory;
  ruleId: string;
  title: string;
  explanation: string;
  evidence: string[];
  suggestion: string;
  jobId?: string;
  stepId?: string;
}

export interface WorkflowRiskReport {
  findings: WorkflowRiskFinding[];
  highestSeverity: WorkflowRiskSeverity | null;
  highRiskFindingCount: number;
}
