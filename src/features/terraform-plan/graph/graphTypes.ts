import type { ChangeActionKind } from "@/features/terraform-plan/domain/actionTypes";
import type { ResourceTypeGroup } from "@/features/terraform-plan/domain/providerTypes";
import type { RiskSeverity } from "@/features/terraform-plan/risk/riskTypes";

export const ROOT_MODULE_ID = "root";
export const GRAPH_MODULE_PROVIDER = "terraform";

export const graphRelationshipTypes = [
  "depends_on",
  "expression_reference",
  "replace_path_related",
  "module_contains",
  "unknown",
] as const;

export type GraphRelationshipType = (typeof graphRelationshipTypes)[number];
export type GraphNodeRiskLevel = RiskSeverity | "none";
export type GraphNodeKind = "resource" | "module";

export interface GraphNodeMetadata extends Record<string, unknown> {
  kind: GraphNodeKind;
  address: string;
  mode?: string;
  fullProviderName?: string;
  providerConfigKey?: string;
  modulePath?: string[];
  depth?: number;
  sourceHints?: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  resourceType: string;
  provider: string;
  module: string;
  actionKind: ChangeActionKind;
  riskLevel: GraphNodeRiskLevel;
  resourceGroup: ResourceTypeGroup;
  existsInPlanChange: boolean;
  metadata: GraphNodeMetadata;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: GraphRelationshipType;
  evidence: string[];
  confidence: number;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
