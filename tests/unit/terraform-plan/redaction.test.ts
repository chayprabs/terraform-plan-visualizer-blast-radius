import { describe, expect, it } from "vitest";
import type { TerraformPlan } from "@/features/terraform-plan/domain/terraformPlanTypes";
import {
  redactTerraformPlan,
  redactTerraformValue,
  redactText,
} from "@/features/terraform-plan/privacy/redactTerraformPlan";
import { DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS } from "@/features/terraform-plan/privacy/redactionTypes";
import { SECRET_TEST_VALUES } from "./secretTestValues";

function createPlanWithSecrets(): TerraformPlan {
  return {
    format_version: "1.3",
    resource_changes: [
      {
        address: "module.project.aws_instance.project-prod",
        module_address: "module.project",
        mode: "managed",
        name: "project-prod",
        provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
        type: "aws_instance",
        change: {
          actions: ["update"],
          before: {
            account_id: "123456789012",
            config: SECRET_TEST_VALUES.awsAccessKey,
            domain_name: "app.example.internal",
            name: "project-prod",
            password: "old-password",
            private_ip: "10.0.0.7",
          },
          before_sensitive: {
            password: true,
          },
          after: {
            account_id: "123456789012",
            bearer: SECRET_TEST_VALUES.bearerToken,
            domain_name: "app.example.internal",
            github_token: SECRET_TEST_VALUES.githubToken,
            name: "project-prod",
            password: "new-password",
            private_ip: "10.0.0.7",
            private_key: SECRET_TEST_VALUES.privateKey,
            slack_token: SECRET_TEST_VALUES.slackToken,
            stripe_key: SECRET_TEST_VALUES.stripeKey,
          },
          after_sensitive: {
            password: true,
          },
        },
      },
    ],
  };
}

describe("redactTerraformPlan", () => {
  it("removes terraform-sensitive values and secret-like strings from exported plan data", () => {
    const redacted = redactTerraformPlan(createPlanWithSecrets(), {
      scope: "export",
      settings: {
        ...DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
        anonymizeResourceNamesInExports: true,
        maskDomainNamesInExports: true,
        maskIpAddressesInExports: true,
      },
    });
    const serialized = JSON.stringify(redacted);

    expect(serialized).toContain("[sensitive value]");
    expect(serialized).not.toContain("old-password");
    expect(serialized).not.toContain("new-password");
    expect(serialized).not.toContain(SECRET_TEST_VALUES.awsAccessKey);
    expect(serialized).not.toContain(SECRET_TEST_VALUES.githubToken);
    expect(serialized).not.toContain(SECRET_TEST_VALUES.slackToken);
    expect(serialized).not.toContain(SECRET_TEST_VALUES.stripeKey);
    expect(serialized).not.toContain("-----BEGIN PRIVATE KEY-----");
    expect(serialized).not.toContain(SECRET_TEST_VALUES.bearerToken);
    expect(serialized).not.toContain("123456789012");
    expect(serialized).not.toContain("10.0.0.7");
    expect(serialized).not.toContain("app.example.internal");
    expect(serialized).not.toContain("project-prod");

    expect(serialized).toMatch(/module\.module_\d{3}\.aws_instance\.resource_\d{3}/);
    expect(serialized).toContain("resource_");
    expect(serialized).toContain("account_001");
    expect(serialized).toContain("ip_001");
    expect(serialized).toContain("domain_001");
    expect(serialized).toContain("[redacted]");
  });

  it("uses stable placeholders for repeated resource names and honors disabled account masking", () => {
    const redacted = redactTerraformValue(
      {
        account_id: "123456789012",
        address: "module.project.aws_instance.project-prod",
        module_address: "module.project",
        name: "project-prod",
        resource_name: "project-prod",
      },
      {
        scope: "export",
        settings: {
          ...DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
          anonymizeResourceNamesInExports: true,
          maskCloudAccountIdsInExports: false,
        },
      },
    ) as {
      account_id: string;
      address: string;
      module_address: string;
      name: string;
      resource_name: string;
    };

    expect(redacted.name).toBe("resource_001");
    expect(redacted.resource_name).toBe("resource_001");
    expect(redacted.module_address).toBe("module.module_001");
    expect(redacted.address).toBe("module.module_001.aws_instance.resource_001");
    expect(redacted.account_id).toBe("123456789012");
  });

  it("keeps export-only masks out of display redaction while still masking secrets", () => {
    const displayValue = redactText(
      `${SECRET_TEST_VALUES.bearerToken} 10.0.0.7 app.example.internal 123456789012`,
      {
        scope: "display",
        settings: {
          ...DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
          maskDomainNamesInExports: true,
          maskIpAddressesInExports: true,
        },
      },
    );

    expect(displayValue).toContain("[redacted]");
    expect(displayValue).toContain("10.0.0.7");
    expect(displayValue).toContain("app.example.internal");
    expect(displayValue).toContain("123456789012");
  });
});
