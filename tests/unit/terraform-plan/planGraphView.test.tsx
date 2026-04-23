import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PlanGraphView } from "@/features/terraform-plan/components/graph/PlanGraphView";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import type { TerraformPlan } from "@/features/terraform-plan/domain/terraformPlanTypes";
import { riskyPlan } from "@/features/terraform-plan/fixtures/samplePlans";
import { createBlastRadiusPlan } from "./blastRadiusTestPlan";

vi.mock("@xyflow/react", async () => {
  const React = await import("react");

  function ReactFlowMock({
    children,
    edges,
    nodeTypes,
    nodes,
    onInit,
    onNodeClick,
    onNodeMouseEnter,
    onNodeMouseLeave,
  }: {
    children?: ReactNode;
    edges: Array<{ id: string }>;
    nodeTypes?: Record<string, ComponentType<Record<string, unknown>>>;
    nodes: Array<{
      data: unknown;
      id: string;
      position: {
        x: number;
        y: number;
      };
      selected?: boolean;
      type?: string;
    }>;
    onInit?: (instance: { fitView: () => void; setViewport: () => void }) => void;
    onNodeClick?: (event: unknown, node: unknown) => void;
    onNodeMouseEnter?: (event: unknown, node: unknown) => void;
    onNodeMouseLeave?: (event: unknown, node: unknown) => void;
  }) {
    React.useEffect(() => {
      onInit?.({
        fitView: () => undefined,
        setViewport: () => undefined,
      });
    }, [onInit]);

    return (
      <div data-testid="react-flow">
        <div data-testid="react-flow-edge-count">{edges.length}</div>
        {nodes.map((node) => {
          const NodeComponent =
            node.type && nodeTypes
              ? (nodeTypes[node.type] as ComponentType<Record<string, unknown>>)
              : undefined;

          return (
            <button
              key={node.id}
              type="button"
              data-testid={`graph-node-${node.id}`}
              onClick={(event) => onNodeClick?.(event, node)}
              onMouseEnter={(event) => onNodeMouseEnter?.(event, node)}
              onMouseLeave={(event) => onNodeMouseLeave?.(event, node)}
            >
              {NodeComponent ? (
                <NodeComponent
                  data={node.data}
                  dragging={false}
                  id={node.id}
                  isConnectable={false}
                  selected={Boolean(node.selected)}
                  sourcePosition="right"
                  targetPosition="left"
                  type={node.type}
                  xPos={node.position.x}
                  yPos={node.position.y}
                  zIndex={0}
                />
              ) : (
                node.id
              )}
            </button>
          );
        })}
        {children}
      </div>
    );
  }

  return {
    Background: () => null,
    Handle: () => null,
    MarkerType: {
      ArrowClosed: "arrowclosed",
    },
    Position: {
      Left: "left",
      Right: "right",
    },
    ReactFlow: ReactFlowMock,
  };
});

function createLargePlan(totalResources: number, changedResources: number): TerraformPlan {
  return {
    format_version: "1.3",
    planned_values: {
      root_module: {
        resources: Array.from({ length: totalResources }, (_, index) => ({
          address: `aws_instance.node_${index}`,
          mode: "managed",
          type: "aws_instance",
          name: `node_${index}`,
          provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
        })),
      },
    },
    resource_changes: Array.from({ length: changedResources }, (_, index) => ({
      address: `aws_instance.node_${index}`,
      mode: "managed" as const,
      type: "aws_instance",
      name: `node_${index}`,
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
    })),
  };
}

describe("PlanGraphView", () => {
  it("renders riskyPlan as a graph and supports search and filtering", () => {
    render(
      <PlanGraphView
        hasAnalyzed
        normalizedPlan={normalizeTerraformPlan(riskyPlan)}
      />,
    );

    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
    expect(
      screen.getByText(/module\.data\.aws_db_instance\.primary/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/module\.identity\.aws_iam_role\.app/i),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Action$/i), {
      target: { value: "replace" },
    });

    expect(
      screen.getByText(/module\.data\.aws_db_instance\.primary/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/module\.identity\.aws_iam_role\.app/i),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Search graph nodes/i), {
      target: { value: "db_instance" },
    });

    expect(
      screen.getByText(/module\.data\.aws_db_instance\.primary/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Showing 1 of 4 resources/i)).toBeInTheDocument();
  });

  it("enables large-graph guardrails and blocks unfiltered rendering for very large graphs", () => {
    render(
      <PlanGraphView
        hasAnalyzed
        normalizedPlan={normalizeTerraformPlan(createLargePlan(1601, 2))}
      />,
    );

    expect(screen.getByText(/Large graph guardrails are active/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Show only changed resources/i),
    ).toBeChecked();
    expect(screen.getByText(/Showing 2 of 1601 resources/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Show only changed resources/i));

    expect(
      screen.getByText(/Filter the graph before rendering the full topology/i),
    ).toBeInTheDocument();
  });

  it("shows an empty state when dependency data is unavailable", () => {
    render(
      <PlanGraphView
        hasAnalyzed
        normalizedPlan={normalizeTerraformPlan({
          format_version: "1.3",
          resource_changes: [],
        })}
      />,
    );

    expect(
      screen.getByText(/Dependency data is unavailable for this plan/i),
    ).toBeInTheDocument();
  });

  it("highlights the selected blast radius in the graph", () => {
    render(
      <PlanGraphView
        blastRadiusDownstreamIds={["module.edge.aws_lb_listener.public"]}
        blastRadiusFocusAddress="module.app.aws_instance.api"
        blastRadiusNodeIds={[
          "module.data.aws_db_instance.primary",
          "module.app.aws_instance.api",
          "module.edge.aws_lb_listener.public",
        ]}
        blastRadiusUpstreamIds={["module.data.aws_db_instance.primary"]}
        hasAnalyzed
        normalizedPlan={normalizeTerraformPlan(createBlastRadiusPlan())}
        selectedAddress="module.app.aws_instance.api"
      />,
    );

    expect(
      screen
        .getByTestId("graph-node-module.app.aws_instance.api")
        .querySelector("[data-emphasis='selected']"),
    ).toBeTruthy();
    expect(
      screen
        .getByTestId("graph-node-module.data.aws_db_instance.primary")
        .querySelector("[data-emphasis='upstream']"),
    ).toBeTruthy();
    expect(
      screen
        .getByTestId("graph-node-module.edge.aws_lb_listener.public")
        .querySelector("[data-emphasis='downstream']"),
    ).toBeTruthy();
    expect(
      screen
        .getByTestId("graph-node-module.identity.aws_iam_role.worker")
        .querySelector("[data-emphasis='dimmed']"),
    ).toBeTruthy();
  });
});
