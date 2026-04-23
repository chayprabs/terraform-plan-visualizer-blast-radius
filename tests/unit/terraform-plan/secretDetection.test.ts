import { describe, expect, it } from "vitest";
import {
  containsSecretLikeString,
  detectSecretLikeString,
  isSensitiveKeyName,
} from "@/features/terraform-plan/privacy/secretDetection";
import { SECRET_TEST_VALUES } from "./secretTestValues";

describe("secretDetection", () => {
  it("detects common secret-like strings", () => {
    expect(detectSecretLikeString(SECRET_TEST_VALUES.awsAccessKey)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "aws_access_key" }),
      ]),
    );
    expect(detectSecretLikeString(SECRET_TEST_VALUES.githubToken)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "github_token" }),
      ]),
    );
    expect(detectSecretLikeString(SECRET_TEST_VALUES.slackToken)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "slack_token" }),
      ]),
    );
    expect(detectSecretLikeString(SECRET_TEST_VALUES.stripeKey)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "stripe_key" }),
      ]),
    );
    expect(detectSecretLikeString(SECRET_TEST_VALUES.privateKey)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "private_key" }),
      ]),
    );
    expect(detectSecretLikeString(SECRET_TEST_VALUES.bearerToken)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "bearer_token" }),
      ]),
    );
  });

  it("detects sensitive key names even when the value does not match a token pattern", () => {
    expect(isSensitiveKeyName("client_secret")).toBe(true);
    expect(
      containsSecretLikeString("plain-text-value", ["spec", "client_secret"]),
    ).toBe(true);
    expect(
      detectSecretLikeString("plain-text-value", ["spec", "client_secret"]),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "sensitive_key" }),
      ]),
    );
  });
});
