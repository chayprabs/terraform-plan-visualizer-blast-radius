"use client";

import type { ResourceDetailsTabKey } from "@/features/terraform-plan/components/resources/ResourceDetailsDrawer";
import { ResourceActionBadge } from "@/features/terraform-plan/components/resources/ResourceActionBadge";
import { SeverityBadge } from "@/features/terraform-plan/components/findings/SeverityBadge";
import type { NormalizedResourceChange } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import type { DependencyGraph, GraphEdge, GraphNode } from "@/features/terraform-plan/graph/graphTypes";
import { cn } from "@/lib/utils";

interface GraphInspectorPanelProps {
  directDownstreamEdges: GraphEdge[];
  directUpstreamEdges: GraphEdge[];
  graph: DependencyGraph;
  selectedNode: GraphNode | null;
  selectedResourceChange: NormalizedResourceChange | null;
  visibleNodeIds: Set<string>;
  onOpenResource?: (address: string, initialTab: ResourceDetailsTabKey) => void;
  onSelectNode?: (nodeId: string) => void;
  recursiveDownstream: GraphNode[];
  recursiveUpstream: GraphNode[];
}

function formatRelationshipType(relationshipType: GraphEdge["relationshipType"]): string {
  return relationshipType.replaceAll("_", " ");
}

function RelatedNodeList({
  direction,
  edges,
  graph,
  onSelectNode,
  visibleNodeIds,
}: {
  direction: "upstream" | "downstream";
  edges: GraphEdge[];
  graph: DependencyGraph;
  onSelectNode?: (nodeId: string) => void;
  visibleNodeIds: Set<string>;
}) {
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));

  if (edges.length === 0) {
    return (
      <p className="text-muted-foreground text-sm leading-6">
        No direct {direction} relationships are visible for this node.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {edges.map((edge) => {
        const relatedNodeId =
          direction === "upstream" ? edge.source : edge.target;
        const relatedNode = nodeMap.get(relatedNodeId);

        if (!relatedNode) {
          return null;
        }

        return (
          <button
            key={edge.id}
            type="button"
            className="border-border bg-background hover:bg-surface-muted flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors"
            onClick={() => onSelectNode?.(relatedNode.id)}
          >
            <div className="min-w-0">
              <p className="text-foreground break-all text-sm font-semibold">
                {relatedNode.id}
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                {formatRelationshipType(edge.relationshipType)}
                {visibleNodeIds.has(relatedNode.id) ? "" : " · hidden by filters"}
              </p>
              {edge.evidence.length > 0 ? (
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  {edge.evidence.join(" · ")}
                </p>
              ) : null}
            </div>
            <span className="border-border bg-surface inline-flex shrink-0 rounded-full border px-2 py-1 text-[0.62rem] font-semibold uppercase">
              {direction === "upstream" ? "Needs" : "Impacts"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PlaceholderPanel() {
  return (
    <div className="border-border bg-surface-muted rounded-lg border p-5">
      <p className="text-foreground text-sm font-semibold">Select a graph node</p>
      <p className="text-muted-foreground mt-2 text-sm leading-7">
        Click any resource node to inspect its action, risk, provider, module,
        and upstream or downstream relationships.
      </p>
    </div>
  );
}

export function GraphInspectorPanel({
  directDownstreamEdges,
  directUpstreamEdges,
  graph,
  selectedNode,
  selectedResourceChange,
  visibleNodeIds,
  onOpenResource,
  onSelectNode,
  recursiveDownstream,
  recursiveUpstream,
}: GraphInspectorPanelProps) {
  if (!selectedNode) {
    return <PlaceholderPanel />;
  }

  return (
    <aside className="border-border bg-surface rounded-lg border p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm font-medium tracking-[0.18em] uppercase">
            Graph inspector
          </p>
          <h3 className="text-foreground mt-2 break-all text-lg font-semibold tracking-tight">
            {selectedNode.id}
          </h3>
        </div>

        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase",
            selectedNode.existsInPlanChange
              ? "border-brand bg-background text-foreground"
              : "border-border bg-surface-muted text-muted-foreground",
          )}
        >
          {selectedNode.existsInPlanChange ? "Changed" : "Related"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ResourceActionBadge action={selectedNode.actionKind} />
        {selectedNode.riskLevel !== "none" ? (
          <SeverityBadge severity={selectedNode.riskLevel} />
        ) : (
          <span className="border-border bg-surface-muted text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase">
            No risk
          </span>
        )}
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="border-border bg-background rounded-lg border p-3">
          <dt className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
            Type
          </dt>
          <dd className="text-foreground mt-2 text-sm font-medium">
            {selectedNode.resourceType}
          </dd>
        </div>
        <div className="border-border bg-background rounded-lg border p-3">
          <dt className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
            Provider
          </dt>
          <dd className="text-foreground mt-2 text-sm font-medium">
            {selectedNode.provider}
          </dd>
        </div>
        <div className="border-border bg-background rounded-lg border p-3">
          <dt className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
            Module
          </dt>
          <dd className="text-foreground mt-2 text-sm font-medium">
            {selectedNode.module}
          </dd>
        </div>
        <div className="border-border bg-background rounded-lg border p-3">
          <dt className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
            Resource group
          </dt>
          <dd className="text-foreground mt-2 text-sm font-medium">
            {selectedNode.resourceGroup}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="border-border bg-background rounded-lg border p-3">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
            Recursive upstream
          </p>
          <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">
            {recursiveUpstream.length}
          </p>
        </div>
        <div className="border-border bg-background rounded-lg border p-3">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
            Recursive downstream
          </p>
          <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">
            {recursiveDownstream.length}
          </p>
        </div>
      </div>

      {selectedResourceChange && onOpenResource ? (
        <button
          type="button"
          className="bg-brand text-brand-foreground mt-4 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-transform duration-150 hover:-translate-y-0.5"
          onClick={() => onOpenResource(selectedResourceChange.address, "overview")}
        >
          Open resource details
        </button>
      ) : null}

      <div className="mt-6 space-y-4">
        <section>
          <h4 className="text-foreground text-sm font-semibold">
            Direct upstream
          </h4>
          <div className="mt-3">
            <RelatedNodeList
              direction="upstream"
              edges={directUpstreamEdges}
              graph={graph}
              onSelectNode={onSelectNode}
              visibleNodeIds={visibleNodeIds}
            />
          </div>
        </section>

        <section>
          <h4 className="text-foreground text-sm font-semibold">
            Direct downstream
          </h4>
          <div className="mt-3">
            <RelatedNodeList
              direction="downstream"
              edges={directDownstreamEdges}
              graph={graph}
              onSelectNode={onSelectNode}
              visibleNodeIds={visibleNodeIds}
            />
          </div>
        </section>
      </div>
    </aside>
  );
}
