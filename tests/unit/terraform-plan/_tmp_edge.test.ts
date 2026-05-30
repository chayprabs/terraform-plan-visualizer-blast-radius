import { describe, expect, it } from "vitest";
import { getResourceTypeGroup } from "@/features/terraform-plan/domain/providerTypes";
import { evaluateResourceRules } from "@/features/terraform-plan/risk/riskRules";

describe("tmp", () => {
  it("key vault secret findings", () => {
    const type = "azurerm_key_vault_secret";
    const findings = evaluateResourceRules({
      address: "azurerm_key_vault_secret.x",
      action: "update",
      after: {},
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
      name: "x",
      previousAddress: null,
      providerName: "azurerm",
      providerShortName: "azurerm",
      raw: {
        address: "x",
        change: { actions: ["update"] },
        mode: "managed",
        name: "x",
        type,
      },
      rawActions: ["update"],
      replacePaths: [],
      riskSummary: undefined,
      type,
      typeGroup: getResourceTypeGroup(type),
    });
    console.log(findings.map((f) => `${f.id} ${f.category}`));
    expect(findings.length).toBeGreaterThan(0);
  });
});
