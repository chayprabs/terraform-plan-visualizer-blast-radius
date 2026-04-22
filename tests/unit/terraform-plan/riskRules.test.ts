import { describe, expect, it } from "vitest";
import {
  createEmptyPlanSummary,
  type NormalizedOutputChange,
  type NormalizedPlan,
  type NormalizedResourceChange,
} from "@/features/terraform-plan/domain/normalizedPlanTypes";
import {
  evaluatePlanRules,
  evaluateResourceRules,
} from "@/features/terraform-plan/risk/riskRules";
import type { ResourceRiskSummary } from "@/features/terraform-plan/risk/riskTypes";

function createResourceChange(
  overrides: Partial<NormalizedResourceChange> = {},
): NormalizedResourceChange {
  return {
    address: "aws_instance.example",
    action: "update",
    after: {
      name: "example",
    },
    afterSensitive: undefined,
    afterUnknown: undefined,
    before: {
      name: "example",
    },
    beforeSensitive: undefined,
    deposed: null,
    generatedConfig: null,
    importing: null,
    index: null,
    isDestructive: false,
    isHighRisk: false,
    mode: "managed",
    moduleAddress: null,
    modulePath: [],
    name: "example",
    previousAddress: null,
    providerName: 'provider["registry.terraform.io/hashicorp/aws"]',
    providerShortName: "aws",
    raw: {
      address: "aws_instance.example",
      change: {
        actions: ["update"],
      },
      mode: "managed",
      name: "example",
      provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
      type: "aws_instance",
    },
    rawActions: ["update"],
    replacePaths: [],
    riskSummary: undefined,
    type: "aws_instance",
    typeGroup: "compute",
    ...overrides,
  };
}

function createOutputChange(
  overrides: Partial<NormalizedOutputChange> = {},
): NormalizedOutputChange {
  return {
    action: "update",
    after: "new",
    afterSensitive: undefined,
    afterUnknown: undefined,
    before: "old",
    beforeSensitive: undefined,
    isSensitive: false,
    name: "result",
    raw: {
      actions: ["update"],
      after: "new",
      before: "old",
    },
    rawActions: ["update"],
    ...overrides,
  };
}

function createResourceSummary(
  overrides: Partial<ResourceRiskSummary> = {},
): ResourceRiskSummary {
  return {
    actionKind: "update",
    findings: [],
    highestSeverity: null,
    resourceAddress: "aws_instance.example",
    resourceType: "aws_instance",
    score: 0,
    tags: [],
    ...overrides,
  };
}

function createNormalizedPlan(
  overrides: Partial<NormalizedPlan> = {},
): NormalizedPlan {
  return {
    formatVersion: "1.3",
    modules: [],
    outputChanges: [],
    providers: [],
    raw: {
      format_version: "1.3",
      resource_changes: [],
    },
    resourceChanges: [],
    resourceTypeGroups: [],
    riskReport: undefined,
    summary: createEmptyPlanSummary(),
    terraformVersion: "1.8.5",
    timestamp: undefined,
    ...overrides,
  };
}

describe("evaluateResourceRules", () => {
  it("flags default delete and replacement behavior, with critical escalation for databases", () => {
    const deleteFindings = evaluateResourceRules(
      createResourceChange({
        action: "delete",
        rawActions: ["delete"],
      }),
    );
    const databaseReplacementFindings = evaluateResourceRules(
      createResourceChange({
        action: "replace",
        rawActions: ["delete", "create"],
        replacePaths: [["instance_class"]],
        type: "aws_db_instance",
        typeGroup: "database",
      }),
    );

    expect(deleteFindings.map((finding) => finding.id)).toContain(
      "delete-default:aws_instance.example",
    );
    expect(
      databaseReplacementFindings.some(
        (finding) =>
          finding.id === "database-replacement:aws_instance.example" &&
          finding.severity === "critical",
      ),
    ).toBe(true);
    expect(
      databaseReplacementFindings.some(
        (finding) =>
          finding.id === "replacement-default:aws_instance.example" &&
          finding.severity === "high",
      ),
    ).toBe(true);
  });

  it("flags IAM changes with higher severity for destructive actions", () => {
    const updateFindings = evaluateResourceRules(
      createResourceChange({
        type: "aws_iam_role_policy",
        typeGroup: "iam",
      }),
    );
    const deleteFindings = evaluateResourceRules(
      createResourceChange({
        action: "delete",
        rawActions: ["delete"],
        type: "aws_iam_user",
        typeGroup: "iam",
      }),
    );

    expect(updateFindings.find((finding) => finding.category === "iam")?.severity).toBe(
      "medium",
    );
    expect(deleteFindings.find((finding) => finding.category === "iam")?.severity).toBe(
      "high",
    );
  });

  it("detects open internet ingress and unreadable network diffs", () => {
    const publicIngressFindings = evaluateResourceRules(
      createResourceChange({
        after: {
          ingress: [
            {
              cidr_blocks: ["0.0.0.0/0"],
            },
          ],
        },
        type: "aws_security_group",
        typeGroup: "network",
      }),
    );
    const unreadableDiffFindings = evaluateResourceRules(
      createResourceChange({
        after: "redacted",
        before: "redacted",
        type: "aws_security_group",
        typeGroup: "network",
      }),
    );

    expect(
      publicIngressFindings.find((finding) => finding.id.startsWith("network-open-ingress"))
        ?.severity,
    ).toBe("high");
    expect(
      unreadableDiffFindings.find((finding) =>
        finding.id.startsWith("network-unreadable-diff"),
      )?.severity,
    ).toBe("medium");
  });

  it("flags storage access, encryption, DNS, and load balancer changes", () => {
    const storageFindings = evaluateResourceRules(
      createResourceChange({
        type: "aws_s3_bucket_policy",
        typeGroup: "storage",
      }),
    );
    const kmsFindings = evaluateResourceRules(
      createResourceChange({
        type: "aws_kms_key",
        typeGroup: "kms",
      }),
    );
    const dnsFindings = evaluateResourceRules(
      createResourceChange({
        action: "replace",
        rawActions: ["delete", "create"],
        type: "aws_route53_record",
        typeGroup: "dns",
      }),
    );
    const loadBalancerFindings = evaluateResourceRules(
      createResourceChange({
        type: "aws_lb_listener",
        typeGroup: "network",
      }),
    );

    expect(storageFindings.find((finding) => finding.category === "public_access")?.severity).toBe(
      "high",
    );
    expect(kmsFindings.find((finding) => finding.category === "encryption")?.severity).toBe(
      "high",
    );
    expect(dnsFindings.find((finding) => finding.category === "reliability")?.severity).toBe(
      "high",
    );
    expect(
      loadBalancerFindings.find((finding) => finding.id.startsWith("load-balancer-change"))
        ?.severity,
    ).toBe("medium");
  });

  it("flags secret changes without exposing secret values and reports unknown after values", () => {
    const secretFindings = evaluateResourceRules(
      createResourceChange({
        after: {
          secret_string: "super-secret-value",
        },
        type: "aws_secretsmanager_secret_version",
        typeGroup: "unknown",
      }),
    );
    const unknownFindings = evaluateResourceRules(
      createResourceChange({
        afterUnknown: {
          endpoint: true,
        },
        type: "aws_db_instance",
        typeGroup: "database",
      }),
    );

    expect(secretFindings.find((finding) => finding.category === "secrets")?.severity).toBe(
      "high",
    );
    expect(JSON.stringify(secretFindings)).not.toContain("super-secret-value");
    expect(
      unknownFindings.find((finding) => finding.category === "unknowns")?.severity,
    ).toBe("medium");
  });
});

describe("evaluatePlanRules", () => {
  it("flags sensitive outputs, large plans, and provider warnings", () => {
    const resourceChanges = Array.from({ length: 51 }, (_, index) =>
      createResourceChange({
        action: "create",
        address: `aws_instance.node_${index}`,
        name: `node_${index}`,
        raw: {
          address: `aws_instance.node_${index}`,
          change: {
            actions: ["create"],
          },
          mode: "managed",
          name: `node_${index}`,
          provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
          type: "aws_instance",
        },
        rawActions: ["create"],
      }),
    );
    const normalizedPlan = createNormalizedPlan({
      outputChanges: [
        createOutputChange({
          isSensitive: true,
          name: "db_password",
        }),
      ],
      providers: [
        {
          actionCounts: {
            create: 51,
          },
          providerName: 'provider["registry.terraform.io/hashicorp/aws"]',
          resourceCount: 51,
          resourceTypes: ["aws_instance"],
          shortName: "aws",
        },
      ],
      raw: {
        configuration: {
          provider_config: {
            aws: {
              name: "aws",
            },
          },
        },
        format_version: "1.3",
        resource_changes: [],
      },
      resourceChanges,
    });
    const findings = evaluatePlanRules(
      normalizedPlan,
      resourceChanges.map(() => createResourceSummary()),
    );

    expect(
      findings.some((finding) => finding.id.startsWith("sensitive-output-change")),
    ).toBe(true);
    expect(findings.some((finding) => finding.id === "many-changes-medium")).toBe(
      true,
    );
    expect(
      findings.some((finding) =>
        finding.id.startsWith("provider-version-unknown:aws"),
      ),
    ).toBe(true);
  });

  it("adds provider metadata info findings when provider config is absent or unknown", () => {
    const normalizedPlan = createNormalizedPlan({
      providers: [
        {
          actionCounts: {},
          providerName: "unknown",
          resourceCount: 1,
          resourceTypes: ["aws_instance"],
          shortName: "unknown",
        },
      ],
    });
    const findings = evaluatePlanRules(normalizedPlan, [
      createResourceSummary({
        tags: ["unknown-provider"],
      }),
    ]);

    expect(findings.map((finding) => finding.id)).toEqual(
      expect.arrayContaining(["provider-config-absent", "provider-metadata-unknown"]),
    );
  });
});
