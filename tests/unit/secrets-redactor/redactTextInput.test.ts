import { describe, expect, it } from "vitest";
import { redactArbitraryText } from "@/features/secrets-redactor/domain/redactTextInput";
import { DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS } from "@/features/terraform-plan/privacy/redactionTypes";
import { SECRET_TEST_VALUES } from "../terraform-plan/secretTestValues";

describe("redactArbitraryText", () => {
  it("returns empty output for empty input", () => {
    const result = redactArbitraryText("", DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS);

    expect(result.redactedText).toBe("");
    expect(result.replacementCount).toBe(0);
  });

  it("leaves benign text unchanged when secret detection is off", () => {
    const result = redactArbitraryText("hello world", {
      ...DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
      detectSecretLikeStrings: false,
      maskCloudAccountIdsInExports: false,
      maskIpAddressesInExports: false,
      maskDomainNamesInExports: false,
    });

    expect(result.redactedText).toBe("hello world");
    expect(result.replacementCount).toBe(0);
  });

  it("redacts AWS access keys and reports replacements", () => {
    const input = `export AWS_ACCESS_KEY_ID=${SECRET_TEST_VALUES.awsAccessKey}`;

    const result = redactArbitraryText(
      input,
      DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
    );

    expect(result.redactedText).not.toContain(SECRET_TEST_VALUES.awsAccessKey);
    expect(result.redactedText).toContain("[redacted]");
    expect(result.replacementCount).toBeGreaterThanOrEqual(1);
  });
});
