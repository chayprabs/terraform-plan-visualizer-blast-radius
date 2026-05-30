import type { TerraformPlan } from "@/features/terraform-plan/domain/terraformPlanTypes";

export const tinyPlan: TerraformPlan = {
  format_version: "1.3",
  terraform_version: "1.8.5",
  timestamp: "2026-04-22T15:00:00Z",
  planned_values: {
    root_module: {
      resources: [
        {
          address: "aws_s3_bucket.assets",
          mode: "managed",
          type: "aws_s3_bucket",
          name: "assets",
          provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
          values: {
            bucket: "example-assets-prod",
          },
        },
      ],
    },
  },
  resource_changes: [
    {
      address: "aws_s3_bucket.assets",
      mode: "managed",
      type: "aws_s3_bucket",
      name: "assets",
      provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
      change: {
        actions: ["create"],
        before: null,
        after: {
          bucket: "example-assets-prod",
        },
        after_unknown: {
          arn: true,
          region: true,
        },
      },
    },
    {
      address: "module.network.aws_security_group.app",
      module_address: "module.network",
      mode: "managed",
      type: "aws_security_group",
      name: "app",
      provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
      change: {
        actions: ["update"],
        before: {
          ingress: [],
        },
        after: {
          ingress: [
            {
              from_port: 443,
              to_port: 443,
            },
          ],
        },
        replace_paths: [],
      },
    },
    {
      address: "aws_cloudwatch_log_group.app",
      mode: "managed",
      type: "aws_cloudwatch_log_group",
      name: "app",
      provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
      change: {
        actions: ["no-op"],
        before: {
          retention_in_days: 30,
        },
        after: {
          retention_in_days: 30,
        },
      },
    },
  ],
  output_changes: {},
};

export const riskyPlan: TerraformPlan = {
  format_version: "1.3",
  terraform_version: "1.8.5",
  timestamp: "2026-04-22T15:05:00Z",
  prior_state: {
    format_version: "1.3",
    terraform_version: "1.8.5",
  },
  planned_values: {
    root_module: {
      child_modules: [
        {
          address: "module.identity",
          resources: [
            {
              address: "module.identity.aws_iam_role.app",
              mode: "managed",
              type: "aws_iam_role",
              name: "app",
              provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
            },
          ],
        },
      ],
    },
  },
  proposed_unknown: {
    root_module: {
      resources: true,
    },
  },
  resource_changes: [
    {
      address: "module.identity.aws_iam_role.app",
      module_address: "module.identity",
      mode: "managed",
      type: "aws_iam_role",
      name: "app",
      provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
      change: {
        actions: ["update"],
        before: {
          assume_role_policy: "old-policy",
        },
        after: {
          assume_role_policy: "new-policy",
        },
        after_sensitive: {
          assume_role_policy: false,
        },
      },
    },
    {
      address: "module.network.aws_security_group.web",
      module_address: "module.network",
      mode: "managed",
      type: "aws_security_group",
      name: "web",
      provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
      change: {
        actions: ["update"],
        before: {
          ingress: [
            {
              cidr_blocks: ["10.0.0.0/24"],
              from_port: 443,
              to_port: 443,
            },
          ],
        },
        after: {
          ingress: [
            {
              cidr_blocks: ["0.0.0.0/0"],
              from_port: 443,
              to_port: 443,
            },
          ],
        },
        replace_paths: [["ingress", 0, "cidr_blocks"]],
      },
    },
    {
      address: "module.data.aws_db_instance.primary",
      module_address: "module.data",
      mode: "managed",
      type: "aws_db_instance",
      name: "primary",
      provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
      deposed: "current",
      change: {
        actions: ["delete", "create"],
        before: {
          instance_class: "db.t3.medium",
          storage_encrypted: false,
        },
        after: {
          instance_class: "db.r6g.large",
          storage_encrypted: true,
        },
        after_unknown: {
          endpoint: true,
        },
        replace_paths: [["instance_class"]],
      },
    },
    {
      address: "aws_s3_bucket_policy.logs",
      mode: "managed",
      type: "aws_s3_bucket_policy",
      name: "logs",
      provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
      change: {
        actions: ["update"],
        before: {
          policy: "old-bucket-policy",
        },
        after: {
          policy: "new-bucket-policy",
        },
        before_sensitive: {
          policy: true,
        },
        after_sensitive: {
          policy: true,
        },
      },
    },
  ],
  output_changes: {
    database_endpoint: {
      actions: ["update"],
      before: "db-old.internal",
      after: "db-new.internal",
      after_unknown: false,
    },
  },
  configuration: {
    provider_config: {
      aws: {
        name: "aws",
        full_name: "registry.terraform.io/hashicorp/aws",
      },
    },
  },
  relevant_attributes: [
    {
      resource: "module.network.aws_security_group.web",
      attribute: ["ingress", 0, "cidr_blocks"],
    },
  ],
  checks: [
    {
      address: "check.security_group_ingress",
      status: "unknown",
    },
  ],
};

export const malformedPlanLikeObject: Record<string, unknown> = {
  format_version: 1,
  terraform_version: false,
  planned_values: "not-an-object",
  resource_changes: {
    unexpected: "object-instead-of-array",
  },
  output_changes: ["should", "be", "a", "record"],
};
