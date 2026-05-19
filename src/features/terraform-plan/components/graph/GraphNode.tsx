"use client";

import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { CSSProperties } from "react";
import type { ChangeActionKind } from "@/features/terraform-plan/domain/actionTypes";
import type { GraphNode as DependencyGraphNode } from "@/features/terraform-plan/graph/graphTypes";
import { cn } from "@/lib/utils";

export const PLAN_GRAPH_NODE_WIDTH = 288;
export const PLAN_GRAPH_NODE_HEIGHT = 136;

export type GraphNodeEmphasis =
  | "default"
  | "dimmed"
  | "selected"
  | "hovered"
  | "upstream"
  | "downstream";

export interface PlanGraphNodeData extends Record<string, unknown> {
  graphNode: DependencyGraphNode;
  emphasis: GraphNodeEmphasis;
}

export type TerraformFlowNode = Node<PlanGraphNodeData, "terraformResource">;

type ActionShape = "circle" | "diamond" | "hexagon" | "square" | "triangle";

const actionToneClasses: Record<ChangeActionKind, string> = {
  create: "bg-positive border-positive",
  update: "bg-warning border-warning",
  delete: "bg-critical border-critical",
  replace: "bg-critical border-critical",
  read: "bg-surface-strong border-border",
  "no-op": "bg-surface-strong border-border",
  import: "bg-positive border-positive",
  forget: "bg-warning border-warning",
  unknown: "bg-surface-strong border-border",
};

const riskToneClasses = {
  critical: "bg-critical",
  high: "bg-warning",
  medium: "bg-warning",
  low: "bg-positive",
  info: "bg-brand",
  none: "bg-border",
} as const;

function getActionShape(action: ChangeActionKind): ActionShape {
  switch (action) {
    case "create":
      return "circle";
    case "update":
    case "no-op":
      return "square";
    case "delete":
    case "forget":
      return "triangle";
    case "replace":
      return "diamond";
    case "import":
    case "read":
    case "unknown":
    default:
      return "hexagon";
  }
}

function getShapeStyle(shape: ActionShape): CSSProperties | undefined {
  switch (shape) {
    case "triangle":
      return {
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
      };
    case "hexagon":
      return {
        clipPath:
          "polygon(24% 4%, 76% 4%, 100% 50%, 76% 96%, 24% 96%, 0% 50%)",
      };
    default:
      return undefined;
  }
}

function getShapeClassName(shape: ActionShape): string {
  switch (shape) {
    case "circle":
      return "rounded-full";
    case "diamond":
      return "rotate-45 rounded-sm";
    case "square":
      return "rounded-[0.35rem]";
    case "triangle":
    case "hexagon":
    default:
      return "";
  }
}

function getEmphasisClasses(emphasis: GraphNodeEmphasis): string {
  switch (emphasis) {
    case "selected":
      return "ring-brand/35 border-brand bg-background shadow-[0_16px_40px_var(--shadow-color)] ring-4";
    case "hovered":
      return "border-brand bg-background shadow-[0_14px_30px_var(--shadow-color)]";
    case "upstream":
      return "border-warning bg-background shadow-[0_10px_24px_var(--shadow-color)]";
    case "downstream":
      return "border-positive bg-background shadow-[0_10px_24px_var(--shadow-color)]";
    case "dimmed":
      return "opacity-45";
    case "default":
    default:
      return "shadow-[0_10px_24px_var(--shadow-color)]";
  }
}

export function getGraphNodeActionShape(action: ChangeActionKind): ActionShape {
  return getActionShape(action);
}

export function TerraformGraphNode({
  data,
  selected,
}: NodeProps<TerraformFlowNode>) {
  const { graphNode, emphasis } = data;
  const actionShape = getActionShape(graphNode.actionKind);
  const emphasisState = selected ? "selected" : emphasis;

  return (
    <div
      aria-label={`${graphNode.label}, ${graphNode.actionKind} change, ${graphNode.riskLevel} risk`}
      className={cn(
        "border-border bg-surface relative overflow-hidden rounded-[1.15rem] border transition-all duration-150",
        getEmphasisClasses(emphasisState),
      )}
      data-emphasis={emphasisState}
      data-graph-node-id={graphNode.id}
      role="group"
      style={{
        width: PLAN_GRAPH_NODE_WIDTH,
        minHeight: PLAN_GRAPH_NODE_HEIGHT,
      }}
      title={graphNode.id}
    >
      <Handle
        className="opacity-0"
        isConnectable={false}
        position={Position.Left}
        type="target"
      />

      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1.5",
          riskToneClasses[graphNode.riskLevel],
        )}
      />

      <div className="flex gap-3 px-4 pt-4 pb-3">
        <span
          className={cn(
            "mt-1 h-4 w-4 shrink-0 border",
            actionToneClasses[graphNode.actionKind],
            getShapeClassName(actionShape),
          )}
          style={getShapeStyle(actionShape)}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-foreground text-sm font-semibold">
                {graphNode.label}
              </p>
              <p className="text-muted-foreground mt-1 break-all font-mono text-[0.72rem] leading-5">
                {graphNode.id}
              </p>
            </div>

            <span className="border-border bg-background text-muted-foreground inline-flex shrink-0 rounded-full border px-2 py-1 text-[0.62rem] font-semibold tracking-[0.18em] uppercase">
              {graphNode.existsInPlanChange ? "Changed" : "Related"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="border-border bg-background text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-medium uppercase">
              {graphNode.actionKind}
            </span>
            <span className="border-border bg-background text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-medium uppercase">
              {graphNode.provider}
            </span>
            <span className="border-border bg-background text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-medium uppercase">
              {graphNode.module}
            </span>
          </div>
        </div>
      </div>

      <div className="border-border bg-background/70 flex items-center justify-between gap-3 border-t px-4 py-2.5">
        <span className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.18em] uppercase">
          {graphNode.resourceType}
        </span>
        <span className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.18em] uppercase">
          {graphNode.resourceGroup}
        </span>
      </div>

      <Handle
        className="opacity-0"
        isConnectable={false}
        position={Position.Right}
        type="source"
      />
    </div>
  );
}
