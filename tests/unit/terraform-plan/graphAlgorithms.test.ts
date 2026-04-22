import { describe, expect, it } from "vitest";
import {
  detectOrphanChangedResources,
  getBlastRadiusForResource,
  getConnectedComponent,
  getDownstreamDependents,
  getUpstreamDependencies,
  groupNodesByModule,
  groupNodesByProvider,
} from "@/features/terraform-plan/graph/graphAlgorithms";
import type { DependencyGraph, GraphNode } from "@/features/terraform-plan/graph/graphTypes";

function createResourceNode(
  id: string,
  overrides: Partial<GraphNode> = {},
): GraphNode {
  return {
    id,
    label: id,
    resourceType: "aws_resource",
    provider: "aws",
    module: "root",
    actionKind: "no-op",
    riskLevel: "none",
    resourceGroup: "unknown",
    existsInPlanChange: false,
    metadata: {
      kind: "resource",
      address: id,
      sourceHints: ["test"],
    },
    ...overrides,
  };
}

describe("graphAlgorithms", () => {
  it("walks upstream and downstream dependencies in dependency order", () => {
    const graph: DependencyGraph = {
      nodes: [
        createResourceNode("aws_vpc.main"),
        createResourceNode("aws_subnet.app", {
          existsInPlanChange: true,
        }),
        createResourceNode("aws_instance.web", {
          existsInPlanChange: true,
        }),
        createResourceNode("aws_instance.orphan", {
          existsInPlanChange: true,
        }),
        createResourceNode("module.network", {
          label: "network",
          resourceType: "module",
          provider: "terraform",
          module: "root",
          metadata: {
            kind: "module",
            address: "module.network",
            sourceHints: ["test"],
          },
        }),
      ],
      edges: [
        {
          id: "depends_on:aws_vpc.main->aws_subnet.app",
          source: "aws_vpc.main",
          target: "aws_subnet.app",
          relationshipType: "depends_on",
          evidence: ["test"],
          confidence: 1,
        },
        {
          id: "expression_reference:aws_subnet.app->aws_instance.web",
          source: "aws_subnet.app",
          target: "aws_instance.web",
          relationshipType: "expression_reference",
          evidence: ["test"],
          confidence: 0.8,
        },
        {
          id: "module_contains:module.network->aws_subnet.app",
          source: "module.network",
          target: "aws_subnet.app",
          relationshipType: "module_contains",
          evidence: ["test"],
          confidence: 1,
        },
      ],
    };

    expect(
      getUpstreamDependencies(graph, "aws_instance.web").map((node) => node.id),
    ).toEqual(["aws_subnet.app", "aws_vpc.main"]);
    expect(
      getDownstreamDependents(graph, "aws_vpc.main").map((node) => node.id),
    ).toEqual(["aws_instance.web", "aws_subnet.app"]);
    expect(
      getBlastRadiusForResource(graph, "aws_vpc.main").map((node) => node.id),
    ).toEqual(["aws_instance.web", "aws_subnet.app"]);
    expect(
      getConnectedComponent(graph, "aws_instance.web").map((node) => node.id),
    ).toEqual(["aws_instance.web", "aws_subnet.app", "aws_vpc.main"]);
  });

  it("groups nodes and detects orphan changed resources without counting module containment", () => {
    const graph: DependencyGraph = {
      nodes: [
        createResourceNode("root", {
          label: "root",
          resourceType: "module",
          provider: "terraform",
          metadata: {
            kind: "module",
            address: "root",
            sourceHints: ["test"],
          },
        }),
        createResourceNode("module.network", {
          label: "network",
          resourceType: "module",
          provider: "terraform",
          module: "root",
          metadata: {
            kind: "module",
            address: "module.network",
            sourceHints: ["test"],
          },
        }),
        createResourceNode("aws_vpc.main"),
        createResourceNode("module.network.aws_subnet.app", {
          module: "module.network",
          existsInPlanChange: true,
        }),
        createResourceNode("aws_instance.orphan", {
          existsInPlanChange: true,
        }),
      ],
      edges: [
        {
          id: "depends_on:aws_vpc.main->module.network.aws_subnet.app",
          source: "aws_vpc.main",
          target: "module.network.aws_subnet.app",
          relationshipType: "depends_on",
          evidence: ["test"],
          confidence: 1,
        },
        {
          id: "module_contains:root->module.network",
          source: "root",
          target: "module.network",
          relationshipType: "module_contains",
          evidence: ["test"],
          confidence: 1,
        },
        {
          id: "module_contains:module.network->module.network.aws_subnet.app",
          source: "module.network",
          target: "module.network.aws_subnet.app",
          relationshipType: "module_contains",
          evidence: ["test"],
          confidence: 1,
        },
      ],
    };

    const moduleGroups = groupNodesByModule(graph);
    const providerGroups = groupNodesByProvider(graph);

    expect(moduleGroups.root?.map((node) => node.id)).toEqual([
      "aws_instance.orphan",
      "aws_vpc.main",
      "root",
    ]);
    expect(moduleGroups["module.network"]?.map((node) => node.id)).toEqual([
      "module.network",
      "module.network.aws_subnet.app",
    ]);
    expect(providerGroups.aws?.map((node) => node.id)).toEqual([
      "aws_instance.orphan",
      "aws_vpc.main",
      "module.network.aws_subnet.app",
    ]);
    expect(
      detectOrphanChangedResources(graph).map((node) => node.id),
    ).toEqual(["aws_instance.orphan"]);
  });
});
