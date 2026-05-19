export interface ParsedWorkflowStep {
  id: string;
  index: number;
  name?: string;
  uses?: string;
  run?: string;
  env?: Record<string, string>;
  with?: Record<string, unknown>;
}

export interface ParsedWorkflowJob {
  id: string;
  name?: string;
  runsOn?: string | string[];
  permissions?: WorkflowPermissions;
  env?: Record<string, string>;
  environment?: string | Record<string, unknown>;
  steps: ParsedWorkflowStep[];
}

export type WorkflowPermissions = string | Record<string, string>;

export interface ParsedWorkflow {
  name?: string;
  on: string[];
  permissions?: WorkflowPermissions;
  jobs: ParsedWorkflowJob[];
}

export interface ParseWorkflowSuccess {
  ok: true;
  workflow: ParsedWorkflow;
}

export interface ParseWorkflowFailure {
  ok: false;
  error: string;
}

export type ParseWorkflowResult = ParseWorkflowSuccess | ParseWorkflowFailure;
