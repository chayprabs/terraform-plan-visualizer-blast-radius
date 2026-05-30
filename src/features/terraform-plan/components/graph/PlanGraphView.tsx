"use client";

import {
  Background,
  MarkerType,
  ReactFlow,
  type Edge as FlowEdge,
  type ReactFlowInstance,
} from "@xyflow/react";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GraphEmptyState } from "@/features/terraform-plan/components/graph/GraphEmptyState";
import { GraphInspectorPanel } from "@/features/terraform-plan/components/graph/GraphInspectorPanel";
import { GraphLegend } from "@/features/terraform-plan/components/graph/GraphLegend";
import { usePrivacyRedaction } from "@/features/terraform-plan/components/privacy/PrivacyRedactionContext";
import {
  PLAN_GRAPH_NODE_HEIGHT,
  PLAN_GRAPH_NODE_WIDTH,
  TerraformGraphNode,
  type GraphNodeEmphasis,
  type TerraformFlowNode,
} from "@/features/terraform-plan/components/graph/GraphNode";
import {
  GraphToolbar,
  type GraphFilterOption,
} from "@/features/terraform-plan/components/graph/GraphToolbar";
import type { ResourceDetailsTabKey } from "@/features/terraform-plan/components/resources/ResourceDetailsDrawer";
import type { ChangeActionKind } from "@/features/terraform-plan/domain/actionTypes";
import type { NormalizedPlan } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import type { ResourceTypeGroup } from "@/features/terraform-plan/domain/providerTypes";
import {
  detectOrphanChangedResources,
  getDownstreamDependents,
  getUpstreamDependencies,
} from "@/features/terraform-plan/graph/graphAlgorithms";
import { extractDependencyGraph } from "@/features/terraform-plan/graph/extractDependencyGraph";
import type {
  DependencyGraph,
  GraphEdge,
  GraphNode,
  GraphNodeRiskLevel,
} from "@/features/terraform-plan/graph/graphTypes";
import { redactText } from "@/features/terraform-plan/privacy/redactTerraformPlan";
import type { TerraformPlanRedactionSettings } from "@/features/terraform-plan/privacy/redactionTypes";
import { createStableAnonymizer } from "@/features/terraform-plan/privacy/stableAnonymizer";
import {
  compareRiskSeverity,
  getRiskSeverityLabel,
  RISK_SEVERITY_ORDER,
} from "@/features/terraform-plan/risk/riskCopy";
import {
  DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE,
  type TerraformPlanGraphViewState,
} from "@/features/terraform-plan/state/urlState";

interface PlanGraphViewProps {
  blastRadiusDownstreamIds?: string[];
  blastRadiusFocusAddress?: string | null;
  blastRadiusNodeIds?: string[];
  blastRadiusUpstreamIds?: string[];
  hasAnalyzed: boolean;
  initialState?: TerraformPlanGraphViewState;
  normalizedPlan: NormalizedPlan | null;
  onOpenResource?: (address: string, initialTab: ResourceDetailsTabKey) => void;
  onStateChange?: (state: TerraformPlanGraphViewState) => void;
  selectedAddress?: string | null;
}

interface LayoutedGraphNode {
  node: GraphNode;
  position: {
    x: number;
    y: number;
  };
}

type GraphRiskFilter = GraphNodeRiskLevel | "all";

const LARGE_GRAPH_WARNING_THRESHOLD = 500;
const LARGE_GRAPH_BLOCK_THRESHOLD = 1500;
const LAYER_GAP = 140;
const MODULE_BAND_GAP = 88;
const MODULE_HEADER_GAP = 42;
const NODE_VERTICAL_GAP = 32;
const ACTION_ORDER: ChangeActionKind[] = [
  "replace",
  "delete",
  "update",
  "create",
  "import",
  "read",
  "no-op",
  "forget",
  "unknown",
];
const RESOURCE_GROUP_LABELS: Record<ResourceTypeGroup, string> = {
  iam: "IAM",
  network: "Network",
  database: "Database",
  storage: "Storage",
  compute: "Compute",
  dns: "DNS",
  kms: "KMS",
  unknown: "Unknown",
};
const nodeTypes = {
  terraformResource: TerraformGraphNode,
} as const;

function isResourceNode(node: GraphNode): boolean {
  return node.metadata.kind === "resource";
}

function isRenderableEdge(edge: GraphEdge): boolean {
  return edge.relationshipType !== "module_contains";
}

function getRiskFilterLabel(risk: GraphNodeRiskLevel): string {
  return risk === "none" ? "None" : getRiskSeverityLabel(risk);
}

function createOptions<T extends string>(
  values: T[],
  counts: Map<T, number>,
  getLabel: (value: T) => string,
  allLabel: string,
): GraphFilterOption[] {
  return [
    {
      count: Array.from(counts.values()).reduce((total, count) => total + count, 0),
      label: allLabel,
      value: "all",
    },
    ...values
      .filter((value) => (counts.get(value) ?? 0) > 0)
      .map((value) => ({
        count: counts.get(value) ?? 0,
        label: getLabel(value),
        value,
      })),
  ];
}

function buildGraphFilterOptions(nodes: GraphNode[]) {
  const actionCounts = new Map<ChangeActionKind, number>();
  const providerCounts = new Map<string, number>();
  const moduleCounts = new Map<string, number>();
  const resourceGroupCounts = new Map<ResourceTypeGroup, number>();
  const riskCounts = new Map<GraphNodeRiskLevel, number>();

  for (const node of nodes) {
    actionCounts.set(node.actionKind, (actionCounts.get(node.actionKind) ?? 0) + 1);
    providerCounts.set(node.provider, (providerCounts.get(node.provider) ?? 0) + 1);
    moduleCounts.set(node.module, (moduleCounts.get(node.module) ?? 0) + 1);
    resourceGroupCounts.set(
      node.resourceGroup,
      (resourceGroupCounts.get(node.resourceGroup) ?? 0) + 1,
    );
    riskCounts.set(node.riskLevel, (riskCounts.get(node.riskLevel) ?? 0) + 1);
  }

  return {
    actionOptions: createOptions(
      ACTION_ORDER,
      actionCounts,
      (value) => value,
      "All actions",
    ),
    providerOptions: createOptions(
      Array.from(providerCounts.keys()).sort((left, right) =>
        left.localeCompare(right),
      ),
      providerCounts,
      (value) => value,
      "All providers",
    ),
    moduleOptions: createOptions(
      Array.from(moduleCounts.keys()).sort((left, right) =>
        left.localeCompare(right),
      ),
      moduleCounts,
      (value) => value,
      "All modules",
    ),
    resourceGroupOptions: createOptions(
      Array.from(resourceGroupCounts.keys()).sort((left, right) =>
        RESOURCE_GROUP_LABELS[left].localeCompare(RESOURCE_GROUP_LABELS[right]),
      ),
      resourceGroupCounts,
      (value) => RESOURCE_GROUP_LABELS[value],
      "All groups",
    ),
    riskOptions: createOptions(
      [...RISK_SEVERITY_ORDER, "none"] as GraphNodeRiskLevel[],
      riskCounts,
      getRiskFilterLabel,
      "All risk levels",
    ),
  };
}

function compareGraphNodes(left: GraphNode, right: GraphNode): number {
  if (left.riskLevel !== right.riskLevel) {
    if (left.riskLevel === "none" || right.riskLevel === "none") {
      const order = [...RISK_SEVERITY_ORDER, "none"];
      return order.indexOf(left.riskLevel) - order.indexOf(right.riskLevel);
    }

    return compareRiskSeverity(left.riskLevel, right.riskLevel);
  }

  return (
    ACTION_ORDER.indexOf(left.actionKind) - ACTION_ORDER.indexOf(right.actionKind) ||
    left.id.localeCompare(right.id)
  );
}

function buildLayerMap(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
  const layerMap = new Map(nodes.map((node) => [node.id, 0]));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map<string, string[]>();

  for (const edge of edges) {
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
  }

  const queue = nodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id)
    .sort((left, right) => left.localeCompare(right));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentNodeId = queue.shift();

    if (!currentNodeId) {
      continue;
    }

    visited.add(currentNodeId);
    const currentLayer = layerMap.get(currentNodeId) ?? 0;

    for (const nextNodeId of outgoing.get(currentNodeId) ?? []) {
      layerMap.set(
        nextNodeId,
        Math.max(layerMap.get(nextNodeId) ?? 0, currentLayer + 1),
      );
      indegree.set(nextNodeId, (indegree.get(nextNodeId) ?? 0) - 1);

      if ((indegree.get(nextNodeId) ?? 0) <= 0) {
        queue.push(nextNodeId);
      }
    }
  }

  const fallbackLayer = Math.max(0, ...layerMap.values());

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      layerMap.set(node.id, fallbackLayer + 1);
    }
  }

  return layerMap;
}

function layoutGraph(nodes: GraphNode[], edges: GraphEdge[]): LayoutedGraphNode[] {
  const layerMap = buildLayerMap(nodes, edges);
  const groupedByModule = new Map<string, Map<number, GraphNode[]>>();

  for (const node of nodes) {
    const moduleLayers = groupedByModule.get(node.module) ?? new Map<number, GraphNode[]>();
    const layer = layerMap.get(node.id) ?? 0;
    const layerNodes = moduleLayers.get(layer) ?? [];

    moduleLayers.set(layer, [...layerNodes, node].sort(compareGraphNodes));
    groupedByModule.set(node.module, moduleLayers);
  }

  const sortedModules = Array.from(groupedByModule.keys()).sort((left, right) => {
    if (left === "root") {
      return -1;
    }

    if (right === "root") {
      return 1;
    }

    return left.localeCompare(right);
  });

  const layoutedNodes: LayoutedGraphNode[] = [];
  let currentBandStartY = 0;

  for (const moduleKey of sortedModules) {
    const layerBuckets = groupedByModule.get(moduleKey) ?? new Map<number, GraphNode[]>();
    const maxColumnDepth =
      Math.max(
        1,
        ...Array.from(layerBuckets.values()).map((items) => items.length),
      ) ?? 1;
    const moduleBandHeight =
      MODULE_HEADER_GAP +
      maxColumnDepth * PLAN_GRAPH_NODE_HEIGHT +
      Math.max(0, maxColumnDepth - 1) * NODE_VERTICAL_GAP;

    for (const [layer, layerNodes] of Array.from(layerBuckets.entries()).sort(
      ([leftLayer], [rightLayer]) => leftLayer - rightLayer,
    )) {
      layerNodes.forEach((node, index) => {
        layoutedNodes.push({
          node,
          position: {
            x: layer * (PLAN_GRAPH_NODE_WIDTH + LAYER_GAP),
            y:
              currentBandStartY +
              MODULE_HEADER_GAP +
              index * (PLAN_GRAPH_NODE_HEIGHT + NODE_VERTICAL_GAP),
          },
        });
      });
    }

    currentBandStartY += moduleBandHeight + MODULE_BAND_GAP;
  }

  return layoutedNodes;
}

function formatRelationshipType(relationshipType: GraphEdge["relationshipType"]): string {
  switch (relationshipType) {
    case "depends_on":
      return "depends_on";
    case "expression_reference":
      return "expression_reference";
    case "replace_path_related":
      return "replace_path_related";
    case "unknown":
    default:
      return "unknown";
  }
}

function getNodeSearchText(node: GraphNode): string {
  return [
    node.id,
    node.label,
    node.resourceType,
    node.provider,
    node.module,
    node.resourceGroup,
    node.actionKind,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function downloadTextFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getSvgNodeTone(node: GraphNode) {
  return {
    border:
      node.riskLevel === "critical"
        ? SVG_EXPORT_COLORS.critical
        : node.riskLevel === "high" || node.riskLevel === "medium"
          ? SVG_EXPORT_COLORS.warning
          : node.riskLevel === "low"
            ? SVG_EXPORT_COLORS.positive
            : SVG_EXPORT_COLORS.border,
    fill: SVG_EXPORT_COLORS.surface,
    stripe:
      node.riskLevel === "critical"
        ? SVG_EXPORT_COLORS.critical
        : node.riskLevel === "high" || node.riskLevel === "medium"
          ? SVG_EXPORT_COLORS.warning
          : node.riskLevel === "low"
            ? SVG_EXPORT_COLORS.positive
            : node.riskLevel === "info"
              ? SVG_EXPORT_COLORS.brand
              : SVG_EXPORT_COLORS.border,
  };
}

function getSvgActionColor(action: ChangeActionKind): string {
  switch (action) {
    case "create":
    case "import":
      return SVG_EXPORT_COLORS.positive;
    case "update":
    case "forget":
      return SVG_EXPORT_COLORS.warning;
    case "delete":
    case "replace":
      return SVG_EXPORT_COLORS.critical;
    case "read":
    case "no-op":
    case "unknown":
    default:
      return SVG_EXPORT_COLORS.border;
  }
}

function buildSvgExport(
  nodes: LayoutedGraphNode[],
  edges: GraphEdge[],
  settings: TerraformPlanRedactionSettings,
): string | null {
  if (nodes.length === 0) {
    return null;
  }

  const minX = Math.min(...nodes.map((item) => item.position.x));
  const minY = Math.min(...nodes.map((item) => item.position.y));
  const maxX = Math.max(...nodes.map((item) => item.position.x + PLAN_GRAPH_NODE_WIDTH));
  const maxY = Math.max(...nodes.map((item) => item.position.y + PLAN_GRAPH_NODE_HEIGHT));
  const padding = 64;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const nodeMap = new Map(nodes.map((item) => [item.node.id, item]));
  const anonymizer = createStableAnonymizer();
  const sanitizeText = (value: string): string =>
    redactText(value, {
      anonymizer,
      scope: "export",
      settings,
    });

  const edgeMarkup = edges
    .map((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);

      if (!source || !target) {
        return "";
      }

      const sourceX = source.position.x - minX + padding + PLAN_GRAPH_NODE_WIDTH;
      const sourceY =
        source.position.y - minY + padding + PLAN_GRAPH_NODE_HEIGHT / 2;
      const targetX = target.position.x - minX + padding;
      const targetY =
        target.position.y - minY + padding + PLAN_GRAPH_NODE_HEIGHT / 2;
      const controlOffset = Math.max(48, (targetX - sourceX) / 2);
      const labelX = (sourceX + targetX) / 2;
      const labelY = (sourceY + targetY) / 2 - 10;
      const stroke =
        edge.relationshipType === "expression_reference"
          ? "var(--warning)"
          : "var(--foreground)";

      return `
        <path d="M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}" fill="none" stroke="${stroke}" stroke-width="1.8" ${edge.relationshipType === "expression_reference" ? 'stroke-dasharray="7 5"' : ""} />
        <text x="${labelX}" y="${labelY}" fill="var(--muted-foreground)" font-family="IBM Plex Sans, sans-serif" font-size="11" font-weight="600" text-anchor="middle">${escapeSvgText(formatRelationshipType(edge.relationshipType))}</text>
      `;
    })
    .join("");

  const nodeMarkup = nodes
    .map(({ node, position }) => {
      const tone = getSvgNodeTone(node);
      const x = position.x - minX + padding;
      const y = position.y - minY + padding;

      return `
        <g>
          <rect x="${x}" y="${y}" rx="20" ry="20" width="${PLAN_GRAPH_NODE_WIDTH}" height="${PLAN_GRAPH_NODE_HEIGHT}" fill="${tone.fill}" stroke="${tone.border}" stroke-width="1.5" />
          <rect x="${x}" y="${y}" rx="20" ry="20" width="${PLAN_GRAPH_NODE_WIDTH}" height="6" fill="${tone.stripe}" />
          <circle cx="${x + 18}" cy="${y + 22}" r="7" fill="${getSvgActionColor(node.actionKind)}" />
          <text x="${x + 34}" y="${y + 25}" fill="var(--foreground)" font-family="IBM Plex Sans, sans-serif" font-size="14" font-weight="700">${escapeSvgText(sanitizeText(node.label))}</text>
          <text x="${x + 16}" y="${y + 49}" fill="var(--muted-foreground)" font-family="IBM Plex Mono, monospace" font-size="10">${escapeSvgText(sanitizeText(node.id))}</text>
          <text x="${x + 16}" y="${y + 76}" fill="var(--muted-foreground)" font-family="IBM Plex Sans, sans-serif" font-size="11" font-weight="600">${escapeSvgText(sanitizeText(node.resourceType))}</text>
          <text x="${x + 16}" y="${y + 96}" fill="var(--muted-foreground)" font-family="IBM Plex Sans, sans-serif" font-size="11">${escapeSvgText(sanitizeText(node.provider))} | ${escapeSvgText(sanitizeText(node.module))}</text>
          <text x="${x + 16}" y="${y + 116}" fill="var(--muted-foreground)" font-family="IBM Plex Sans, sans-serif" font-size="11">${escapeSvgText(sanitizeText(node.resourceGroup))} | ${escapeSvgText(sanitizeText(node.actionKind))}</text>
        </g>
      `;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="var(--background)" />
  ${edgeMarkup}
  ${nodeMarkup}
</svg>`;
}

export function PlanGraphView({
  blastRadiusDownstreamIds = [],
  blastRadiusFocusAddress = null,
  blastRadiusNodeIds = [],
  blastRadiusUpstreamIds = [],
  hasAnalyzed,
  initialState,
  normalizedPlan,
  onOpenResource,
  onStateChange,
  selectedAddress = null,
}: PlanGraphViewProps) {
  const { settings } = usePrivacyRedaction();
  const resolvedInitialState = initialState ?? DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE;
  const flowInstanceRef = useRef<ReactFlowInstance<TerraformFlowNode, FlowEdge> | null>(
    null,
  );
  const extractedGraph = useMemo(
    () => (normalizedPlan ? extractDependencyGraph(normalizedPlan.raw) : null),
    [normalizedPlan],
  );
  const resourceGraph = useMemo<DependencyGraph>(() => {
    if (!extractedGraph) {
      return {
        nodes: [],
        edges: [],
      };
    }

    const resourceNodes = extractedGraph.nodes.filter(isResourceNode);
    const resourceNodeIds = new Set(resourceNodes.map((node) => node.id));

    return {
      nodes: resourceNodes,
      edges: extractedGraph.edges.filter(
        (edge) =>
          isRenderableEdge(edge) &&
          resourceNodeIds.has(edge.source) &&
          resourceNodeIds.has(edge.target),
      ),
    };
  }, [extractedGraph]);
  const resourceNodeMap = useMemo(
    () => new Map(resourceGraph.nodes.map((node) => [node.id, node])),
    [resourceGraph.nodes],
  );
  const resourceChangeMap = useMemo(
    () =>
      new Map(
        (normalizedPlan?.resourceChanges ?? []).map((resourceChange) => [
          resourceChange.address,
          resourceChange,
        ]),
      ),
    [normalizedPlan],
  );
  const filterOptions = useMemo(
    () => buildGraphFilterOptions(resourceGraph.nodes),
    [resourceGraph.nodes],
  );
  const totalResourceCount = resourceGraph.nodes.length;
  const hasExplicitDependencies = resourceGraph.edges.length > 0;
  const orphanChangedResources = useMemo(
    () => detectOrphanChangedResources(resourceGraph),
    [resourceGraph],
  );
  const isLargeGraph = totalResourceCount > LARGE_GRAPH_WARNING_THRESHOLD;

  const [search, setSearch] = useState(resolvedInitialState.search);
  const [action, setAction] = useState<ChangeActionKind | "all">(
    resolvedInitialState.action,
  );
  const [provider, setProvider] = useState<string | "all">(
    resolvedInitialState.provider,
  );
  const [module, setModule] = useState<string | "all">(resolvedInitialState.module);
  const [resourceGroup, setResourceGroup] = useState<ResourceTypeGroup | "all">(
    resolvedInitialState.resourceGroup,
  );
  const [risk, setRisk] = useState<GraphRiskFilter>(resolvedInitialState.risk);
  const [showChangedOnly, setShowChangedOnly] = useState(
    initialState?.showChangedOnly ?? isLargeGraph,
  );
  const [includeChangedDependencies, setIncludeChangedDependencies] =
    useState(initialState?.includeChangedDependencies ?? isLargeGraph);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    selectedAddress,
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const nextState = initialState ?? DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE;

    startTransition(() => {
      setSearch(nextState.search);
      setAction(nextState.action);
      setProvider(nextState.provider);
      setModule(nextState.module);
      setResourceGroup(nextState.resourceGroup);
      setRisk(nextState.risk);
      setShowChangedOnly(initialState?.showChangedOnly ?? isLargeGraph);
      setIncludeChangedDependencies(
        initialState?.includeChangedDependencies ?? isLargeGraph,
      );
    });
  }, [initialState, isLargeGraph]);

  useEffect(() => {
    onStateChange?.({
      action,
      includeChangedDependencies,
      module,
      provider,
      resourceGroup,
      risk,
      search,
      showChangedOnly,
    });
  }, [
    action,
    includeChangedDependencies,
    module,
    onStateChange,
    provider,
    resourceGroup,
    risk,
    search,
    showChangedOnly,
  ]);

  useEffect(() => {
    const nextSelectedNodeId =
      selectedAddress && resourceNodeMap.has(selectedAddress)
        ? selectedAddress
        : blastRadiusFocusAddress && resourceNodeMap.has(blastRadiusFocusAddress)
          ? blastRadiusFocusAddress
          : null;

    if (nextSelectedNodeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedNodeId(nextSelectedNodeId);
    }
  }, [blastRadiusFocusAddress, resourceNodeMap, selectedAddress]);

  const effectiveSelectedNodeId =
    selectedAddress && resourceNodeMap.has(selectedAddress)
      ? selectedAddress
      : selectedNodeId && resourceNodeMap.has(selectedNodeId)
        ? selectedNodeId
        : blastRadiusFocusAddress && resourceNodeMap.has(blastRadiusFocusAddress)
          ? blastRadiusFocusAddress
          : null;

  const changedNodeIds = useMemo(
    () =>
      new Set(
        resourceGraph.nodes
          .filter((node) => node.existsInPlanChange)
          .map((node) => node.id),
      ),
    [resourceGraph.nodes],
  );

  const changedNeighborhoodIds = useMemo(() => {
    if (!showChangedOnly || !includeChangedDependencies) {
      return changedNodeIds;
    }

    const expandedIds = new Set<string>(changedNodeIds);

    for (const nodeId of changedNodeIds) {
      for (const upstreamNode of getUpstreamDependencies(resourceGraph, nodeId)) {
        expandedIds.add(upstreamNode.id);
      }

      for (const downstreamNode of getDownstreamDependents(
        resourceGraph,
        nodeId,
      )) {
        expandedIds.add(downstreamNode.id);
      }
    }

    return expandedIds;
  }, [
    changedNodeIds,
    includeChangedDependencies,
    resourceGraph,
    showChangedOnly,
  ]);

  const filteredNodes = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    const baselineIds = showChangedOnly ? changedNeighborhoodIds : null;

    return resourceGraph.nodes.filter((node) => {
      if (baselineIds && !baselineIds.has(node.id)) {
        return false;
      }

      if (action !== "all" && node.actionKind !== action) {
        return false;
      }

      if (provider !== "all" && node.provider !== provider) {
        return false;
      }

      if (module !== "all" && node.module !== module) {
        return false;
      }

      if (resourceGroup !== "all" && node.resourceGroup !== resourceGroup) {
        return false;
      }

      if (risk !== "all" && node.riskLevel !== risk) {
        return false;
      }

      if (
        normalizedSearch.length > 0 &&
        !getNodeSearchText(node).includes(normalizedSearch)
      ) {
        return false;
      }

      return true;
    });
  }, [
    action,
    changedNeighborhoodIds,
    deferredSearch,
    module,
    provider,
    resourceGraph.nodes,
    resourceGroup,
    risk,
    showChangedOnly,
  ]);
  const visibleNodeIds = useMemo(
    () => new Set(filteredNodes.map((node) => node.id)),
    [filteredNodes],
  );
  const visibleEdges = useMemo(
    () =>
      resourceGraph.edges.filter(
        (edge) =>
          visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
      ),
    [resourceGraph.edges, visibleNodeIds],
  );
  const shouldBlockGraph = visibleNodeIds.size > LARGE_GRAPH_BLOCK_THRESHOLD;
  const layoutedNodes = useMemo(
    () => layoutGraph(filteredNodes, visibleEdges),
    [filteredNodes, visibleEdges],
  );

  const hoverContext = useMemo(() => {
    if (!hoveredNodeId || !visibleNodeIds.has(hoveredNodeId)) {
      return {
        focusNodeId: null,
        highlightedEdges: new Set<string>(),
        relatedIds: new Set<string>(),
        upstreamIds: new Set<string>(),
        downstreamIds: new Set<string>(),
      };
    }

    const visibleGraph = {
      nodes: filteredNodes,
      edges: visibleEdges,
    };
    const upstreamIds = new Set(
      getUpstreamDependencies(visibleGraph, hoveredNodeId).map((node) => node.id),
    );
    const downstreamIds = new Set(
      getDownstreamDependents(visibleGraph, hoveredNodeId).map((node) => node.id),
    );
    const relatedIds = new Set([
      hoveredNodeId,
      ...upstreamIds,
      ...downstreamIds,
    ]);
    const highlightedEdges = new Set(
      visibleEdges
        .filter(
          (edge) =>
            relatedIds.has(edge.source) && relatedIds.has(edge.target),
        )
        .map((edge) => edge.id),
    );

    return {
      focusNodeId: hoveredNodeId,
      highlightedEdges,
      relatedIds,
      upstreamIds,
      downstreamIds,
    };
  }, [filteredNodes, hoveredNodeId, visibleEdges, visibleNodeIds]);
  const blastRadiusContext = useMemo(() => {
    if (!blastRadiusFocusAddress || !visibleNodeIds.has(blastRadiusFocusAddress)) {
      return {
        focusNodeId: null,
        highlightedEdges: new Set<string>(),
        relatedIds: new Set<string>(),
        upstreamIds: new Set<string>(),
        downstreamIds: new Set<string>(),
      };
    }

    const relatedIds = new Set(
      blastRadiusNodeIds.filter((nodeId) => visibleNodeIds.has(nodeId)),
    );

    relatedIds.add(blastRadiusFocusAddress);

    const upstreamIds = new Set(
      blastRadiusUpstreamIds.filter((nodeId) => visibleNodeIds.has(nodeId)),
    );
    const downstreamIds = new Set(
      blastRadiusDownstreamIds.filter((nodeId) => visibleNodeIds.has(nodeId)),
    );
    const highlightedEdges = new Set(
      visibleEdges
        .filter(
          (edge) =>
            relatedIds.has(edge.source) && relatedIds.has(edge.target),
        )
        .map((edge) => edge.id),
    );

    return {
      focusNodeId: blastRadiusFocusAddress,
      highlightedEdges,
      relatedIds,
      upstreamIds,
      downstreamIds,
    };
  }, [
    blastRadiusDownstreamIds,
    blastRadiusFocusAddress,
    blastRadiusNodeIds,
    blastRadiusUpstreamIds,
    visibleEdges,
    visibleNodeIds,
  ]);
  const activeHighlightContext =
    hoverContext.focusNodeId !== null ? hoverContext : blastRadiusContext;

  const flowNodes = useMemo<TerraformFlowNode[]>(() => {
    const hasActiveHighlight = activeHighlightContext.focusNodeId !== null;

    return layoutedNodes.map(({ node, position }) => {
      let emphasis: GraphNodeEmphasis = "default";

      if (effectiveSelectedNodeId === node.id) {
        emphasis = "selected";
      } else if (hasActiveHighlight) {
        if (activeHighlightContext.focusNodeId === node.id) {
          emphasis = "hovered";
        } else if (activeHighlightContext.upstreamIds.has(node.id)) {
          emphasis = "upstream";
        } else if (activeHighlightContext.downstreamIds.has(node.id)) {
          emphasis = "downstream";
        } else if (!activeHighlightContext.relatedIds.has(node.id)) {
          emphasis = "dimmed";
        }
      }

      return {
        id: node.id,
        type: "terraformResource",
        data: {
          graphNode: node,
          emphasis,
        },
        draggable: false,
        position,
        selected: effectiveSelectedNodeId === node.id,
      };
    });
  }, [
    activeHighlightContext.downstreamIds,
    activeHighlightContext.focusNodeId,
    activeHighlightContext.relatedIds,
    activeHighlightContext.upstreamIds,
    effectiveSelectedNodeId,
    layoutedNodes,
  ]);
  const flowEdges = useMemo<FlowEdge[]>(() => {
    const hasActiveHighlight = activeHighlightContext.focusNodeId !== null;

    return visibleEdges.map((edge) => {
      const isConnected =
        hasActiveHighlight &&
        activeHighlightContext.relatedIds.has(edge.source) &&
        activeHighlightContext.relatedIds.has(edge.target) &&
        activeHighlightContext.highlightedEdges.has(edge.id);
      const isDimmed = hasActiveHighlight && !isConnected;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: formatRelationshipType(edge.relationshipType),
        labelBgPadding: [6, 2],
        labelBgStyle: {
          fill: "var(--surface)",
          fillOpacity: 0.96,
          stroke: "var(--border)",
          strokeWidth: 1,
        },
        labelStyle: {
          fill: "var(--muted-foreground)",
          fontSize: 10,
          fontWeight: 700,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color:
            edge.relationshipType === "expression_reference"
              ? "var(--warning)"
              : "var(--foreground)",
        },
        style: {
          opacity: isDimmed ? 0.18 : isConnected ? 1 : 0.72,
          stroke:
            edge.relationshipType === "expression_reference"
              ? "var(--warning)"
              : "var(--foreground)",
          strokeDasharray:
            edge.relationshipType === "expression_reference" ? "7 5" : undefined,
          strokeWidth: isConnected ? 2.6 : 1.7,
        },
      };
    });
  }, [
    activeHighlightContext.highlightedEdges,
    activeHighlightContext.relatedIds,
    activeHighlightContext.focusNodeId,
    visibleEdges,
  ]);

  const selectedNode =
    (effectiveSelectedNodeId
      ? resourceNodeMap.get(effectiveSelectedNodeId)
      : null) ?? null;
  const selectedResourceChange =
    (selectedNode ? resourceChangeMap.get(selectedNode.id) ?? null : null) ?? null;
  const directUpstreamEdges = useMemo(
    () =>
      selectedNode
        ? resourceGraph.edges.filter((edge) => edge.target === selectedNode.id)
        : [],
    [resourceGraph.edges, selectedNode],
  );
  const directDownstreamEdges = useMemo(
    () =>
      selectedNode
        ? resourceGraph.edges.filter((edge) => edge.source === selectedNode.id)
        : [],
    [resourceGraph.edges, selectedNode],
  );
  const recursiveUpstream = useMemo(
    () =>
      selectedNode ? getUpstreamDependencies(resourceGraph, selectedNode.id) : [],
    [resourceGraph, selectedNode],
  );
  const recursiveDownstream = useMemo(
    () =>
      selectedNode ? getDownstreamDependents(resourceGraph, selectedNode.id) : [],
    [resourceGraph, selectedNode],
  );

  const handleFitView = useCallback(() => {
    flowInstanceRef.current?.fitView({
      duration: 250,
      padding: 0.18,
    });
  }, []);

  const handleResetView = useCallback(() => {
    flowInstanceRef.current?.setViewport(
      {
        x: 0,
        y: 0,
        zoom: 1,
      },
      {
        duration: 250,
      },
    );
  }, []);

  const handleExportSvg = useCallback(() => {
    const svgContent = buildSvgExport(layoutedNodes, visibleEdges, settings);

    if (!svgContent) {
      return;
    }

    downloadTextFile(
      svgContent,
      "terraform-plan-dependency-graph.svg",
      "image/svg+xml;charset=utf-8",
    );
  }, [layoutedNodes, settings, visibleEdges]);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setAction("all");
    setProvider("all");
    setModule("all");
    setResourceGroup("all");
    setRisk("all");
    setShowChangedOnly(isLargeGraph);
    setIncludeChangedDependencies(isLargeGraph);
    setHoveredNodeId(null);
  }, [isLargeGraph]);

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);

      if (resourceChangeMap.has(nodeId)) {
        onOpenResource?.(nodeId, "overview");
      }
    },
    [onOpenResource, resourceChangeMap],
  );

  if (!hasAnalyzed || !normalizedPlan) {
    return (
      <GraphEmptyState
        description="Analyze a Terraform plan to generate a local dependency graph, inspect blast radius, and filter resources by risk, provider, module, and action."
        title="Analyze a Terraform plan to see the dependency graph."
      />
    );
  }

  if (totalResourceCount === 0) {
    return (
      <GraphEmptyState
        description="Terraform did not emit any graphable resource nodes for this run, so there is no dependency view to render."
        title="Dependency data is unavailable for this plan."
      />
    );
  }

  const summaryLabel = `Showing ${visibleNodeIds.size} of ${totalResourceCount} resources and ${visibleEdges.length} dependency edges.${orphanChangedResources.length > 0 ? ` ${orphanChangedResources.length} changed resources are currently orphaned.` : ""}`;

  return (
    <section className="space-y-4" aria-label="Terraform dependency graph">
      <GraphToolbar
        action={action}
        actionOptions={filterOptions.actionOptions}
        exportDisabled={visibleNodeIds.size === 0 || shouldBlockGraph}
        includeChangedDependencies={includeChangedDependencies}
        isLargeGraph={isLargeGraph}
        module={module}
        moduleOptions={filterOptions.moduleOptions}
        onActionChange={setAction}
        onClearFilters={handleClearFilters}
        onExportSvg={handleExportSvg}
        onFitView={handleFitView}
        onIncludeChangedDependenciesChange={setIncludeChangedDependencies}
        onModuleChange={setModule}
        onProviderChange={setProvider}
        onResetView={handleResetView}
        onResourceGroupChange={setResourceGroup}
        onRiskChange={setRisk}
        onSearchChange={setSearch}
        onShowChangedOnlyChange={setShowChangedOnly}
        provider={provider}
        providerOptions={filterOptions.providerOptions}
        resourceGroup={resourceGroup}
        resourceGroupOptions={filterOptions.resourceGroupOptions}
        risk={risk}
        riskOptions={filterOptions.riskOptions}
        search={search}
        showChangedOnly={showChangedOnly}
        summaryLabel={summaryLabel}
      />

      <GraphLegend />

      {isLargeGraph ? (
        <div className="border-warning bg-warning-soft rounded-lg border p-4">
          <p className="text-warning text-sm font-semibold">
            Large graph guardrails are active.
          </p>
          <p className="text-warning mt-2 text-sm leading-7">
            This plan contains more than {LARGE_GRAPH_WARNING_THRESHOLD} graph
            nodes, so the view starts in changed-resources mode to keep
            interaction responsive.
          </p>
        </div>
      ) : null}

      {!hasExplicitDependencies ? (
        <div className="border-border bg-surface-muted rounded-lg border p-4">
          <p className="text-foreground text-sm font-semibold">
            No explicit dependency edges were found.
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-7">
            Terraform did not expose `depends_on` or expression-reference data
            for this plan, so the graph is showing isolated resource nodes that
            you can still search, filter, and inspect.
          </p>
        </div>
      ) : null}

      {shouldBlockGraph ? (
        <GraphEmptyState
          actionLabel={showChangedOnly ? undefined : "Show changed resources only"}
          description={`This view still contains more than ${LARGE_GRAPH_BLOCK_THRESHOLD} nodes, so the full graph is intentionally not rendered. Narrow the search or filters, or switch back to changed resources only.`}
          onAction={
            showChangedOnly ? undefined : () => setShowChangedOnly(true)
          }
          onSecondaryAction={handleClearFilters}
          secondaryActionLabel="Clear filters"
          title="Filter the graph before rendering the full topology."
          tone="warning"
        />
      ) : visibleNodeIds.size === 0 ? (
        <GraphEmptyState
          actionLabel="Clear filters"
          description="Try clearing one or more filters, or disable changed-only mode to broaden the visible graph."
          onAction={handleClearFilters}
          title="No graph nodes match the current filters."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          <div className="border-border bg-background overflow-hidden rounded-lg border">
            <div className="border-border bg-surface-muted border-b px-4 py-3">
              <p className="text-foreground text-sm font-semibold">
                Interactive topology
              </p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                Hover a node to highlight its recursive upstream and downstream
                paths. Click a resource node to open the inspector and sync the
                resource details drawer.
              </p>
            </div>

            <div className="h-[720px] w-full">
              <ReactFlow<TerraformFlowNode, FlowEdge>
                edges={flowEdges}
                fitView
                nodes={flowNodes}
                nodesDraggable={false}
                nodesFocusable
                nodeTypes={nodeTypes}
                onInit={(instance) => {
                  flowInstanceRef.current = instance;
                }}
                onNodeClick={(_, node) => {
                  handleSelectNode(node.id);
                }}
                onNodeMouseEnter={(_, node) => {
                  setHoveredNodeId(node.id);
                }}
                onNodeMouseLeave={() => {
                  setHoveredNodeId(null);
                }}
                proOptions={{ hideAttribution: true }}
              >
                <Background color="var(--border)" gap={24} size={1} />
              </ReactFlow>
            </div>
          </div>

          <GraphInspectorPanel
            directDownstreamEdges={directDownstreamEdges}
            directUpstreamEdges={directUpstreamEdges}
            graph={resourceGraph}
            onOpenResource={onOpenResource}
            onSelectNode={handleSelectNode}
            recursiveDownstream={recursiveDownstream}
            recursiveUpstream={recursiveUpstream}
            selectedNode={selectedNode}
            selectedResourceChange={selectedResourceChange}
            visibleNodeIds={visibleNodeIds}
          />
        </div>
      )}
    </section>
  );
}
