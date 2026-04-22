import { describe, expect, it } from "vitest";
import {
  normalizeAction,
  type ChangeActionKind,
} from "@/features/terraform-plan/domain/actionTypes";
import {
  createEmptyPlanSummary,
  getModulePath,
} from "@/features/terraform-plan/domain/normalizedPlanTypes";
import {
  getProviderShortName,
  getResourceTypeGroup,
} from "@/features/terraform-plan/domain/providerTypes";
import {
  malformedPlanLikeObject,
  riskyPlan,
  tinyPlan,
} from "@/features/terraform-plan/fixtures/samplePlans";

describe("normalizeAction", () => {
  it.each<[string[], ChangeActionKind]>([
    [["create"], "create"],
    [["update"], "update"],
    [["delete"], "delete"],
    [["delete", "create"], "replace"],
    [["create", "delete"], "replace"],
    [["no-op"], "no-op"],
    [["read"], "read"],
    [["import"], "import"],
    [["forget"], "forget"],
    [["create", "read"], "unknown"],
    [[], "unknown"],
  ])("normalizes %j to %s", (actions, expected) => {
    expect(normalizeAction(actions)).toBe(expected);
  });
});

describe("provider and resource helpers", () => {
  it("extracts provider short names from Terraform provider references", () => {
    expect(
      getProviderShortName('provider["registry.terraform.io/hashicorp/aws"]'),
    ).toBe("aws");
    expect(getProviderShortName("registry.terraform.io/hashicorp/google")).toBe(
      "google",
    );
    expect(getProviderShortName("azurerm.platform")).toBe("azurerm");
    expect(getProviderShortName()).toBe("unknown");
  });

  it("groups common resource types into practical categories", () => {
    expect(getResourceTypeGroup("aws_iam_role")).toBe("iam");
    expect(getResourceTypeGroup("aws_security_group")).toBe("network");
    expect(getResourceTypeGroup("aws_db_instance")).toBe("database");
    expect(getResourceTypeGroup("google_project_iam_member")).toBe("iam");
    expect(getResourceTypeGroup("aws_s3_bucket_policy")).toBe("storage");
    expect(getResourceTypeGroup("aws_kms_key")).toBe("kms");
    expect(getResourceTypeGroup("aws_cloudwatch_log_group")).toBe("unknown");
  });
});

describe("module helpers", () => {
  it("extracts nested module paths from Terraform addresses", () => {
    expect(
      getModulePath("module.network.module.firewall.aws_security_group.main[0]"),
    ).toEqual(["network", "firewall"]);
    expect(getModulePath("aws_s3_bucket.assets")).toEqual([]);
  });

  it("creates an empty plan summary with zeroed counters", () => {
    expect(createEmptyPlanSummary()).toEqual({
      totalResourceChanges: 0,
      totalOutputChanges: 0,
      createCount: 0,
      updateCount: 0,
      deleteCount: 0,
      replaceCount: 0,
      noOpCount: 0,
      readCount: 0,
      importCount: 0,
      forgetCount: 0,
      unknownCount: 0,
      highRiskCount: 0,
    });
  });
});

describe("sample plan fixtures", () => {
  it("keeps tinyPlan aligned with the expected create, update, and no-op mix", () => {
    const normalizedActions =
      tinyPlan.resource_changes?.map((change) =>
        normalizeAction(change.change.actions),
      ) ?? [];

    expect(tinyPlan.format_version).toBe("1.3");
    expect(normalizedActions).toEqual(["create", "update", "no-op"]);
  });

  it("includes risky resource groups and an output change in riskyPlan", () => {
    const resourceGroups =
      riskyPlan.resource_changes?.map((change) =>
        getResourceTypeGroup(change.type),
      ) ?? [];

    expect(resourceGroups).toEqual(
      expect.arrayContaining(["iam", "network", "database", "storage"]),
    );
    expect(
      normalizeAction(
        riskyPlan.resource_changes?.find(
          (change) => change.type === "aws_db_instance",
        )?.change.actions ?? [],
      ),
    ).toBe("replace");
    expect(riskyPlan.output_changes?.database_endpoint?.actions).toEqual([
      "update",
    ]);
  });

  it("keeps malformedPlanLikeObject clearly outside the valid plan shape", () => {
    expect(typeof malformedPlanLikeObject.format_version).not.toBe("string");
    expect(Array.isArray(malformedPlanLikeObject.resource_changes)).toBe(false);
  });
});
