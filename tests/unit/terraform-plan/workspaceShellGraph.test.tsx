import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceShell } from "@/features/terraform-plan/components/workspace-shell";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import { riskyPlan } from "@/features/terraform-plan/fixtures/samplePlans";
import { createBlastRadiusPlan } from "./blastRadiusTestPlan";

const useTerraformPlanAnalyzerMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/terraform-plan/hooks/useTerraformPlanAnalyzer", () => ({
  useTerraformPlanAnalyzer: useTerraformPlanAnalyzerMock,
}));

vi.mock("@xyflow/react", async () => {
  const React = await import("react");

  function ReactFlowMock({
    children,
    nodeTypes,
    nodes,
    onInit,
    onNodeClick,
  }: {
    children?: ReactNode;
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
  }) {
    React.useEffect(() => {
      onInit?.({
        fitView: () => undefined,
        setViewport: () => undefined,
      });
    }, [onInit]);

    return (
      <div data-testid="react-flow">
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

describe("WorkspaceShell graph integration", () => {
  it("opens the resource details drawer when a graph node is clicked", async () => {
    const normalizedPlan = normalizeTerraformPlan(riskyPlan);
    useTerraformPlanAnalyzerMock.mockReturnValue({
      analyzeText: () => undefined,
      error: null,
      normalizedPlan,
      progressMessage: undefined,
      reset: () => undefined,
      sourceName: "riskyPlan.json",
      status: "success" as const,
      warnings: [],
    });

    render(<WorkspaceShell />);

    fireEvent.click(
      screen.getByTestId("graph-node-module.data.aws_db_instance.primary"),
    );

    expect(
      await screen.findByRole("dialog", {
        name: /module\.data\.aws_db_instance\.primary/i,
      }),
    ).toBeInTheDocument();
  });

  it("syncs the selected graph node into blast radius mode and table filtering", async () => {
    const normalizedPlan = normalizeTerraformPlan(createBlastRadiusPlan());
    useTerraformPlanAnalyzerMock.mockReturnValue({
      analyzeText: () => undefined,
      error: null,
      normalizedPlan,
      progressMessage: undefined,
      reset: () => undefined,
      sourceName: "blast-radius.json",
      status: "success" as const,
      warnings: [],
    });

    render(<WorkspaceShell />);

    fireEvent.click(screen.getByTestId("graph-node-module.app.aws_instance.api"));

    expect(
      await screen.findByRole("dialog", {
        name: /module\.app\.aws_instance\.api/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Blast Radius/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/module\.app\.aws_instance\.api/i).length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText(/In selected blast radius/i));

    const table = screen.getByRole("table", {
      name: /Terraform resource changes/i,
    });

    expect(
      within(table).getByText(/module\.data\.aws_db_instance\.primary/i),
    ).toBeInTheDocument();
    expect(
      within(table).queryByText(/module\.identity\.aws_iam_role\.worker/i),
    ).not.toBeInTheDocument();
  });
});
