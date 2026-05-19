import {
  getManifestRef,
  type ParsedK8sManifest,
} from "@/features/k8s-analyzer/domain/manifestTypes";
import type {
  ManifestRiskFinding,
  ManifestRiskLevel,
  ManifestRiskReport,
  ManifestRiskRule,
  ManifestRiskRuleContext,
  ManifestRiskSeverity,
} from "@/features/k8s-analyzer/risk/riskTypes";

const SEVERITY_ORDER: ManifestRiskSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

const SEVERITY_SCORE: Record<ManifestRiskSeverity, number> = {
  critical: 30,
  high: 20,
  medium: 12,
  low: 6,
  info: 2,
};

const DEPRECATED_API_VERSIONS: Record<string, string> = {
  "extensions/v1beta1": "Use networking.k8s.io/v1 for Ingress.",
  "apps/v1beta1": "Use apps/v1 for Deployments and StatefulSets.",
  "apps/v1beta2": "Use apps/v1 for Deployments and StatefulSets.",
  "policy/v1beta1": "Use policy/v1 for PodDisruptionBudget and PodSecurityPolicy successors.",
  "networking.k8s.io/v1beta1": "Use networking.k8s.io/v1 for Ingress.",
  "batch/v1beta1": "Use batch/v1 for CronJob.",
  "rbac.authorization.k8s.io/v1beta1":
    "Use rbac.authorization.k8s.io/v1 for RBAC resources.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function sortFindings(
  left: ManifestRiskFinding,
  right: ManifestRiskFinding,
): number {
  const severityComparison =
    SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity);

  if (severityComparison !== 0) {
    return severityComparison;
  }

  return left.id.localeCompare(right.id);
}

function createFinding(
  context: ManifestRiskRuleContext,
  partial: Omit<
    ManifestRiskFinding,
    "manifestRef" | "kind" | "name" | "namespace"
  >,
): ManifestRiskFinding {
  return {
    ...partial,
    manifestRef: context.manifestRef,
    kind: context.manifest.kind,
    name: context.manifest.metadata.name,
    namespace: context.manifest.metadata.namespace,
  };
}

function collectPodSpecs(
  document: Record<string, unknown>,
): Record<string, unknown>[] {
  const specs: Record<string, unknown>[] = [];
  const spec = isRecord(document.spec) ? document.spec : null;

  if (!spec) {
    return specs;
  }

  const template = isRecord(spec.template) ? spec.template : null;
  const templateSpec =
    template && isRecord(template.spec) ? template.spec : null;

  if (templateSpec) {
    specs.push(templateSpec);
  }

  if (document.kind === "Pod" && isRecord(document.spec)) {
    specs.push(document.spec);
  }

  const jobTemplate = isRecord(spec.jobTemplate) ? spec.jobTemplate : null;
  const jobSpec =
    jobTemplate && isRecord(jobTemplate.spec) ? jobTemplate.spec : null;
  const cronTemplate =
    jobSpec && isRecord(jobSpec.template) ? jobSpec.template : null;
  const cronPodSpec =
    cronTemplate && isRecord(cronTemplate.spec) ? cronTemplate.spec : null;

  if (cronPodSpec) {
    specs.push(cronPodSpec);
  }

  return specs;
}

function collectContainers(
  podSpec: Record<string, unknown>,
): Record<string, unknown>[] {
  const containers: Record<string, unknown>[] = [];

  for (const key of ["containers", "initContainers"] as const) {
    const value = podSpec[key];

    if (!Array.isArray(value)) {
      continue;
    }

    for (const container of value) {
      if (isRecord(container)) {
        containers.push(container);
      }
    }
  }

  return containers;
}

function usesLatestImageTag(image: string): boolean {
  const normalized = image.trim();

  if (!normalized.includes(":")) {
    return true;
  }

  const tag = normalized.split(":").at(-1)?.split("@")[0]?.trim();

  return !tag || tag === "latest";
}

function evaluateLatestImageTag(
  context: ManifestRiskRuleContext,
): ManifestRiskFinding[] {
  const findings: ManifestRiskFinding[] = [];
  const podSpecs = collectPodSpecs(context.manifest.document);

  for (const podSpec of podSpecs) {
    for (const container of collectContainers(podSpec)) {
      const image = asString(container.image);
      const containerName = asString(container.name) ?? "container";

      if (!image || !usesLatestImageTag(image)) {
        continue;
      }

      findings.push(
        createFinding(context, {
          id: `latest-image-tag-${context.manifest.documentIndex}-${containerName}`,
          severity: "high",
          category: "image",
          title: "Container image uses a floating tag",
          explanation:
            "Images without a pinned tag or tagged as latest can change between deploys and hide supply-chain risk.",
          evidence: [`${containerName}: ${image}`],
          suggestion:
            "Pin images to an immutable digest or a specific semantic version tag.",
        }),
      );
    }
  }

  return findings;
}

function evaluateMissingLimits(
  context: ManifestRiskRuleContext,
): ManifestRiskFinding[] {
  const findings: ManifestRiskFinding[] = [];
  const podSpecs = collectPodSpecs(context.manifest.document);

  for (const podSpec of podSpecs) {
    for (const container of collectContainers(podSpec)) {
      const containerName = asString(container.name) ?? "container";
      const resources = isRecord(container.resources) ? container.resources : null;
      const limits = resources && isRecord(resources.limits) ? resources.limits : null;
      const hasLimits =
        limits &&
        Object.values(limits).some(
          (value) => typeof value === "string" && value.trim().length > 0,
        );

      if (hasLimits) {
        continue;
      }

      findings.push(
        createFinding(context, {
          id: `missing-limits-${context.manifest.documentIndex}-${containerName}`,
          severity: "medium",
          category: "resources",
          title: "Container is missing resource limits",
          explanation:
            "Workloads without CPU and memory limits can starve neighbors or be OOM-killed unpredictably.",
          evidence: [`${containerName}: no resources.limits`],
          suggestion:
            "Set resources.requests and resources.limits based on load testing or historical usage.",
        }),
      );
    }
  }

  return findings;
}

function isPrivileged(container: Record<string, unknown>): boolean {
  const securityContext = isRecord(container.securityContext)
    ? container.securityContext
    : null;

  return securityContext?.privileged === true;
}

function evaluatePrivileged(
  context: ManifestRiskRuleContext,
): ManifestRiskFinding[] {
  const findings: ManifestRiskFinding[] = [];
  const podSpecs = collectPodSpecs(context.manifest.document);

  for (const podSpec of podSpecs) {
    const podSecurityContext = isRecord(podSpec.securityContext)
      ? podSpec.securityContext
      : null;

    if (podSecurityContext?.privileged === true) {
      findings.push(
        createFinding(context, {
          id: `privileged-pod-${context.manifest.documentIndex}`,
          severity: "critical",
          category: "security_context",
          title: "Pod runs in privileged mode",
          explanation:
            "Privileged pods can access host devices and weaken node isolation boundaries.",
          evidence: ["spec.template.spec.securityContext.privileged: true"],
          suggestion:
            "Drop privileged mode and grant only the specific capabilities required.",
        }),
      );
    }

    for (const container of collectContainers(podSpec)) {
      if (!isPrivileged(container)) {
        continue;
      }

      const containerName = asString(container.name) ?? "container";

      findings.push(
        createFinding(context, {
          id: `privileged-container-${context.manifest.documentIndex}-${containerName}`,
          severity: "critical",
          category: "security_context",
          title: "Container runs in privileged mode",
          explanation:
            "Privileged containers bypass many namespace isolation controls.",
          evidence: [`${containerName}: securityContext.privileged: true`],
          suggestion:
            "Use a restricted security context and grant capabilities explicitly.",
        }),
      );
    }
  }

  return findings;
}

function evaluateHostPath(
  context: ManifestRiskRuleContext,
): ManifestRiskFinding[] {
  const findings: ManifestRiskFinding[] = [];
  const podSpecs = collectPodSpecs(context.manifest.document);

  for (const podSpec of podSpecs) {
    const volumes = Array.isArray(podSpec.volumes) ? podSpec.volumes : [];

    for (const volume of volumes) {
      if (!isRecord(volume)) {
        continue;
      }

      const hostPath = isRecord(volume.hostPath) ? volume.hostPath : null;

      if (!hostPath) {
        continue;
      }

      const volumeName = asString(volume.name) ?? "volume";
      const path = asString(hostPath.path) ?? "(unspecified path)";

      findings.push(
        createFinding(context, {
          id: `hostpath-${context.manifest.documentIndex}-${volumeName}`,
          severity: "high",
          category: "volumes",
          title: "Workload mounts a hostPath volume",
          explanation:
            "hostPath volumes expose node filesystem paths to pods and complicate multi-tenant safety.",
          evidence: [`${volumeName}: ${path}`],
          suggestion:
            "Prefer PVCs, CSI volumes, or projected secrets instead of hostPath unless strictly required.",
        }),
      );
    }
  }

  return findings;
}

function evaluateClusterAdminBinding(
  context: ManifestRiskRuleContext,
): ManifestRiskFinding[] {
  const kind = context.manifest.kind;

  if (kind !== "ClusterRoleBinding" && kind !== "RoleBinding") {
    return [];
  }

  const document = context.manifest.document;
  const spec = isRecord(document.spec) ? document.spec : null;
  const roleRef =
    (spec && isRecord(spec.roleRef) ? spec.roleRef : null) ??
    (isRecord(document.roleRef) ? document.roleRef : null);
  const roleName = asString(roleRef?.name);

  if (roleName !== "cluster-admin") {
    return [];
  }

  const subjects =
    (spec && Array.isArray(spec.subjects) ? spec.subjects : null) ??
    (Array.isArray(document.subjects) ? document.subjects : []);
  const subjectSummary = subjects
    .filter(isRecord)
    .map((subject) => {
      const subjectKind = asString(subject.kind) ?? "Subject";
      const subjectName = asString(subject.name) ?? "(unnamed)";
      return `${subjectKind}/${subjectName}`;
    })
    .slice(0, 5);

  return [
    createFinding(context, {
      id: `cluster-admin-binding-${context.manifest.documentIndex}`,
      severity: "critical",
      category: "rbac",
      title: "Binding grants cluster-admin access",
      explanation:
        "cluster-admin is unrestricted cluster control and should be limited to break-glass automation.",
      evidence:
        subjectSummary.length > 0
          ? subjectSummary
          : ["roleRef.name: cluster-admin"],
      suggestion:
        "Scope RBAC to namespace roles with least privilege and audit cluster-admin bindings regularly.",
    }),
  ];
}

function evaluateDeprecatedApiVersion(
  context: ManifestRiskRuleContext,
): ManifestRiskFinding[] {
  const migration = DEPRECATED_API_VERSIONS[context.manifest.apiVersion];

  if (!migration) {
    return [];
  }

  return [
    createFinding(context, {
      id: `deprecated-api-${context.manifest.documentIndex}`,
      severity: "medium",
      category: "api_version",
      title: "Manifest uses a deprecated API version",
      explanation: `apiVersion ${context.manifest.apiVersion} is removed or deprecated in modern Kubernetes releases.`,
      evidence: [`apiVersion: ${context.manifest.apiVersion}`],
      suggestion: migration,
    }),
  ];
}

function evaluateMissingRequests(
  context: ManifestRiskRuleContext,
): ManifestRiskFinding[] {
  const findings: ManifestRiskFinding[] = [];
  const podSpecs = collectPodSpecs(context.manifest.document);

  for (const podSpec of podSpecs) {
    for (const container of collectContainers(podSpec)) {
      const containerName = asString(container.name) ?? "container";
      const resources = isRecord(container.resources) ? container.resources : null;
      const requests = resources && isRecord(resources.requests) ? resources.requests : null;
      const hasRequests =
        requests &&
        Object.values(requests).some(
          (value) => typeof value === "string" && value.trim().length > 0,
        );

      if (hasRequests) {
        continue;
      }

      findings.push(
        createFinding(context, {
          id: `missing-requests-${context.manifest.documentIndex}-${containerName}`,
          severity: "low",
          category: "resources",
          title: "Container is missing resource requests",
          explanation:
            "Schedulers and cluster autoscalers rely on requests to place pods and estimate capacity.",
          evidence: [`${containerName}: no resources.requests`],
          suggestion:
            "Set resources.requests alongside limits based on observed usage.",
        }),
      );
    }
  }

  return findings;
}

function evaluateRunAsRoot(
  context: ManifestRiskRuleContext,
): ManifestRiskFinding[] {
  const findings: ManifestRiskFinding[] = [];
  const podSpecs = collectPodSpecs(context.manifest.document);

  for (const podSpec of podSpecs) {
    const contexts = [
      isRecord(podSpec.securityContext) ? podSpec.securityContext : null,
      ...collectContainers(podSpec)
        .map((container) =>
          isRecord(container.securityContext) ? container.securityContext : null,
        )
        .filter(Boolean),
    ];

    for (const securityContext of contexts) {
      if (!securityContext) {
        continue;
      }

      const runAsUser = securityContext.runAsUser;
      const runAsNonRoot = securityContext.runAsNonRoot;

      if (runAsUser === 0 || runAsNonRoot === false) {
        findings.push(
          createFinding(context, {
            id: `run-as-root-${context.manifest.documentIndex}-${String(runAsUser)}`,
            severity: "high",
            category: "security_context",
            title: "Workload may run as root",
            explanation:
              "Processes running as UID 0 or with runAsNonRoot: false weaken container isolation.",
            evidence: [
              runAsUser === 0
                ? "securityContext.runAsUser: 0"
                : "securityContext.runAsNonRoot: false",
            ],
            suggestion:
              "Set runAsNonRoot: true and an explicit non-zero runAsUser.",
          }),
        );
      }
    }
  }

  return findings;
}

function evaluateRecreateStrategy(
  context: ManifestRiskRuleContext,
): ManifestRiskFinding[] {
  if (context.manifest.kind !== "Deployment") {
    return [];
  }

  const spec = isRecord(context.manifest.document.spec)
    ? context.manifest.document.spec
    : null;
  const strategy = spec && isRecord(spec.strategy) ? spec.strategy : null;
  const strategyType = asString(strategy?.type);

  if (strategyType !== "Recreate") {
    return [];
  }

  return [
    createFinding(context, {
      id: `recreate-strategy-${context.manifest.documentIndex}`,
      severity: "medium",
      category: "rollout",
      title: "Deployment uses Recreate rollout strategy",
      explanation:
        "Recreate stops all pods before starting new ones, which can cause downtime during updates.",
      evidence: ["spec.strategy.type: Recreate"],
      suggestion:
        "Prefer RollingUpdate with maxUnavailable and maxSurge tuned for your service.",
    }),
  ];
}

function evaluatePrivilegeEscalation(
  context: ManifestRiskRuleContext,
): ManifestRiskFinding[] {
  const findings: ManifestRiskFinding[] = [];
  const podSpecs = collectPodSpecs(context.manifest.document);

  for (const podSpec of podSpecs) {
    for (const container of collectContainers(podSpec)) {
      const securityContext = isRecord(container.securityContext)
        ? container.securityContext
        : null;

      if (securityContext?.allowPrivilegeEscalation !== true) {
        continue;
      }

      const containerName = asString(container.name) ?? "container";

      findings.push(
        createFinding(context, {
          id: `privilege-escalation-${context.manifest.documentIndex}-${containerName}`,
          severity: "high",
          category: "security_context",
          title: "Container allows privilege escalation",
          explanation:
            "allowPrivilegeEscalation: true lets processes gain more privileges than their parent.",
          evidence: [`${containerName}: allowPrivilegeEscalation: true`],
          suggestion:
            "Set allowPrivilegeEscalation: false unless a documented capability requires it.",
        }),
      );
    }
  }

  return findings;
}

function evaluateAutomountServiceAccountToken(
  context: ManifestRiskRuleContext,
): ManifestRiskFinding[] {
  const podSpecs = collectPodSpecs(context.manifest.document);
  const findings: ManifestRiskFinding[] = [];

  for (const podSpec of podSpecs) {
    if (podSpec.automountServiceAccountToken !== true) {
      continue;
    }

    findings.push(
      createFinding(context, {
        id: `automount-sa-token-${context.manifest.documentIndex}`,
        severity: "low",
        category: "security_context",
        title: "Pod explicitly automounts service account tokens",
        explanation:
          "Mounting API credentials into every pod increases blast radius if the workload is compromised.",
        evidence: ["automountServiceAccountToken: true"],
        suggestion:
          "Set automountServiceAccountToken: false when the workload does not need the Kubernetes API.",
      }),
    );
  }

  return findings;
}

export const MANIFEST_RISK_RULES: ManifestRiskRule[] = [
  { id: "latest-image-tag", evaluate: evaluateLatestImageTag },
  { id: "missing-limits", evaluate: evaluateMissingLimits },
  { id: "missing-requests", evaluate: evaluateMissingRequests },
  { id: "privileged", evaluate: evaluatePrivileged },
  { id: "run-as-root", evaluate: evaluateRunAsRoot },
  { id: "privilege-escalation", evaluate: evaluatePrivilegeEscalation },
  { id: "hostpath", evaluate: evaluateHostPath },
  { id: "cluster-admin-binding", evaluate: evaluateClusterAdminBinding },
  { id: "deprecated-api-version", evaluate: evaluateDeprecatedApiVersion },
  { id: "recreate-strategy", evaluate: evaluateRecreateStrategy },
  { id: "automount-sa-token", evaluate: evaluateAutomountServiceAccountToken },
];

export function getHighestManifestSeverity(
  findings: ManifestRiskFinding[],
): ManifestRiskSeverity | null {
  for (const severity of SEVERITY_ORDER) {
    if (findings.some((finding) => finding.severity === severity)) {
      return severity;
    }
  }

  return null;
}

function getManifestRiskLevel(
  score: number,
  highestSeverity: ManifestRiskSeverity | null,
): ManifestRiskLevel {
  if (highestSeverity === "critical" || score >= 60) {
    return "critical";
  }

  if (highestSeverity === "high" || score >= 35) {
    return "high";
  }

  if (highestSeverity === "medium" || score >= 15) {
    return "medium";
  }

  return "low";
}

export function evaluateManifestRisk(
  manifests: ParsedK8sManifest[],
): ManifestRiskReport {
  const findings = manifests
    .flatMap((manifest) => {
      const context: ManifestRiskRuleContext = {
        manifest,
        manifestRef: getManifestRef(manifest),
      };

      return MANIFEST_RISK_RULES.flatMap((rule) => rule.evaluate(context));
    })
    .sort(sortFindings);

  const highestSeverity = getHighestManifestSeverity(findings);
  const score = Math.min(
    100,
    findings.reduce(
      (total, finding) => total + SEVERITY_SCORE[finding.severity],
      0,
    ),
  );
  const highRiskFindingCount = findings.filter((finding) =>
    ["critical", "high"].includes(finding.severity),
  ).length;

  return {
    findings,
    highestSeverity,
    highRiskFindingCount,
    level: getManifestRiskLevel(score, highestSeverity),
    score,
  };
}
