import { describe, expect, it } from "vitest";
import {
  DEFAULT_TERRAFORM_PLAN_URL_STATE,
  buildTerraformPlanUrlSearch,
  parseTerraformPlanUrlState,
} from "@/features/terraform-plan/state/urlState";

describe("parseTerraformPlanUrlState", () => {
  it("returns defaults for an empty query string", () => {
    const parsed = parseTerraformPlanUrlState("");

    expect(parsed.hasRedactionSettings).toBe(false);
    expect(parsed.state.inputTab).toBe(DEFAULT_TERRAFORM_PLAN_URL_STATE.inputTab);
    expect(parsed.state.findings.severity).toBe("all");
    expect(parsed.state.resources.includeNoOp).toBe(true);
  });

  it("parses valid enum and boolean query params", () => {
    const parsed = parseTerraformPlanUrlState(
      "?it=upload&fv=critical&fh=1&rno=0&panon=1&br=aws_instance.api",
    );

    expect(parsed.state.inputTab).toBe("upload");
    expect(parsed.state.findings.severity).toBe("critical");
    expect(parsed.state.findings.highRiskOnly).toBe(true);
    expect(parsed.state.resources.includeNoOp).toBe(false);
    expect(parsed.state.blastRadiusFocusAddress).toBe("aws_instance.api");
    expect(parsed.state.redactionSettings.anonymizeResourceNamesInExports).toBe(
      true,
    );
    expect(parsed.hasRedactionSettings).toBe(true);
  });

  it("ignores invalid enum values and non-1/0 booleans", () => {
    const parsed = parseTerraformPlanUrlState(
      "?it=invalid&fv=urgent&fh=true&rno=2&fa=not-an-action",
    );

    expect(parsed.state.inputTab).toBe(DEFAULT_TERRAFORM_PLAN_URL_STATE.inputTab);
    expect(parsed.state.findings.severity).toBe("all");
    expect(parsed.state.findings.highRiskOnly).toBe(false);
    expect(parsed.state.resources.includeNoOp).toBe(true);
    expect(parsed.state.findings.actionKind).toBe("all");
  });

  it("round-trips non-default state through buildTerraformPlanUrlSearch", () => {
    const state = {
      ...DEFAULT_TERRAFORM_PLAN_URL_STATE,
      inputTab: "upload" as const,
      selectedResourceAddress: "aws_s3_bucket.logs",
      findings: {
        ...DEFAULT_TERRAFORM_PLAN_URL_STATE.findings,
        severity: "high" as const,
        highRiskOnly: true,
      },
    };

    const search = buildTerraformPlanUrlSearch(state);
    const parsed = parseTerraformPlanUrlState(search);

    expect(parsed.state.inputTab).toBe("upload");
    expect(parsed.state.selectedResourceAddress).toBe("aws_s3_bucket.logs");
    expect(parsed.state.findings.severity).toBe("high");
    expect(parsed.state.findings.highRiskOnly).toBe(true);
  });
});
