import { parse as parseYaml } from "yaml";
import type {
  ParseWorkflowResult,
  ParsedWorkflow,
  ParsedWorkflowJob,
  ParsedWorkflowStep,
  WorkflowPermissions,
} from "@/features/gha-analyzer/domain/workflowTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizePermissions(value: unknown): WorkflowPermissions | undefined {
  if (typeof value === "string") {
    return value;
  }

  return asStringRecord(value);
}

function collectTriggerNames(value: unknown, triggers: Set<string>): void {
  if (typeof value === "string") {
    triggers.add(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectTriggerNames(entry, triggers);
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    triggers.add(key);
  }
}

function parseOnTriggers(document: Record<string, unknown>): string[] {
  const triggers = new Set<string>();
  const onValue = document.on ?? document.true;

  if (onValue !== undefined) {
    collectTriggerNames(onValue, triggers);
  }

  return [...triggers].sort((left, right) => left.localeCompare(right));
}

function parseSteps(
  jobId: string,
  rawSteps: unknown,
): ParsedWorkflowStep[] {
  if (!Array.isArray(rawSteps)) {
    return [];
  }

  const steps: ParsedWorkflowStep[] = [];

  rawSteps.forEach((rawStep, index) => {
    if (!isRecord(rawStep)) {
      return;
    }

    steps.push({
      id: `${jobId}-step-${index + 1}`,
      index: index + 1,
      name: asString(rawStep.name),
      uses: asString(rawStep.uses),
      run: asString(rawStep.run),
      env: asStringRecord(rawStep.env),
      with: isRecord(rawStep.with) ? rawStep.with : undefined,
    });
  });

  return steps;
}

function parseJobs(document: Record<string, unknown>): ParsedWorkflowJob[] {
  const rawJobs = document.jobs;

  if (!isRecord(rawJobs)) {
    return [];
  }

  return Object.entries(rawJobs).map(([jobId, rawJob]) => {
    const jobRecord = isRecord(rawJob) ? rawJob : {};

    return {
      id: jobId,
      name: asString(jobRecord.name),
      runsOn: jobRecord["runs-on"] as string | string[] | undefined,
      permissions: normalizePermissions(jobRecord.permissions),
      env: asStringRecord(jobRecord.env),
      environment: jobRecord.environment as ParsedWorkflowJob["environment"],
      steps: parseSteps(jobId, jobRecord.steps),
    } satisfies ParsedWorkflowJob;
  });
}

export function parseWorkflow(yamlText: string): ParseWorkflowResult {
  const trimmed = yamlText.trim();

  if (trimmed.length === 0) {
    return { ok: false, error: "Workflow YAML is empty." };
  }

  let document: unknown;

  try {
    document = parseYaml(trimmed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to parse workflow YAML.";
    return { ok: false, error: message };
  }

  if (!isRecord(document)) {
    return { ok: false, error: "Workflow YAML must resolve to an object." };
  }

  const workflow: ParsedWorkflow = {
    name: asString(document.name),
    on: parseOnTriggers(document),
    permissions: normalizePermissions(document.permissions),
    jobs: parseJobs(document),
  };

  return { ok: true, workflow };
}
