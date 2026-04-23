import type { NormalizedPlan, NormalizedResourceChange } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import type { ResourceTypeGroup } from "@/features/terraform-plan/domain/providerTypes";
import {
  detectOrphanChangedResources,
  getConnectedComponent,
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
import {
  compareRiskSeverity,
  getHighestSeverityValue,
  getRiskActionLabel,
  getRiskSeverityLabel,
  isHighSeverity,
} from "@/features/terraform-plan/risk/riskCopy";
import type { RiskSeverity } from "@/features/terraform-plan/risk/riskTypes";

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

export interface BlastRadiusGroup {
  changedCount: number;
  highRiskCount: number;
  key: string;
  label: string;
  nodes: GraphNode[];
  totalCount: number;
}

export interface BlastRadiusCriticalPath {
  changedCount: number;
  highestRiskSeverity: RiskSeverity | null;
  id: string;
  label: string;
  nodeIds: string[];
}

export interface BlastRadiusDependencyCompleteness {
  hasConfiguration: boolean;
  hasExplicitEdges: boolean;
  isIncomplete: boolean;
  orphanChangedCount: number;
  reasons: string[];
  summary: string;
}

export interface BlastRadiusAnalysis {
  changedFocusOptions: NormalizedResourceChange[];
  connectedComponent: GraphNode[];
  criticalPaths: BlastRadiusCriticalPath[];
  dependencyCompleteness: BlastRadiusDependencyCompleteness;
  directChangedNodes: GraphNode[];
  downstream: GraphNode[];
  focusAddress: string | null;
  focusNode: GraphNode | null;
  focusResourceChange: NormalizedResourceChange | null;
  hasExplicitDependencies: boolean;
  highRiskNodes: GraphNode[];
  highestRiskSeverity: RiskSeverity | null;
  markdownSummary: string;
  orphanChangedNodes: GraphNode[];
  possiblyAffectedNodes: GraphNode[];
  providerGroups: BlastRadiusGroup[];
  radiusNodeIds: string[];
  radiusNodes: GraphNode[];
  resourceGraph: DependencyGraph;
  resourceGroupGroups: BlastRadiusGroup[];
  reviewerChecklist: string[];
  upstream: GraphNode[];
  moduleGroups: BlastRadiusGroup[];
}

function isResourceNode(node: GraphNode): boolean {
  return node.metadata.kind === "resource";
}

function isRenderableEdge(edge: GraphEdge): boolean {
  return edge.relationshipType !== "module_contains";
}

function compareGraphRisk(
  left: GraphNodeRiskLevel,
  right: GraphNodeRiskLevel,
): number {
  if (left === "none" || right === "none") {
    if (left === right) {
      return 0;
    }

    return left === "none" ? 1 : -1;
  }

  return compareRiskSeverity(left, right);
}

function compareNodes(left: GraphNode, right: GraphNode): number {
  return (
    Number(right.existsInPlanChange) - Number(left.existsInPlanChange) ||
    compareGraphRisk(left.riskLevel, right.riskLevel) ||
    left.id.localeCompare(right.id)
  );
}

function buildResourceGraph(normalizedPlan: NormalizedPlan): DependencyGraph {
  const extractedGraph = extractDependencyGraph(normalizedPlan.raw);
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
}

function buildNodeMap(graph: DependencyGraph): Map<string, GraphNode> {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

function uniqueNodes(nodes: GraphNode[]): GraphNode[] {
  return Array.from(new Map(nodes.map((node) => [node.id, node])).values()).sort(
    compareNodes,
  );
}

function getHighestRiskSeverity(nodes: GraphNode[]): RiskSeverity | null {
  return getHighestSeverityValue(
    nodes
      .map((node) => node.riskLevel)
      .filter((riskLevel): riskLevel is RiskSeverity => riskLevel !== "none"),
  );
}

function buildGroups(
  nodes: GraphNode[],
  getGroupKey: (node: GraphNode) => string,
  getLabel: (key: string) => string,
): BlastRadiusGroup[] {
  const groupMap = new Map<string, GraphNode[]>();

  for (const node of nodes) {
    const key = getGroupKey(node);
    const existing = groupMap.get(key) ?? [];

    groupMap.set(key, [...existing, node].sort(compareNodes));
  }

  return Array.from(groupMap.entries())
    .map(([key, groupedNodes]) => ({
      changedCount: groupedNodes.filter((node) => node.existsInPlanChange).length,
      highRiskCount: groupedNodes.filter(
        (node) => node.riskLevel !== "none" && isHighSeverity(node.riskLevel),
      ).length,
      key,
      label: getLabel(key),
      nodes: groupedNodes,
      totalCount: groupedNodes.length,
    }))
    .sort(
      (left, right) =>
        right.highRiskCount - left.highRiskCount ||
        right.changedCount - left.changedCount ||
        right.totalCount - left.totalCount ||
        left.label.localeCompare(right.label),
    );
}

function buildOutgoingMap(graph: DependencyGraph): Map<string, string[]> {
  const outgoing = new Map<string, string[]>();

  for (const edge of graph.edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
  }

  return outgoing;
}

function buildIncomingMap(graph: DependencyGraph): Map<string, string[]> {
  const incoming = new Map<string, string[]>();

  for (const edge of graph.edges) {
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge.source]);
  }

  return incoming;
}

function findShortestPath(
  graph: DependencyGraph,
  sourceId: string,
  targetId: string,
  allowedNodeIds: Set<string>,
): string[] | null {
  if (sourceId === targetId) {
    return [sourceId];
  }

  const outgoing = buildOutgoingMap(graph);
  const visited = new Set<string>([sourceId]);
  const queue: string[][] = [[sourceId]];

  while (queue.length > 0) {
    const currentPath = queue.shift();

    if (!currentPath) {
      continue;
    }

    const currentNodeId = currentPath.at(-1);

    if (!currentNodeId) {
      continue;
    }

    for (const nextNodeId of outgoing.get(currentNodeId) ?? []) {
      if (!allowedNodeIds.has(nextNodeId) || visited.has(nextNodeId)) {
        continue;
      }

      const nextPath = [...currentPath, nextNodeId];

      if (nextNodeId === targetId) {
        return nextPath;
      }

      visited.add(nextNodeId);
      queue.push(nextPath);
    }
  }

  return null;
}

function selectBoundaryNodes(
  nodes: GraphNode[],
  relatedNodeIds: Set<string>,
  lookupMap: Map<string, string[]>,
): GraphNode[] {
  const boundaryNodes = nodes.filter((node) => {
    const relatedNeighbors = (lookupMap.get(node.id) ?? []).filter((neighborId) =>
      relatedNodeIds.has(neighborId),
    );

    return relatedNeighbors.length === 0;
  });

  return (boundaryNodes.length > 0 ? boundaryNodes : nodes).sort(compareNodes);
}

function buildCriticalPaths(
  graph: DependencyGraph,
  focusNode: GraphNode | null,
  upstream: GraphNode[],
  downstream: GraphNode[],
): BlastRadiusCriticalPath[] {
  if (!focusNode) {
    return [];
  }

  const incoming = buildIncomingMap(graph);
  const outgoing = buildOutgoingMap(graph);
  const upstreamIds = new Set(upstream.map((node) => node.id));
  const downstreamIds = new Set(downstream.map((node) => node.id));
  const allowedNodeIds = new Set([
    focusNode.id,
    ...upstream.map((node) => node.id),
    ...downstream.map((node) => node.id),
  ]);
  const upstreamCandidates = selectBoundaryNodes(
    upstream,
    upstreamIds,
    incoming,
  ).slice(0, 3);
  const downstreamCandidates = selectBoundaryNodes(
    downstream,
    downstreamIds,
    outgoing,
  ).slice(0, 3);
  const nodeMap = buildNodeMap(graph);
  const pathMap = new Map<string, BlastRadiusCriticalPath>();

  if (upstreamCandidates.length === 0 && downstreamCandidates.length === 0) {
    return [
      {
        changedCount: Number(focusNode.existsInPlanChange),
        highestRiskSeverity: getHighestRiskSeverity([focusNode]),
        id: focusNode.id,
        label: focusNode.id,
        nodeIds: [focusNode.id],
      },
    ];
  }

  const addPath = (nodeIds: string[]) => {
    const key = nodeIds.join(" -> ");

    if (pathMap.has(key)) {
      return;
    }

    const pathNodes = nodeIds
      .map((nodeId) => nodeMap.get(nodeId))
      .filter((node): node is GraphNode => Boolean(node));

    pathMap.set(key, {
      changedCount: pathNodes.filter((node) => node.existsInPlanChange).length,
      highestRiskSeverity: getHighestRiskSeverity(pathNodes),
      id: key,
      label: key,
      nodeIds,
    });
  };

  for (const upstreamNode of upstreamCandidates) {
    const upstreamPath = findShortestPath(
      graph,
      upstreamNode.id,
      focusNode.id,
      allowedNodeIds,
    );

    if (!upstreamPath) {
      continue;
    }

    if (downstreamCandidates.length === 0) {
      addPath(upstreamPath);
      continue;
    }

    for (const downstreamNode of downstreamCandidates) {
      const downstreamPath = findShortestPath(
        graph,
        focusNode.id,
        downstreamNode.id,
        allowedNodeIds,
      );

      if (!downstreamPath) {
        continue;
      }

      addPath([...upstreamPath, ...downstreamPath.slice(1)]);
    }
  }

  if (pathMap.size === 0) {
    for (const downstreamNode of downstreamCandidates) {
      const downstreamPath = findShortestPath(
        graph,
        focusNode.id,
        downstreamNode.id,
        allowedNodeIds,
      );

      if (downstreamPath) {
        addPath(downstreamPath);
      }
    }
  }

  if (pathMap.size === 0) {
    addPath([focusNode.id]);
  }

  return Array.from(pathMap.values())
    .sort(
      (left, right) =>
        compareGraphRisk(
          right.highestRiskSeverity ?? "none",
          left.highestRiskSeverity ?? "none",
        ) ||
        right.changedCount - left.changedCount ||
        right.nodeIds.length - left.nodeIds.length ||
        left.label.localeCompare(right.label),
    )
    .slice(0, 5);
}

function buildDependencyCompleteness(
  normalizedPlan: NormalizedPlan,
  resourceGraph: DependencyGraph,
  orphanChangedNodes: GraphNode[],
): BlastRadiusDependencyCompleteness {
  const reasons: string[] = [];
  const hasConfiguration = Boolean(normalizedPlan.raw.configuration?.root_module);
  const hasExplicitEdges = resourceGraph.edges.length > 0;

  if (!hasConfiguration) {
    reasons.push(
      "Terraform plan JSON did not include a configuration block, so expression references and some depends_on relationships may be missing.",
    );
  }

  if (!hasExplicitEdges) {
    reasons.push(
      "No explicit dependency edges were extracted from planned values or configuration for this plan.",
    );
  }

  if (orphanChangedNodes.length > 0) {
    reasons.push(
      `${orphanChangedNodes.length} changed resource${orphanChangedNodes.length === 1 ? " is" : "s are"} disconnected from the extracted graph, so the blast radius may be understated.`,
    );
  }

  return {
    hasConfiguration,
    hasExplicitEdges,
    isIncomplete: reasons.length > 0,
    orphanChangedCount: orphanChangedNodes.length,
    reasons,
    summary:
      reasons.length > 0
        ? reasons.join(" ")
        : "Dependency extraction found explicit Terraform relationships for this plan.",
  };
}

function buildReviewerChecklist(nodes: GraphNode[]): string[] {
  const checklist = new Set<string>();

  if (
    nodes.some(
      (node) => node.actionKind === "replace" || node.actionKind === "delete",
    )
  ) {
    checklist.add("Confirm replacement is intended.");
  }

  if (nodes.some((node) => node.resourceGroup === "database")) {
    checklist.add("Confirm backups/snapshots exist for database resources.");
  }

  if (nodes.some((node) => node.resourceGroup === "iam")) {
    checklist.add("Confirm IAM permission changes are least privilege.");
  }

  if (nodes.some((node) => node.resourceGroup === "network")) {
    checklist.add("Confirm public ingress changes are expected.");
  }

  if (checklist.size === 0) {
    checklist.add("Confirm downstream service owners understand the affected dependency path.");
  }

  return Array.from(checklist);
}

function formatHighRiskResources(nodes: GraphNode[]): string[] {
  if (nodes.length === 0) {
    return ["- None identified from the current dependency radius."];
  }

  return nodes.map(
    (node) =>
      `- \`${node.id}\` (${node.riskLevel === "none" ? "None" : getRiskSeverityLabel(node.riskLevel)})`,
  );
}

function buildMarkdownSummary(
  analysis: Pick<
    BlastRadiusAnalysis,
    | "dependencyCompleteness"
    | "directChangedNodes"
    | "downstream"
    | "focusNode"
    | "focusResourceChange"
    | "highRiskNodes"
    | "highestRiskSeverity"
    | "reviewerChecklist"
  >,
): string {
  if (!analysis.focusNode || !analysis.focusResourceChange) {
    return [
      "# Blast Radius Summary",
      "",
      "Select a changed resource to generate a blast-radius summary.",
    ].join("\n");
  }

  const highRiskLines = formatHighRiskResources(analysis.highRiskNodes);
  const overallRiskLabel = analysis.highestRiskSeverity
    ? getRiskSeverityLabel(analysis.highestRiskSeverity)
    : "None";
  const markdown = [
    "# Blast Radius Summary",
    "",
    `- Focus resource: \`${analysis.focusNode.id}\``,
    `- Action: ${getRiskActionLabel(analysis.focusResourceChange.action)}`,
    `- Overall risk: ${overallRiskLabel}`,
    `- Direct changes count: ${analysis.directChangedNodes.length}`,
    `- Downstream dependents count: ${analysis.downstream.length}`,
    "",
    "## High-risk resources in radius",
    ...highRiskLines,
    "",
    "## Suggested reviewer checklist",
    ...analysis.reviewerChecklist.map((item) => `- ${item}`),
  ];

  if (analysis.dependencyCompleteness.isIncomplete) {
    markdown.push(
      "",
      "## Dependency data caveats",
      `- ${analysis.dependencyCompleteness.summary}`,
    );
  }

  return markdown.join("\n").trim();
}

function sortFocusOptions(
  resourceChanges: NormalizedResourceChange[],
): NormalizedResourceChange[] {
  return [...resourceChanges].sort((left, right) => {
    const leftSeverity = left.riskSummary?.highestSeverity ?? "none";
    const rightSeverity = right.riskSummary?.highestSeverity ?? "none";

    return (
      compareGraphRisk(leftSeverity, rightSeverity) ||
      left.address.localeCompare(right.address)
    );
  });
}

export function buildBlastRadiusAnalysis(
  normalizedPlan: NormalizedPlan,
  focusAddress: string | null,
): BlastRadiusAnalysis {
  const resourceGraph = buildResourceGraph(normalizedPlan);
  const changedFocusOptions = sortFocusOptions(normalizedPlan.resourceChanges);
  const resourceChangeMap = new Map(
    normalizedPlan.resourceChanges.map((resourceChange) => [
      resourceChange.address,
      resourceChange,
    ]),
  );
  const nodeMap = buildNodeMap(resourceGraph);
  const focusNode = focusAddress ? nodeMap.get(focusAddress) ?? null : null;
  const focusResourceChange =
    (focusAddress ? resourceChangeMap.get(focusAddress) ?? null : null) ?? null;
  const upstream = focusNode
    ? getUpstreamDependencies(resourceGraph, focusNode.id)
    : [];
  const downstream = focusNode
    ? getDownstreamDependents(resourceGraph, focusNode.id)
    : [];
  const connectedComponent = focusNode
    ? getConnectedComponent(resourceGraph, focusNode.id)
    : [];
  const radiusNodes = focusNode
    ? uniqueNodes([focusNode, ...upstream, ...downstream])
    : [];
  const directChangedNodes = radiusNodes.filter((node) => node.existsInPlanChange);
  const possiblyAffectedNodes = radiusNodes.filter(
    (node) => !node.existsInPlanChange,
  );
  const highRiskNodes = radiusNodes
    .filter(
      (node) => node.riskLevel !== "none" && isHighSeverity(node.riskLevel),
    )
    .sort(compareNodes);
  const orphanChangedNodes = detectOrphanChangedResources(resourceGraph);
  const dependencyCompleteness = buildDependencyCompleteness(
    normalizedPlan,
    resourceGraph,
    orphanChangedNodes,
  );
  const reviewerChecklist = buildReviewerChecklist(radiusNodes);

  const analysis: BlastRadiusAnalysis = {
    changedFocusOptions,
    connectedComponent,
    criticalPaths: buildCriticalPaths(resourceGraph, focusNode, upstream, downstream),
    dependencyCompleteness,
    directChangedNodes,
    downstream,
    focusAddress: focusNode?.id ?? null,
    focusNode,
    focusResourceChange,
    hasExplicitDependencies: resourceGraph.edges.length > 0,
    highRiskNodes,
    highestRiskSeverity: getHighestRiskSeverity(radiusNodes),
    markdownSummary: "",
    orphanChangedNodes,
    possiblyAffectedNodes,
    providerGroups: buildGroups(
      radiusNodes,
      (node) => node.provider,
      (key) => key,
    ),
    radiusNodeIds: radiusNodes.map((node) => node.id),
    radiusNodes,
    resourceGraph,
    resourceGroupGroups: buildGroups(
      radiusNodes,
      (node) => node.resourceGroup,
      (key) => RESOURCE_GROUP_LABELS[key as ResourceTypeGroup] ?? key,
    ),
    reviewerChecklist,
    upstream,
    moduleGroups: buildGroups(
      radiusNodes,
      (node) => node.module,
      (key) => key,
    ),
  };

  analysis.markdownSummary = buildMarkdownSummary(analysis);

  return analysis;
}
