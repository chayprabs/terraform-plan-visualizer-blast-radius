import { describe, expect, it } from "vitest";
import type { TerraformPlan } from "@/features/terraform-plan/domain/terraformPlanTypes";
import { extractDependencyGraph } from "@/features/terraform-plan/graph/extractDependencyGraph";

function getEdgeIds(plan: ReturnType<typeof extractDependencyGraph>): string[] {
  return plan.edges.map((edge) => edge.id);
}

describe("extractDependencyGraph", () => {
  it("extracts nodes and explicit depends_on edges from planned values without configuration", () => {
    const plan: TerraformPlan = {
      format_version: "1.3",
      planned_values: {
        root_module: {
          resources: [
            {
              address: "aws_vpc.main",
              mode: "managed",
              type: "aws_vpc",
              name: "main",
              provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
            },
          ],
          child_modules: [
            {
              address: "module.network",
              resources: [
                {
                  address: "module.network.aws_subnet.app",
                  mode: "managed",
                  type: "aws_subnet",
                  name: "app",
                  provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
                  depends_on: ["aws_vpc.main"],
                },
              ],
            },
          ],
        },
      },
      resource_changes: [
        {
          address: "module.network.aws_subnet.app",
          module_address: "module.network",
          mode: "managed",
          type: "aws_subnet",
          name: "app",
          provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
          change: {
            actions: ["create"],
            before: null,
            after: {
              cidr_block: "10.0.1.0/24",
            },
          },
        },
        {
          address: "aws_instance.orphan",
          mode: "managed",
          type: "aws_instance",
          name: "orphan",
          provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
          change: {
            actions: ["update"],
            before: {
              instance_type: "t3.micro",
            },
            after: {
              instance_type: "t3.small",
            },
          },
        },
      ],
    };

    const graph = extractDependencyGraph(plan);
    const nodeIds = graph.nodes.map((node) => node.id);

    expect(nodeIds).toEqual(
      expect.arrayContaining([
        "root",
        "module.network",
        "aws_vpc.main",
        "module.network.aws_subnet.app",
        "aws_instance.orphan",
      ]),
    );
    expect(
      graph.nodes.find((node) => node.id === "aws_instance.orphan")
        ?.existsInPlanChange,
    ).toBe(true);
    expect(getEdgeIds(graph)).toEqual(
      expect.arrayContaining([
        "depends_on:aws_vpc.main->module.network.aws_subnet.app",
        "module_contains:root->module.network",
        "module_contains:module.network->module.network.aws_subnet.app",
      ]),
    );
  });

  it("extracts expression references and explicit configuration dependencies across child modules", () => {
    const plan: TerraformPlan = {
      format_version: "1.3",
      configuration: {
        provider_config: {
          aws: {
            name: "aws",
            full_name: "registry.terraform.io/hashicorp/aws",
          },
        },
        root_module: {
          child_modules: [
            {
              address: "module.network",
              resources: [
                {
                  address: "module.network.aws_subnet.private",
                  mode: "managed",
                  type: "aws_subnet",
                  name: "private",
                  provider_config_key: "aws",
                },
              ],
            },
            {
              address: "module.compute",
              resources: [
                {
                  address: "module.compute.aws_security_group.app",
                  mode: "managed",
                  type: "aws_security_group",
                  name: "app",
                  provider_config_key: "aws",
                },
                {
                  address: "module.compute.aws_instance.app",
                  mode: "managed",
                  type: "aws_instance",
                  name: "app",
                  provider_config_key: "aws",
                  depends_on: ["module.compute.aws_security_group.app"],
                  expressions: {
                    subnet_id: {
                      references: ["module.network.aws_subnet.private.id"],
                    },
                    subnet_ids: [
                      {
                        references: ['module.network["blue"].subnet_ids'],
                      },
                    ],
                    vpc_security_group_ids: {
                      references: [
                        "module.compute.aws_security_group.app.id",
                        "var.extra_security_group_id",
                      ],
                    },
                  },
                },
              ],
            },
          ],
        },
      },
      resource_changes: [
        {
          address: "module.compute.aws_instance.app",
          module_address: "module.compute",
          mode: "managed",
          type: "aws_instance",
          name: "app",
          provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
          change: {
            actions: ["update"],
            before: {
              subnet_id: "subnet-old",
            },
            after: {
              subnet_id: "subnet-new",
            },
          },
        },
      ],
    };

    const graph = extractDependencyGraph(plan);
    const edgeIds = getEdgeIds(graph);

    expect(edgeIds).toEqual(
      expect.arrayContaining([
        "depends_on:module.compute.aws_security_group.app->module.compute.aws_instance.app",
        "expression_reference:module.network.aws_subnet.private->module.compute.aws_instance.app",
        "expression_reference:module.network[\"blue\"]->module.compute.aws_instance.app",
      ]),
    );
    expect(
      graph.nodes.find((node) => node.id === "module.compute.aws_instance.app")
        ?.provider,
    ).toBe("aws");
  });
});
