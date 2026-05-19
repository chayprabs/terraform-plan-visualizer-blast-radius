import type { ParsedWorkflow, WorkflowPermissions } from "@/features/gha-analyzer/domain/workflowTypes";
import type {
  WorkflowRiskFinding,
  WorkflowRiskReport,
  WorkflowRiskSeverity,
} from "@/features/gha-analyzer/risk/riskTypes";

const SEVERITY_ORDER: WorkflowRiskSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

const UNPINNED_ACTION_REF_PATTERN = /@(main|master)\b/i;
const SECRET_REFERENCE_PATTERN = /\$\{\{\s*secrets\./i;

function sortFindings(
  left: WorkflowRiskFinding,
  right: WorkflowRiskFinding,
): number {
  const severityComparison =
    SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity);

  if (severityComparison !== 0) {
    return severityComparison;
  }

  return left.id.localeCompare(right.id);
}

function getHighestSeverity(
  findings: WorkflowRiskFinding[],
): WorkflowRiskSeverity | null {
  for (const severity of SEVERITY_ORDER) {
    if (findings.some((finding) => finding.severity === severity)) {
      return severity;
    }
  }

  return null;
}

function isHighSeverity(severity: WorkflowRiskSeverity): boolean {
  return severity === "critical" || severity === "high";
}

function hasWriteAllPermissions(permissions: WorkflowPermissions | undefined): boolean {
  if (!permissions) {
    return false;
  }

  if (typeof permissions === "string") {
    return permissions.trim().toLowerCase() === "write-all";
  }

  return Object.values(permissions).every(
    (scope) => scope.trim().toLowerCase() === "write",
  );
}

function formatPermissions(permissions: WorkflowPermissions): string {
  if (typeof permissions === "string") {
    return permissions;
  }

  return Object.entries(permissions)
    .map(([scope, value]) => `${scope}: ${value}`)
    .join(", ");
}

function collectSecretEnvEntries(
  env: Record<string, string> | undefined,
): string[] {
  if (!env) {
    return [];
  }

  return Object.entries(env)
    .filter(([, value]) => SECRET_REFERENCE_PATTERN.test(value))
    .map(([key, value]) => `${key}=${value}`);
}

function hasPullRequestTarget(workflow: ParsedWorkflow): boolean {
  return workflow.on.some((trigger) => trigger === "pull_request_target");
}

function evaluateWriteAllPermissions(workflow: ParsedWorkflow): WorkflowRiskFinding[] {
  const findings: WorkflowRiskFinding[] = [];

  if (hasWriteAllPermissions(workflow.permissions)) {
    findings.push({
      id: "workflow-write-all-permissions",
      severity: "critical",
      category: "permissions",
      ruleId: "write-all-permissions",
      title: "Workflow grants write-all permissions",
      explanation:
        "Top-level permissions are set to write-all, giving every job broad write access to the repository and related scopes.",
      evidence: [
        `permissions: ${formatPermissions(workflow.permissions!)}`,
      ],
      suggestion:
        "Use the minimum permissions required per job, such as contents: read at the workflow level and elevated scopes only where needed.",
    });
  }

  for (const job of workflow.jobs) {
    if (!hasWriteAllPermissions(job.permissions)) {
      continue;
    }

    findings.push({
      id: `job-${job.id}-write-all-permissions`,
      severity: "high",
      category: "permissions",
      ruleId: "write-all-permissions",
      title: `Job "${job.id}" grants write-all permissions`,
      explanation:
        "This job requests write-all permissions, which may be broader than required for its steps.",
      evidence: [
        `jobs.${job.id}.permissions: ${formatPermissions(job.permissions!)}`,
      ],
      suggestion:
        "Scope job permissions to the minimum needed, for example contents: read plus any extra scopes for a single step.",
      jobId: job.id,
    });
  }

  return findings;
}

function evaluatePullRequestTarget(workflow: ParsedWorkflow): WorkflowRiskFinding[] {
  if (!hasPullRequestTarget(workflow)) {
    return [];
  }

  return [
    {
      id: "workflow-pull-request-target",
      severity: "critical",
      category: "triggers",
      ruleId: "pull-request-target",
      title: "Workflow uses pull_request_target",
      explanation:
        "pull_request_target runs in the base branch context with access to base-branch secrets, which is risky when combined with untrusted fork code.",
      evidence: [`on: ${workflow.on.join(", ")}`],
      suggestion:
        "Prefer pull_request for untrusted code, pin to specific SHAs, and restrict permissions and secret usage when pull_request_target is unavoidable.",
    },
  ];
}

function evaluateUnpinnedActions(workflow: ParsedWorkflow): WorkflowRiskFinding[] {
  const findings: WorkflowRiskFinding[] = [];

  for (const job of workflow.jobs) {
    for (const step of job.steps) {
      if (!step.uses || !UNPINNED_ACTION_REF_PATTERN.test(step.uses)) {
        continue;
      }

      findings.push({
        id: `step-${step.id}-unpinned-action`,
        severity: "high",
        category: "supply_chain",
        ruleId: "unpinned-action-ref",
        title: "Action reference pinned to a moving branch",
        explanation:
          "This step uses an action ref on @main or @master, which can change without review and supply-chain pin expectations.",
        evidence: [
          `jobs.${job.id} step ${step.index}: uses: ${step.uses}`,
        ],
        suggestion:
          "Pin actions to a full commit SHA or an immutable version tag such as @v4.1.0.",
        jobId: job.id,
        stepId: step.id,
      });
    }
  }

  return findings;
}

function evaluateSecretsInForkContext(workflow: ParsedWorkflow): WorkflowRiskFinding[] {
  if (!hasPullRequestTarget(workflow)) {
    return [];
  }

  const findings: WorkflowRiskFinding[] = [];

  for (const job of workflow.jobs) {
    const jobSecretEnv = collectSecretEnvEntries(job.env);

    if (jobSecretEnv.length > 0) {
      findings.push({
        id: `job-${job.id}-secrets-in-env`,
        severity: "critical",
        category: "secrets",
        ruleId: "secrets-in-fork-pr-env",
        title: `Job "${job.id}" exposes secrets in env with pull_request_target`,
        explanation:
          "Secrets referenced in env can be exposed to workflows triggered by fork pull requests when pull_request_target is enabled.",
        evidence: jobSecretEnv.map((entry) => `jobs.${job.id}.env ${entry}`),
        suggestion:
          "Avoid passing secrets to untrusted code paths, gate execution with an approval environment, or use pull_request without base-context secrets.",
        jobId: job.id,
      });
    }

    for (const step of job.steps) {
      const secretEnv = collectSecretEnvEntries(step.env);

      if (secretEnv.length === 0) {
        continue;
      }

      findings.push({
        id: `step-${step.id}-secrets-in-env`,
        severity: "critical",
        category: "secrets",
        ruleId: "secrets-in-fork-pr-env",
        title: "Step exposes secrets in env with pull_request_target",
        explanation:
          "This step maps secrets into env while the workflow can run from forked pull_request_target events.",
        evidence: secretEnv.map(
          (entry) => `jobs.${job.id} step ${step.index} env ${entry}`,
        ),
        suggestion:
          "Remove secret env mappings from untrusted paths or restrict the workflow to trusted actors and protected branches.",
        jobId: job.id,
        stepId: step.id,
      });
    }
  }

  return findings;
}

function isUploadArtifactStep(uses: string | undefined): boolean {
  if (!uses) {
    return false;
  }

  const normalized = uses.toLowerCase();
  return (
    normalized.includes("actions/upload-artifact") ||
    normalized.includes("upload-artifact")
  );
}

function hasArtifactRetention(withBlock: Record<string, unknown> | undefined): boolean {
  if (!withBlock) {
    return false;
  }

  const retentionDays = withBlock["retention-days"];

  if (retentionDays === undefined || retentionDays === null) {
    return false;
  }

  if (typeof retentionDays === "number") {
    return retentionDays > 0;
  }

  if (typeof retentionDays === "string") {
    const parsed = Number.parseInt(retentionDays, 10);
    return Number.isFinite(parsed) && parsed > 0;
  }

  return false;
}

function hasExplicitPermissions(permissions: WorkflowPermissions | undefined): boolean {
  if (permissions === undefined) {
    return false;
  }

  if (typeof permissions === "string") {
    return permissions.trim().length > 0;
  }

  return Object.keys(permissions).length > 0;
}

function evaluateMissingRestrictivePermissions(
  workflow: ParsedWorkflow,
): WorkflowRiskFinding[] {
  const findings: WorkflowRiskFinding[] = [];

  if (!hasExplicitPermissions(workflow.permissions)) {
    findings.push({
      id: "workflow-missing-permissions",
      severity: "medium",
      category: "permissions",
      ruleId: "missing-restrictive-permissions",
      title: "Workflow does not declare permissions",
      explanation:
        "Without an explicit permissions block, GitHub Actions may grant broader defaults than reviewers expect.",
      evidence: ["permissions block is not set at workflow level"],
      suggestion:
        "Set workflow-level permissions: contents: read and elevate scopes only in jobs that need them.",
    });
  }

  if (hasPullRequestTarget(workflow)) {
    for (const job of workflow.jobs) {
      if (hasExplicitPermissions(job.permissions)) {
        continue;
      }

      findings.push({
        id: `job-${job.id}-missing-permissions`,
        severity: "medium",
        category: "permissions",
        ruleId: "missing-restrictive-permissions",
        title: `Job "${job.id}" does not declare permissions with pull_request_target`,
        explanation:
          "Jobs without explicit permissions inherit workflow defaults while the workflow can run in a base-branch context.",
        evidence: [`jobs.${job.id}.permissions is not set`],
        suggestion:
          "Declare least-privilege permissions on each job when using pull_request_target.",
        jobId: job.id,
      });
    }
  }

  return findings;
}

function isCheckoutStep(uses: string | undefined): boolean {
  if (!uses) {
    return false;
  }

  const normalized = uses.toLowerCase();
  return (
    normalized.includes("actions/checkout") || normalized.endsWith("/checkout")
  );
}

function evaluateCheckoutRisk(workflow: ParsedWorkflow): WorkflowRiskFinding[] {
  const findings: WorkflowRiskFinding[] = [];

  for (const job of workflow.jobs) {
    for (const step of job.steps) {
      if (!isCheckoutStep(step.uses)) {
        continue;
      }

      const withBlock = step.with ?? {};
      const fetchDepth = withBlock["fetch-depth"];
      const token = withBlock.token;
      const evidence: string[] = [
        `jobs.${job.id} step ${step.index}: uses: ${step.uses}`,
      ];

      if (
        fetchDepth === 0 ||
        fetchDepth === "0" ||
        (typeof fetchDepth === "string" && fetchDepth.trim() === "0")
      ) {
        evidence.push("with.fetch-depth: 0 (full history)");
        findings.push({
          id: `step-${step.id}-checkout-full-history`,
          severity: "medium",
          category: "supply_chain",
          ruleId: "checkout-fetch-depth",
          title: "Checkout fetches full git history",
          explanation:
            "fetch-depth: 0 downloads the entire history, which can increase exposure when combined with untrusted code paths.",
          evidence,
          suggestion:
            "Use the default shallow fetch or set fetch-depth to 1 unless full history is required.",
          jobId: job.id,
          stepId: step.id,
        });
      }

      if (typeof token === "string" && token.includes("secrets.")) {
        evidence.push(`with.token references ${token}`);
        findings.push({
          id: `step-${step.id}-checkout-custom-token`,
          severity: "high",
          category: "secrets",
          ruleId: "checkout-token",
          title: "Checkout step uses a custom token",
          explanation:
            "Passing secrets into actions/checkout can broaden credential exposure if the job runs in an untrusted context.",
          evidence,
          suggestion:
            "Use the default GITHUB_TOKEN with least-privilege permissions or gate checkout behind trusted actors.",
          jobId: job.id,
          stepId: step.id,
        });
      }
    }
  }

  return findings;
}

function isCacheStep(uses: string | undefined): boolean {
  if (!uses) {
    return false;
  }

  const normalized = uses.toLowerCase();
  return normalized.includes("actions/cache") || normalized.includes("/cache");
}

function evaluateCacheSteps(workflow: ParsedWorkflow): WorkflowRiskFinding[] {
  const findings: WorkflowRiskFinding[] = [];

  for (const job of workflow.jobs) {
    for (const step of job.steps) {
      if (!isCacheStep(step.uses)) {
        continue;
      }

      const withBlock = step.with ?? {};
      const key = withBlock.key;
      const restoreKeys = withBlock["restore-keys"];

      if (
        (typeof key !== "string" || !key.trim()) &&
        (typeof restoreKeys !== "string" || !restoreKeys.trim()) &&
        !Array.isArray(restoreKeys)
      ) {
        findings.push({
          id: `step-${step.id}-cache-without-key`,
          severity: "low",
          category: "cache",
          ruleId: "cache-without-key",
          title: "Cache step missing a restore key",
          explanation:
            "actions/cache steps without key or restore-keys cannot restore prior artifacts predictably.",
          evidence: [
            `jobs.${job.id} step ${step.index}: uses: ${step.uses}`,
            "with.key and with.restore-keys are not set",
          ],
          suggestion:
            "Provide a namespaced cache key and restore-keys so jobs can reuse artifacts safely.",
          jobId: job.id,
          stepId: step.id,
        });
      }
    }
  }

  return findings;
}

function evaluateArtifactRetention(workflow: ParsedWorkflow): WorkflowRiskFinding[] {
  const findings: WorkflowRiskFinding[] = [];

  for (const job of workflow.jobs) {
    for (const step of job.steps) {
      if (!isUploadArtifactStep(step.uses)) {
        continue;
      }

      if (hasArtifactRetention(step.with)) {
        continue;
      }

      findings.push({
        id: `step-${step.id}-artifact-retention`,
        severity: "medium",
        category: "artifacts",
        ruleId: "upload-artifact-without-retention",
        title: "upload-artifact step missing retention-days",
        explanation:
          "Artifacts without an explicit retention-days value may persist for the repository default retention period.",
        evidence: [
          `jobs.${job.id} step ${step.index}: uses: ${step.uses}`,
          "with.retention-days is not set to a positive value",
        ],
        suggestion:
          "Set with.retention-days to the minimum period required for downstream jobs or compliance needs.",
        jobId: job.id,
        stepId: step.id,
      });
    }
  }

  return findings;
}

export function evaluateWorkflowRisk(workflow: ParsedWorkflow): WorkflowRiskReport {
  const findings = [
    ...evaluateWriteAllPermissions(workflow),
    ...evaluateMissingRestrictivePermissions(workflow),
    ...evaluatePullRequestTarget(workflow),
    ...evaluateUnpinnedActions(workflow),
    ...evaluateSecretsInForkContext(workflow),
    ...evaluateCheckoutRisk(workflow),
    ...evaluateCacheSteps(workflow),
    ...evaluateArtifactRetention(workflow),
  ].sort(sortFindings);

  const highestSeverity = getHighestSeverity(findings);
  const highRiskFindingCount = findings.filter((finding) =>
    isHighSeverity(finding.severity),
  ).length;

  return {
    findings,
    highestSeverity,
    highRiskFindingCount,
  };
}
