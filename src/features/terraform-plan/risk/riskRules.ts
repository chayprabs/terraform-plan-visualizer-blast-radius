import { getChangedResources } from "@/features/terraform-plan/domain/planSummary";
import {
  formatCostThresholdSummary,
  formatCurrencyAmount,
  formatMonthlyDelta,
  getCostSeverityForDelta,
} from "@/features/terraform-plan/cost/costUtils";
import type {
  NormalizedOutputChange,
  NormalizedPlan,
  NormalizedResourceChange,
} from "@/features/terraform-plan/domain/normalizedPlanTypes";
import {
  getModuleScopeLabel,
  getModuleTags,
} from "@/features/terraform-plan/risk/riskCopy";
import type {
  PlanRiskRule,
  ResourceRiskRule,
  ResourceRiskSummary,
  RiskFinding,
} from "@/features/terraform-plan/risk/riskTypes";

type JsonPathSegment = number | string;

const PUBLIC_CIDRS = new Set(["0.0.0.0/0", "::/0"]);
const NETWORK_DIFF_KEYS = [
  "ingress",
  "egress",
  "cidr_blocks",
  "ipv6_cidr_blocks",
  "source_ranges",
  "rules",
  "firewall",
  "acl",
];
const STORAGE_ACCESS_KEYWORDS = [
  "bucket_policy",
  "bucket_acl",
  "public_access_block",
  "bucket_iam",
  "storage_bucket_iam",
  "container_access",
  "container_acl",
];
const LOAD_BALANCER_KEYWORDS = [
  "load_balancer",
  "lb_",
  "listener",
  "certificate",
  "cert_",
  "_certificate",
];
const KMS_KEYWORDS = [
  "kms_",
  "key_ring",
  "crypto_key",
  "vault_key",
  "key_policy",
  "keyvault_key",
];
const SECRET_KEYWORDS = [
  "secret",
  "secretsmanager",
  "vault_secret",
  "key_vault_secret",
  "ssm_parameter",
  "parameter",
  "credential",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatPath(path: JsonPathSegment[]): string {
  return path.reduce<string>((formatted, segment) => {
    if (typeof segment === "number") {
      return `${formatted}[${segment}]`;
    }

    return formatted ? `${formatted}.${String(segment)}` : String(segment);
  }, "");
}

function collectMatchingStringPaths(
  value: unknown,
  matcher: (value: string, path: string) => boolean,
  path: JsonPathSegment[] = [],
): string[] {
  if (typeof value === "string") {
    const formattedPath = formatPath(path);
    return matcher(value, formattedPath)
      ? [`${formattedPath || "value"} = ${value}`]
      : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectMatchingStringPaths(entry, matcher, [...path, index]),
    );
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, entry]) =>
      collectMatchingStringPaths(entry, matcher, [...path, key]),
    );
  }

  return [];
}

function collectTruthyPaths(
  value: unknown,
  path: JsonPathSegment[] = [],
): string[] {
  if (value === true) {
    return [formatPath(path) || "root"];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectTruthyPaths(entry, [...path, index]));
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, entry]) =>
      collectTruthyPaths(entry, [...path, key]),
    );
  }

  return [];
}

function hasReadableNetworkDiff(change: NormalizedResourceChange): boolean {
  const values = [change.before, change.after];

  return values.some((value) => {
    if (!isRecord(value)) {
      return false;
    }

    return Object.keys(value).some((key) =>
      NETWORK_DIFF_KEYS.some((keyword) => key.toLowerCase().includes(keyword)),
    );
  });
}

function isDatabaseResource(change: NormalizedResourceChange): boolean {
  return change.typeGroup === "database";
}

function isIamResource(change: NormalizedResourceChange): boolean {
  return change.typeGroup === "iam";
}

function isNetworkBoundaryResource(change: NormalizedResourceChange): boolean {
  if (change.typeGroup !== "network") {
    return false;
  }

  const normalizedType = change.type.toLowerCase();

  return (
    normalizedType.includes("security_group") ||
    normalizedType.includes("firewall") ||
    normalizedType.includes("network_acl")
  );
}

function isStorageAccessResource(change: NormalizedResourceChange): boolean {
  if (change.typeGroup !== "storage") {
    return false;
  }

  const normalizedType = change.type.toLowerCase();

  return STORAGE_ACCESS_KEYWORDS.some((keyword) =>
    normalizedType.includes(keyword),
  );
}

function isDnsResource(change: NormalizedResourceChange): boolean {
  return change.typeGroup === "dns";
}

function isLoadBalancerResource(change: NormalizedResourceChange): boolean {
  const normalizedType = change.type.toLowerCase();

  return LOAD_BALANCER_KEYWORDS.some((keyword) =>
    normalizedType.includes(keyword),
  );
}

function isKmsResource(change: NormalizedResourceChange): boolean {
  if (change.typeGroup === "kms") {
    return true;
  }

  const normalizedType = change.type.toLowerCase();

  return KMS_KEYWORDS.some((keyword) => normalizedType.includes(keyword));
}

function isSecretResource(change: NormalizedResourceChange): boolean {
  const normalizedType = change.type.toLowerCase();

  return SECRET_KEYWORDS.some((keyword) => normalizedType.includes(keyword));
}

function hasUnknownAfterValues(change: NormalizedResourceChange): boolean {
  return collectTruthyPaths(change.afterUnknown).length > 0;
}

function createResourceFinding(
  ruleId: string,
  change: NormalizedResourceChange,
  finding: Omit<
    RiskFinding,
    "actionKind" | "id" | "resourceAddress" | "resourceType" | "tags"
  >,
): RiskFinding {
  return {
    ...finding,
    id: `${ruleId}:${change.address}`,
    resourceAddress: change.address,
    resourceType: change.type,
    actionKind: change.action,
    evidence: [
      ...finding.evidence,
      `Module scope: ${getModuleScopeLabel(change.moduleAddress)}.`,
    ],
    tags: getModuleTags(change.moduleAddress),
  };
}

function createOutputFinding(
  ruleId: string,
  outputChange: NormalizedOutputChange,
  finding: Omit<RiskFinding, "actionKind" | "id" | "resourceAddress" | "resourceType" | "tags">,
): RiskFinding {
  return {
    ...finding,
    id: `${ruleId}:output.${outputChange.name}`,
    resourceAddress: `output.${outputChange.name}`,
    resourceType: "terraform_output",
    actionKind: outputChange.action,
    tags: [],
  };
}

function createPlanFinding(
  ruleId: string,
  finding: Omit<RiskFinding, "actionKind" | "id" | "tags">,
): RiskFinding {
  return {
    ...finding,
    id: ruleId,
    actionKind: "plan",
    tags: [],
  };
}

function isNearlyEqual(left: number | null, right: number | null): boolean {
  if (left === null || right === null) {
    return false;
  }

  return Math.abs(left - right) < 0.001;
}

export const RESOURCE_RISK_RULES: ResourceRiskRule[] = [
  {
    id: "delete-default",
    evaluate: (change) =>
      change.action === "delete"
        ? [
            createResourceFinding("delete-default", change, {
              severity: "high",
              category: "destructive",
              title: "Resource delete planned",
              explanation:
                "Deleting a Terraform-managed resource can remove live infrastructure or stateful dependencies.",
              evidence: [`Terraform action: ${change.action}.`],
              suggestion:
                "Confirm the delete is expected and that downstream services can tolerate the removal.",
              confidence: 0.98,
            }),
          ]
        : [],
  },
  {
    id: "replacement-default",
    evaluate: (change) =>
      change.action === "replace"
        ? [
            createResourceFinding("replacement-default", change, {
              severity: "high",
              category: "replacement",
              title: "Resource replacement planned",
              explanation:
                "Terraform will destroy and recreate this resource rather than applying the change in place.",
              evidence: [
                `Terraform action: ${change.action}.`,
                change.replacePaths.length > 0
                  ? `Replacement paths: ${change.replacePaths
                      .map((path) => formatPath(path))
                      .join(", ")}.`
                  : "Replacement path details were not included.",
              ],
              suggestion:
                "Review whether replacement is acceptable for availability, identity, and attached dependencies.",
              confidence: 0.98,
            }),
          ]
        : [],
  },
  {
    id: "database-replacement",
    evaluate: (change) =>
      change.action === "replace" && isDatabaseResource(change)
        ? [
            createResourceFinding("database-replacement", change, {
              severity: "critical",
              category: "database",
              title: "Database replacement detected",
              explanation:
                "Replacing a database resource can cause downtime, endpoint changes, or data migration risk.",
              evidence: [
                `Database resource type: ${change.type}.`,
                change.replacePaths.length > 0
                  ? `Replacement triggered by: ${change.replacePaths
                      .map((path) => formatPath(path))
                      .join(", ")}.`
                  : "Replacement path details were not included.",
              ],
              suggestion:
                "Validate backup, migration, cutover, and rollback plans before applying this change.",
              confidence: 0.99,
            }),
          ]
        : [],
  },
  {
    id: "database-delete",
    evaluate: (change) =>
      change.action === "delete" && isDatabaseResource(change)
        ? [
            createResourceFinding("database-delete", change, {
              severity: "critical",
              category: "database",
              title: "Database delete detected",
              explanation:
                "Deleting a database resource can remove data or make production services unavailable.",
              evidence: [`Database resource type: ${change.type}.`],
              suggestion:
                "Confirm retention, backup recovery, and replacement plans before approving this delete.",
              confidence: 0.99,
            }),
          ]
        : [],
  },
  {
    id: "iam-change",
    evaluate: (change) =>
      isIamResource(change)
        ? [
            createResourceFinding("iam-change", change, {
              severity:
                change.action === "delete" || change.action === "replace"
                  ? "high"
                  : "medium",
              category: "iam",
              title: "IAM permissions changed",
              explanation:
                "IAM changes can expand, reduce, or rewire access for users, workloads, or services.",
              evidence: [`IAM-related resource type: ${change.type}.`],
              suggestion:
                "Review the effective principals and permissions to confirm the access change is intentional.",
              confidence: 0.94,
            }),
          ]
        : [],
  },
  {
    id: "network-open-ingress",
    evaluate: (change) => {
      if (!isNetworkBoundaryResource(change)) {
        return [];
      }

      const publicIngressPaths = collectMatchingStringPaths(
        change.after,
        (value, path) =>
          PUBLIC_CIDRS.has(value) &&
          /cidr|source|ingress|ipv6/i.test(path),
      );

      return publicIngressPaths.length > 0
        ? [
            createResourceFinding("network-open-ingress", change, {
              severity: "high",
              category: "public_access",
              title: "Public ingress detected",
              explanation:
                "This network change appears to allow inbound access from the public internet.",
              evidence: publicIngressPaths,
              suggestion:
                "Verify the exposure is intended and restrict the CIDR range if the service should stay private.",
              confidence: 0.97,
            }),
          ]
        : [];
    },
  },
  {
    id: "network-unreadable-diff",
    evaluate: (change) =>
      change.action === "update" &&
      isNetworkBoundaryResource(change) &&
      !hasReadableNetworkDiff(change)
        ? [
            createResourceFinding("network-unreadable-diff", change, {
              severity: "medium",
              category: "network",
              title: "Network update lacks readable diff evidence",
              explanation:
                "The plan updates a network boundary resource, but the before/after data is not detailed enough to review the effective change.",
              evidence: [
                "Network-sensitive attributes were not clearly present in before/after values.",
              ],
              suggestion:
                "Regenerate the plan with readable attribute diffs or inspect the resource arguments before applying.",
              confidence: 0.74,
            }),
          ]
        : [],
  },
  {
    id: "storage-public-access",
    evaluate: (change) =>
      isStorageAccessResource(change)
        ? [
            createResourceFinding("storage-public-access", change, {
              severity: "high",
              category: "public_access",
              title: "Storage access controls changed",
              explanation:
                "Bucket policy, ACL, or public access settings can expose data publicly if the configuration is too permissive.",
              evidence: [`Storage access resource type: ${change.type}.`],
              suggestion:
                "Review principals, ACLs, and public access settings to confirm the bucket remains scoped correctly.",
              confidence: 0.89,
            }),
          ]
        : [],
  },
  {
    id: "kms-key-change",
    evaluate: (change) =>
      isKmsResource(change)
        ? [
            createResourceFinding("kms-key-change", change, {
              severity: "high",
              category: "encryption",
              title: "Encryption key settings changed",
              explanation:
                "KMS, key vault, or key policy changes can affect encryption, access to encrypted data, or key rotation behavior.",
              evidence: [`Encryption-related resource type: ${change.type}.`],
              suggestion:
                "Validate key policy, rotation, grants, and dependent workloads before applying this change.",
              confidence: 0.92,
            }),
          ]
        : [],
  },
  {
    id: "dns-destructive-change",
    evaluate: (change) =>
      isDnsResource(change) &&
      (change.action === "delete" || change.action === "replace")
        ? [
            createResourceFinding("dns-destructive-change", change, {
              severity: "high",
              category: "reliability",
              title: "DNS record removal or replacement detected",
              explanation:
                "Deleting or replacing DNS records can break routing, service discovery, or certificate validation.",
              evidence: [`DNS action: ${change.action}.`],
              suggestion:
                "Confirm the record transition plan and TTL strategy before applying this DNS change.",
              confidence: 0.97,
            }),
          ]
        : [],
  },
  {
    id: "load-balancer-change",
    evaluate: (change) =>
      isLoadBalancerResource(change)
        ? [
            createResourceFinding("load-balancer-change", change, {
              severity:
                change.action === "delete" || change.action === "replace"
                  ? "high"
                  : "medium",
              category: "reliability",
              title: "Traffic routing component changed",
              explanation:
                "Load balancer, listener, or certificate changes can affect ingress traffic, TLS handshakes, or availability.",
              evidence: [`Traffic-routing resource type: ${change.type}.`],
              suggestion:
                "Check listener rules, certificates, and health check behavior before rollout.",
              confidence: 0.9,
            }),
          ]
        : [],
  },
  {
    id: "secret-change",
    evaluate: (change) =>
      isSecretResource(change) && hasPlanMutableAction(change)
        ? [
            createResourceFinding("secret-change", change, {
              severity: "high",
              category: "secrets",
              title: "Secret material changed",
              explanation:
                "Secret manager, parameter store, or vault changes can impact credentials and dependent workloads.",
              evidence: [
                `Secret-related resource type: ${change.type}.`,
                "Secret values are intentionally redacted from risk findings.",
              ],
              suggestion:
                "Review secret rotation timing, consumers, and rollback steps without exposing the secret values.",
              confidence: 0.95,
            }),
          ]
        : [],
  },
  {
    id: "unknown-after-critical-resource",
    evaluate: (change) =>
      hasUnknownAfterValues(change) &&
      (isDatabaseResource(change) ||
        isIamResource(change) ||
        isNetworkBoundaryResource(change) ||
        isStorageAccessResource(change) ||
        isKmsResource(change) ||
        isSecretResource(change))
        ? [
            createResourceFinding("unknown-after-critical-resource", change, {
              severity: "medium",
              category: "unknowns",
              title: "Critical resource has unknown post-apply values",
              explanation:
                "The plan cannot fully show the final values for a security- or availability-sensitive resource.",
              evidence: collectTruthyPaths(change.afterUnknown)
                .slice(0, 5)
                .map((path) => `Unknown after apply: ${path}.`),
              suggestion:
                "Inspect provider behavior or a follow-up plan to confirm the final values before rollout.",
              confidence: 0.8,
            }),
          ]
        : [],
  },
  {
    id: "resource-cost-increase",
    evaluate: (change) => {
      const costEstimate = change.costEstimate;
      const thresholds = change.costThresholds;

      if (!costEstimate || !thresholds) {
        return [];
      }

      const severity = getCostSeverityForDelta(
        costEstimate.monthlyDelta,
        thresholds,
      );

      if (!severity) {
        return [];
      }

      return [
        createResourceFinding("resource-cost-increase", change, {
          severity,
          category: "cost",
          title: "Resource monthly cost increase exceeds threshold",
          explanation:
            "This resource's estimated monthly cost delta exceeds the configured review threshold.",
          evidence: [
            `Estimated monthly delta: ${formatMonthlyDelta(
              costEstimate.monthlyDelta,
              costEstimate.currency,
            )}.`,
            costEstimate.monthlyCostBefore !== null &&
            costEstimate.monthlyCostAfter !== null
              ? `Estimated monthly cost: ${formatCurrencyAmount(
                  costEstimate.monthlyCostBefore,
                  costEstimate.currency,
                )} -> ${formatCurrencyAmount(
                  costEstimate.monthlyCostAfter,
                  costEstimate.currency,
                )}.`
              : "Before and after monthly costs were not both provided.",
            `Thresholds: ${formatCostThresholdSummary(
              thresholds,
              costEstimate.currency,
            )}.`,
          ],
          suggestion:
            "Confirm the spend increase is expected, budgeted, and acceptable before approving this change.",
          confidence: costEstimate.source === "manual" ? 0.72 : 0.9,
        }),
      ];
    },
  },
];

export const PLAN_RISK_RULES: PlanRiskRule[] = [
  {
    id: "sensitive-output-change",
    evaluate: (_plan, _resourceSummaries, outputChanges) =>
      outputChanges
        .filter((outputChange) => outputChange.isSensitive)
        .map((outputChange) =>
          createOutputFinding("sensitive-output-change", outputChange, {
            severity: "medium",
            category: "outputs",
            title: "Sensitive output changed",
            explanation:
              "A Terraform output marked sensitive changed in this plan, so downstream consumers may see a new sensitive value.",
            evidence: [
              `Output name: ${outputChange.name}.`,
              "Sensitive output values are intentionally redacted from risk findings.",
            ],
            suggestion:
              "Review consumers of this output and confirm that the sensitive value can rotate safely.",
            confidence: 0.9,
          }),
        ),
  },
  {
    id: "many-changes",
    evaluate: (normalizedPlan) => {
      const changedCount = getChangedResources(normalizedPlan).length;

      if (changedCount > 200) {
        return [
          createPlanFinding("many-changes-high", {
            severity: "high",
            category: "cost",
            title: "Very large change set detected",
            explanation:
              "Plans with more than 200 changed resources are harder to review and increase rollout risk.",
            resourceAddress: undefined,
            resourceType: undefined,
            evidence: [`Changed resources: ${changedCount}.`],
            suggestion:
              "Split the rollout into smaller plans or stage the changes to reduce blast radius.",
            confidence: 0.98,
          }),
        ];
      }

      if (changedCount > 50) {
        return [
          createPlanFinding("many-changes-medium", {
            severity: "medium",
            category: "cost",
            title: "Large change set detected",
            explanation:
              "Plans with more than 50 changed resources can hide risky changes inside a large review surface.",
            resourceAddress: undefined,
            resourceType: undefined,
            evidence: [`Changed resources: ${changedCount}.`],
            suggestion:
              "Consider chunking the rollout or reviewing the highest-risk resources separately before apply.",
            confidence: 0.98,
          }),
        ];
      }

      return [];
    },
  },
  {
    id: "provider-version-unknown",
    evaluate: (normalizedPlan) => {
      const providerConfigs = Object.entries(
        normalizedPlan.raw.configuration?.provider_config ?? {},
      );

      return providerConfigs
        .filter(([, config]) => !config.version_constraint)
        .map(([providerKey]) =>
          createPlanFinding(`provider-version-unknown:${providerKey}`, {
            severity: "medium",
            category: "provider",
            title: "Provider version constraint not shown",
            explanation:
              "The plan includes provider configuration, but the provider version constraint is not visible for this provider.",
            resourceAddress: undefined,
            resourceType: `provider.${providerKey}`,
            evidence: [`Provider config key: ${providerKey}.`],
            suggestion:
              "Pin or confirm the provider version so behavior changes are easier to reason about during review.",
            confidence: 0.87,
          }),
        );
    },
  },
  {
    id: "provider-config-unknown",
    evaluate: (normalizedPlan, resourceSummaries) => {
      const providerConfigs = Object.keys(
        normalizedPlan.raw.configuration?.provider_config ?? {},
      );
      const hasUnknownProvider = resourceSummaries.some(
        (summary) => summary.tags.includes("unknown-provider"),
      );

      const findings: RiskFinding[] = [];

      if (providerConfigs.length === 0 && normalizedPlan.providers.length > 0) {
        findings.push(
          createPlanFinding("provider-config-absent", {
            severity: "info",
            category: "provider",
            title: "Provider configuration not included in plan JSON",
            explanation:
              "The plan did not include provider configuration details, so version and alias review is limited.",
            resourceAddress: undefined,
            resourceType: "provider_config",
            evidence: ["No provider_config entries were present in configuration."],
            suggestion:
              "Generate a fuller plan JSON if provider configuration details are needed for review.",
            confidence: 0.93,
          }),
        );
      }

      if (hasUnknownProvider) {
        findings.push(
          createPlanFinding("provider-metadata-unknown", {
            severity: "info",
            category: "provider",
            title: "Some resource changes have unknown provider metadata",
            explanation:
              "At least one resource change did not include enough provider metadata to attribute it cleanly.",
            resourceAddress: undefined,
            resourceType: "provider",
            evidence: ["One or more resources normalized to provider short name 'unknown'."],
            suggestion:
              "Inspect the raw plan or provider aliases to confirm which provider instance owns each change.",
            confidence: 0.9,
          }),
        );
      }

      return findings;
    },
  },
  {
    id: "plan-cost-increase",
    evaluate: (normalizedPlan) => {
      const costEstimate = normalizedPlan.costEstimate;

      if (!costEstimate) {
        return [];
      }

      const severity = getCostSeverityForDelta(
        costEstimate.totalMonthlyDelta,
        costEstimate.thresholds,
      );

      if (!severity) {
        return [];
      }

      if (
        costEstimate.resourceEntries.length === 1 &&
        isNearlyEqual(
          costEstimate.resourceEntries[0]?.monthlyDelta ?? null,
          costEstimate.totalMonthlyDelta,
        )
      ) {
        return [];
      }

      return [
        createPlanFinding("plan-cost-increase", {
          severity,
          category: "cost",
          title: "Estimated monthly cost increase exceeds threshold",
          explanation:
            "The overall estimated monthly cost delta exceeds the configured review threshold for this analysis.",
          resourceAddress: undefined,
          resourceType: undefined,
          evidence: [
            `Estimated monthly delta: ${formatMonthlyDelta(
              costEstimate.totalMonthlyDelta,
              costEstimate.currency,
            )}.`,
            costEstimate.totalMonthlyCostBefore !== null &&
            costEstimate.totalMonthlyCostAfter !== null
              ? `Estimated monthly cost: ${formatCurrencyAmount(
                  costEstimate.totalMonthlyCostBefore,
                  costEstimate.currency,
                )} -> ${formatCurrencyAmount(
                  costEstimate.totalMonthlyCostAfter,
                  costEstimate.currency,
                )}.`
              : "Reported total monthly cost before and after values were not both available.",
            `Thresholds: ${formatCostThresholdSummary(
              costEstimate.thresholds,
              costEstimate.currency,
            )}.`,
            costEstimate.note ? `Reviewer note: ${costEstimate.note}.` : null,
          ].filter((entry): entry is string => Boolean(entry)),
          suggestion:
            "Review budget impact, owner approval, and rollout timing before applying this spend increase.",
          confidence: costEstimate.source === "manual" ? 0.72 : 0.9,
        }),
      ];
    },
  },
];

export function evaluateResourceRules(
  resourceChange: NormalizedResourceChange,
): RiskFinding[] {
  return RESOURCE_RISK_RULES.flatMap((rule) => rule.evaluate(resourceChange));
}

export function evaluatePlanRules(
  normalizedPlan: NormalizedPlan,
  resourceSummaries: ResourceRiskSummary[],
  outputChanges: NormalizedOutputChange[] = normalizedPlan.outputChanges,
): RiskFinding[] {
  return PLAN_RISK_RULES.flatMap((rule) =>
    rule.evaluate(normalizedPlan, resourceSummaries, outputChanges),
  );
}
