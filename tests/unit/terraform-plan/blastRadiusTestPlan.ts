import type { TerraformPlan } from "@/features/terraform-plan/domain/terraformPlanTypes";

interface BlastRadiusPlanOptions {
  includeConfiguration?: boolean;
  includeUnrelatedChanged?: boolean;
}

export function createBlastRadiusPlan(
  options: BlastRadiusPlanOptions = {},
): TerraformPlan {
  const {
    includeConfiguration = true,
    includeUnrelatedChanged = true,
  } = options;

  return {
    format_version: "1.3",
    terraform_version: "1.8.5",
    timestamp: "2026-04-23T06:00:00Z",
    planned_values: {
      root_module: {
        child_modules: [
          {
            address: "module.data",
            resources: [
              {
                address: "module.data.aws_db_instance.primary",
                mode: "managed",
                type: "aws_db_instance",
                name: "primary",
                provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
              },
            ],
          },
          {
            address: "module.app",
            resources: [
              {
                address: "module.app.aws_instance.api",
                mode: "managed",
                type: "aws_instance",
                name: "api",
                provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
                depends_on: ["module.data.aws_db_instance.primary"],
              },
            ],
          },
          {
            address: "module.edge",
            resources: [
              {
                address: "module.edge.aws_lb_listener.public",
                mode: "managed",
                type: "aws_lb_listener",
                name: "public",
                provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
                depends_on: ["module.app.aws_instance.api"],
              },
            ],
          },
          ...(includeUnrelatedChanged
            ? [
                {
                  address: "module.identity",
                  resources: [
                    {
                      address: "module.identity.aws_iam_role.worker",
                      mode: "managed",
                      type: "aws_iam_role",
                      name: "worker",
                      provider_name:
                        'provider["registry.terraform.io/hashicorp/aws"]',
                    },
                  ],
                },
              ]
            : []),
        ],
      },
    },
    resource_changes: [
      {
        address: "module.data.aws_db_instance.primary",
        module_address: "module.data",
        mode: "managed",
        type: "aws_db_instance",
        name: "primary",
        provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
        change: {
          actions: ["delete", "create"],
          before: {
            instance_class: "db.t3.medium",
          },
          after: {
            instance_class: "db.r6g.large",
          },
          replace_paths: [["instance_class"]],
        },
      },
      {
        address: "module.app.aws_instance.api",
        module_address: "module.app",
        mode: "managed",
        type: "aws_instance",
        name: "api",
        provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
        change: {
          actions: ["update"],
          before: {
            instance_type: "t3.small",
          },
          after: {
            instance_type: "t3.medium",
          },
        },
      },
      ...(includeUnrelatedChanged
        ? [
            {
              address: "module.identity.aws_iam_role.worker",
              module_address: "module.identity",
              mode: "managed" as const,
              type: "aws_iam_role",
              name: "worker",
              provider_name:
                'provider["registry.terraform.io/hashicorp/aws"]',
              change: {
                actions: ["update"],
                before: {
                  assume_role_policy: "old-policy",
                },
                after: {
                  assume_role_policy: "new-policy",
                },
              },
            },
          ]
        : []),
    ],
    configuration: includeConfiguration
      ? {
          provider_config: {
            aws: {
              name: "aws",
              full_name: "registry.terraform.io/hashicorp/aws",
            },
          },
          root_module: {
            child_modules: [
              {
                address: "module.data",
                resources: [
                  {
                    address: "module.data.aws_db_instance.primary",
                    mode: "managed",
                    type: "aws_db_instance",
                    name: "primary",
                    provider_config_key: "aws",
                  },
                ],
              },
              {
                address: "module.app",
                resources: [
                  {
                    address: "module.app.aws_instance.api",
                    mode: "managed",
                    type: "aws_instance",
                    name: "api",
                    provider_config_key: "aws",
                    depends_on: ["module.data.aws_db_instance.primary"],
                  },
                ],
              },
              {
                address: "module.edge",
                resources: [
                  {
                    address: "module.edge.aws_lb_listener.public",
                    mode: "managed",
                    type: "aws_lb_listener",
                    name: "public",
                    provider_config_key: "aws",
                    expressions: {
                      default_action: [
                        {
                          target_group_arn: {
                            references: ["module.app.aws_instance.api"],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
              ...(includeUnrelatedChanged
                ? [
                    {
                      address: "module.identity",
                      resources: [
                        {
                          address: "module.identity.aws_iam_role.worker",
                          mode: "managed",
                          type: "aws_iam_role",
                          name: "worker",
                          provider_config_key: "aws",
                        },
                      ],
                    },
                  ]
                : []),
            ],
          },
        }
      : undefined,
  };
}
