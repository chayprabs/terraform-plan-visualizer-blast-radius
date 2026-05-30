import { describe, expect, it } from "vitest";
import { normalizeAction } from "@/features/terraform-plan/domain/actionTypes";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import type { NormalizedResourceChange } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { getResourceTypeGroup } from "@/features/terraform-plan/domain/providerTypes";
import type { TerraformPlan } from "@/features/terraform-plan/domain/terraformPlanTypes";
import { evaluateResourceRules } from "@/features/terraform-plan/risk/riskRules";

function createResourceChange(
  overrides: Partial<NormalizedResourceChange> = {},
): NormalizedResourceChange {
  return {
    address: "aws_instance.example",
    action: "no-op",
    after: undefined,
    afterSensitive: undefined,
    afterUnknown: undefined,
    before: undefined,
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
      change: { actions: ["no-op"] },
      mode: "managed",
      name: "example",
      provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
      type: "aws_instance",
    },
    rawActions: ["no-op"],
    replacePaths: [],
    riskSummary: undefined,
    type: "aws_instance",
    typeGroup: "compute",
    ...overrides,
  };
}

describe("core pipeline edge cases", () => {
  it("does not flag no-op IAM resources (expected: zero iam findings)", () => {
    const findings = evaluateResourceRules(
      createResourceChange({
        action: "no-op",
        rawActions: ["no-op"],
        type: "aws_iam_role_policy",
        typeGroup: "iam",
      }),
    );

    expect(findings.filter((f) => f.category === "iam")).toHaveLength(0);
  });

  it("detects Azure NSG rule public ingress (azurerm_network_security_rule)", () => {
    const findings = evaluateResourceRules(
      createResourceChange({
        action: "update",
        rawActions: ["update"],
        after: {
          source_address_prefix: "0.0.0.0/0",
        },
        type: "azurerm_network_security_rule",
        typeGroup: getResourceTypeGroup("azurerm_network_security_rule"),
      }),
    );

    expect(
      findings.some((f) => f.id.startsWith("network-open-ingress")),
    ).toBe(true);
  });

  it("classifies azurerm_key_vault_secret without duplicate kms+secret rule overlap", () => {
    const group = getResourceTypeGroup("azurerm_key_vault_secret");
    const findings = evaluateResourceRules(
      createResourceChange({
        action: "update",
        rawActions: ["update"],
        type: "azurerm_key_vault_secret",
        typeGroup: group,
      }),
    );

    const categories = findings.map((f) => f.category);
    expect(categories.filter((c) => c === "encryption").length).toBeLessThanOrEqual(
      1,
    );
    expect(categories.filter((c) => c === "secrets").length).toBeLessThanOrEqual(1);
  });
});

describe("normalizeAction edge cases", () => {
  it("treats whitespace-padded actions as normalized", () => {
    expect(normalizeAction([" Create "])).toBe("create");
  });
});

describe("planned_values-only plans", () => {
  it("normalizes to empty resource changes when only planned_values exists", () => {
    const plan: TerraformPlan = {
      format_version: "1.3",
      planned_values: { root_module: { resources: [] } },
    };
    const normalized = normalizeTerraformPlan(plan);

    expect(normalized.resourceChanges).toHaveLength(0);
    expect(normalized.summary.totalResourceChanges).toBe(0);
  });
});
