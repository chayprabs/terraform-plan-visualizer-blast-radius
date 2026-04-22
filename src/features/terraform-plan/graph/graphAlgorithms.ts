import {
  ROOT_MODULE_ID,
  type DependencyGraph,
  type GraphNode,
  type GraphRelationshipType,
} from "@/features/terraform-plan/graph/graphTypes";

function sortNodes(left: GraphNode, right: GraphNode): number {
  return left.id.localeCompare(right.id);
}

function isTraversableRelationship(relationshipType: GraphRelationshipType): boolean {
  return relationshipType !== "module_contains";
}

function createNodeMap(graph: DependencyGraph): Map<string, GraphNode> {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

function collectReachableNodes(
  graph: DependencyGraph,
  startNodeId: string,
  direction: "incoming" | "outgoing" | "undirected",
): GraphNode[] {
  const nodeMap = createNodeMap(graph);

  if (!nodeMap.has(startNodeId)) {
    return [];
  }

  const visited = new Set<string>([startNodeId]);
  const queue = [startNodeId];

  while (queue.length > 0) {
    const currentNodeId = queue.shift();

    if (!currentNodeId) {
      continue;
    }

    for (const edge of graph.edges) {
      if (!isTraversableRelationship(edge.relationshipType)) {
        continue;
      }

      const nextNodeIds: string[] = [];

      if (direction === "incoming" && edge.target === currentNodeId) {
        nextNodeIds.push(edge.source);
      } else if (direction === "outgoing" && edge.source === currentNodeId) {
        nextNodeIds.push(edge.target);
      } else if (direction === "undirected") {
        if (edge.source === currentNodeId) {
          nextNodeIds.push(edge.target);
        }

        if (edge.target === currentNodeId) {
          nextNodeIds.push(edge.source);
        }
      }

      for (const nextNodeId of nextNodeIds) {
        if (visited.has(nextNodeId)) {
          continue;
        }

        visited.add(nextNodeId);
        queue.push(nextNodeId);
      }
    }
  }

  return Array.from(visited)
    .filter((nodeId) => nodeId !== startNodeId)
    .map((nodeId) => nodeMap.get(nodeId))
    .filter((node): node is GraphNode => Boolean(node))
    .sort(sortNodes);
}

export function getUpstreamDependencies(
  graph: DependencyGraph,
  nodeId: string,
): GraphNode[] {
  return collectReachableNodes(graph, nodeId, "incoming");
}

export function getDownstreamDependents(
  graph: DependencyGraph,
  nodeId: string,
): GraphNode[] {
  return collectReachableNodes(graph, nodeId, "outgoing");
}

export function getConnectedComponent(
  graph: DependencyGraph,
  nodeId: string,
): GraphNode[] {
  const nodeMap = createNodeMap(graph);
  const startingNode = nodeMap.get(nodeId);

  if (!startingNode) {
    return [];
  }

  return [startingNode, ...collectReachableNodes(graph, nodeId, "undirected")].sort(
    sortNodes,
  );
}

export function getBlastRadiusForResource(
  graph: DependencyGraph,
  nodeId: string,
): GraphNode[] {
  return getDownstreamDependents(graph, nodeId);
}

export function groupNodesByModule(
  graph: DependencyGraph,
): Record<string, GraphNode[]> {
  const groups: Record<string, GraphNode[]> = {};

  for (const node of graph.nodes) {
    const groupKey =
      node.metadata.kind === "module" ? node.id : node.module || ROOT_MODULE_ID;

    groups[groupKey] = [...(groups[groupKey] ?? []), node].sort(sortNodes);
  }

  return groups;
}

export function groupNodesByProvider(
  graph: DependencyGraph,
): Record<string, GraphNode[]> {
  const groups: Record<string, GraphNode[]> = {};

  for (const node of graph.nodes) {
    const groupKey = node.provider || "unknown";

    groups[groupKey] = [...(groups[groupKey] ?? []), node].sort(sortNodes);
  }

  return groups;
}

export function detectOrphanChangedResources(
  graph: DependencyGraph,
): GraphNode[] {
  const connectedNodeIds = new Set<string>();

  for (const edge of graph.edges) {
    if (!isTraversableRelationship(edge.relationshipType)) {
      continue;
    }

    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }

  return graph.nodes
    .filter(
      (node) =>
        node.metadata.kind === "resource" &&
        node.existsInPlanChange &&
        !connectedNodeIds.has(node.id),
    )
    .sort(sortNodes);
}
