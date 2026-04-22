import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import { getModulePath } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import {
  getProviderShortName,
  getResourceTypeGroup,
} from "@/features/terraform-plan/domain/providerTypes";
import type {
  TerraformConfiguration,
  TerraformConfigurationModule,
  TerraformConfigurationResource,
  TerraformPlan,
  TerraformStateModule,
  TerraformStateResource,
} from "@/features/terraform-plan/domain/terraformPlanTypes";
import {
  extractReferencesFromConfigurationExpressions,
  normalizeTerraformReference,
} from "@/features/terraform-plan/graph/referenceExtraction";
import {
  GRAPH_MODULE_PROVIDER,
  ROOT_MODULE_ID,
  type DependencyGraph,
  type GraphEdge,
  type GraphNode,
  type GraphNodeMetadata,
  type GraphNodeRiskLevel,
  type GraphRelationshipType,
} from "@/features/terraform-plan/graph/graphTypes";

interface ParsedResourceAddress {
  resourceType: string;
  label: string;
  mode: string;
  moduleAddress: string;
}

interface EdgeSeed {
  source: string;
  target: string;
  relationshipType: GraphRelationshipType;
  evidence: string;
  confidence: number;
}

function sortNodes(left: GraphNode, right: GraphNode): number {
  return left.id.localeCompare(right.id);
}

function sortEdges(left: GraphEdge, right: GraphEdge): number {
  return (
    left.source.localeCompare(right.source) ||
    left.target.localeCompare(right.target) ||
    left.relationshipType.localeCompare(right.relationshipType)
  );
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function splitTerraformAddress(address: string): string[] {
  const segments: string[] = [];
  let current = "";
  let bracketDepth = 0;

  for (const character of address) {
    if (character === "." && bracketDepth === 0) {
      if (current.length > 0) {
        segments.push(current);
      }

      current = "";
      continue;
    }

    if (character === "[") {
      bracketDepth += 1;
    } else if (character === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
    }

    current += character;
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}

function inferProviderFromResourceType(resourceType: string): string {
  const providerPrefix = resourceType.split("_").filter(Boolean)[0] ?? "";

  return providerPrefix || "unknown";
}

function resolveProviderShortName(
  providerName: string | undefined,
  resourceType: string,
): string {
  const shortName = getProviderShortName(providerName);

  return shortName === "unknown"
    ? inferProviderFromResourceType(resourceType)
    : shortName;
}

function parseResourceAddress(address: string): ParsedResourceAddress | null {
  const segments = splitTerraformAddress(address);
  let cursor = 0;

  while (
    segments[cursor] === "module" &&
    typeof segments[cursor + 1] === "string"
  ) {
    cursor += 2;
  }

  const moduleAddress = buildModuleAddress(address);

  if (cursor >= segments.length) {
    return null;
  }

  if (segments[cursor] === "data") {
    const resourceType = segments[cursor + 1];
    const resourceName = segments[cursor + 2];

    if (!resourceType || !resourceName) {
      return null;
    }

    return {
      resourceType,
      label: `data.${resourceType}.${resourceName}`,
      mode: "data",
      moduleAddress,
    };
  }

  const resourceType = segments[cursor];
  const resourceName = segments[cursor + 1];

  if (!resourceType || !resourceName) {
    return null;
  }

  return {
    resourceType,
    label: `${resourceType}.${resourceName}`,
    mode: "managed",
    moduleAddress,
  };
}

function buildModuleAddress(address: string): string {
  const modulePath = getModulePath(address);

  if (modulePath.length === 0) {
    return ROOT_MODULE_ID;
  }

  return modulePath.map((segment) => `module.${segment}`).join(".");
}

function getParentModuleAddress(moduleAddress: string): string | null {
  if (moduleAddress === ROOT_MODULE_ID) {
    return null;
  }

  const modulePath = getModulePath(moduleAddress);

  if (modulePath.length <= 1) {
    return ROOT_MODULE_ID;
  }

  return modulePath
    .slice(0, -1)
    .map((segment) => `module.${segment}`)
    .join(".");
}

function isModuleAddress(address: string): boolean {
  if (address === ROOT_MODULE_ID) {
    return true;
  }

  const parsed = parseResourceAddress(address);

  return parsed === null && address.startsWith("module.");
}

function createModuleNode(moduleAddress: string): GraphNode {
  const modulePath = getModulePath(moduleAddress);
  const label =
    moduleAddress === ROOT_MODULE_ID
      ? ROOT_MODULE_ID
      : modulePath.at(-1)?.replace(/\[.*\]$/, "") ?? moduleAddress;
  const parentModuleAddress = getParentModuleAddress(moduleAddress) ?? ROOT_MODULE_ID;
  const metadata: GraphNodeMetadata = {
    kind: "module",
    address: moduleAddress,
    depth: modulePath.length,
    modulePath,
    sourceHints: ["module-address"],
  };

  return {
    id: moduleAddress,
    label,
    resourceType: "module",
    provider: GRAPH_MODULE_PROVIDER,
    module: parentModuleAddress,
    actionKind: "no-op",
    riskLevel: "none",
    resourceGroup: "unknown",
    existsInPlanChange: false,
    metadata,
  };
}

function mergeNodeMetadata(
  existing: GraphNodeMetadata,
  incoming: GraphNodeMetadata,
): GraphNodeMetadata {
  return {
    ...existing,
    ...incoming,
    modulePath: incoming.modulePath ?? existing.modulePath,
    sourceHints: uniqueStrings([
      ...(existing.sourceHints ?? []),
      ...(incoming.sourceHints ?? []),
    ]),
  };
}

function mergeGraphNode(existing: GraphNode, incoming: GraphNode): GraphNode {
  return {
    ...existing,
    ...incoming,
    label: existing.label === existing.id ? incoming.label : existing.label,
    provider: existing.provider === "unknown" ? incoming.provider : existing.provider,
    actionKind:
      existing.existsInPlanChange && !incoming.existsInPlanChange
        ? existing.actionKind
        : incoming.actionKind,
    riskLevel:
      existing.riskLevel !== "none" && incoming.riskLevel === "none"
        ? existing.riskLevel
        : incoming.riskLevel,
    existsInPlanChange: existing.existsInPlanChange || incoming.existsInPlanChange,
    metadata: mergeNodeMetadata(existing.metadata, incoming.metadata),
  };
}

function createResourceNode(
  address: string,
  overrides: Omit<
    Partial<GraphNode>,
    "label" | "metadata" | "module" | "provider" | "resourceType"
  > & {
    resourceType?: string;
    provider?: string;
    label?: string;
    module?: string;
    mode?: string;
    metadata?: Partial<GraphNodeMetadata>;
  } = {},
): GraphNode {
  const parsed = parseResourceAddress(address);
  const resourceType = overrides.resourceType ?? parsed?.resourceType ?? "unknown";
  const moduleAddress = overrides.module ?? parsed?.moduleAddress ?? buildModuleAddress(address);
  const metadata: GraphNodeMetadata = {
    kind: "resource",
    address,
    mode: overrides.mode ?? parsed?.mode,
    modulePath: getModulePath(address),
    sourceHints: uniqueStrings(overrides.metadata?.sourceHints ?? ["placeholder"]),
    ...(overrides.metadata ?? {}),
  };

  return {
    id: address,
    label: overrides.label ?? parsed?.label ?? address,
    resourceType,
    provider:
      overrides.provider && overrides.provider !== "unknown"
        ? overrides.provider
        : inferProviderFromResourceType(resourceType),
    module: moduleAddress,
    actionKind: overrides.actionKind ?? "unknown",
    riskLevel: overrides.riskLevel ?? "none",
    resourceGroup: overrides.resourceGroup ?? getResourceTypeGroup(resourceType),
    existsInPlanChange: overrides.existsInPlanChange ?? false,
    metadata,
  };
}

function resolveConfigurationProviderName(
  configuration: TerraformConfiguration | null | undefined,
  providerConfigKey?: string,
): string | undefined {
  if (!configuration || !providerConfigKey) {
    return undefined;
  }

  const providerConfig = configuration.provider_config?.[providerConfigKey];

  return providerConfig?.full_name ?? providerConfig?.name;
}

function createEdgeId(
  source: string,
  target: string,
  relationshipType: GraphRelationshipType,
): string {
  return `${relationshipType}:${source}->${target}`;
}

export function extractDependencyGraph(plan: TerraformPlan): DependencyGraph {
  const normalizedPlan = normalizeTerraformPlan(plan);
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();

  function upsertNode(node: GraphNode): void {
    const existing = nodeMap.get(node.id);

    nodeMap.set(node.id, existing ? mergeGraphNode(existing, node) : node);
  }

  function ensureAddressNode(address: string): void {
    if (isModuleAddress(address)) {
      upsertNode(createModuleNode(address));
      return;
    }

    upsertNode(createResourceNode(address));
  }

  function addEdge(seed: EdgeSeed): void {
    const sourceAddress = normalizeTerraformReference(seed.source) ?? seed.source;
    const targetAddress = normalizeTerraformReference(seed.target) ?? seed.target;

    if (!sourceAddress || !targetAddress || sourceAddress === targetAddress) {
      return;
    }

    ensureAddressNode(sourceAddress);
    ensureAddressNode(targetAddress);

    const edgeId = createEdgeId(
      sourceAddress,
      targetAddress,
      seed.relationshipType,
    );
    const existing = edgeMap.get(edgeId);

    if (!existing) {
      edgeMap.set(edgeId, {
        id: edgeId,
        source: sourceAddress,
        target: targetAddress,
        relationshipType: seed.relationshipType,
        evidence: [seed.evidence],
        confidence: seed.confidence,
      });

      return;
    }

    edgeMap.set(edgeId, {
      ...existing,
      evidence: uniqueStrings([...existing.evidence, seed.evidence]),
      confidence: Math.max(existing.confidence, seed.confidence),
    });
  }

  function addDependsOnEdges(
    dependentAddress: string,
    dependencies: string[] | null | undefined,
    evidencePrefix: string,
  ): void {
    for (const dependencyAddress of dependencies ?? []) {
      addEdge({
        source: dependencyAddress,
        target: dependentAddress,
        relationshipType: "depends_on",
        evidence: `${evidencePrefix}.depends_on`,
        confidence: 1,
      });
    }
  }

  function visitStateModule(
    module: TerraformStateModule | null | undefined,
    evidencePrefix: string,
  ): void {
    if (!module) {
      return;
    }

    for (const resource of module.resources ?? []) {
      visitStateResource(resource, evidencePrefix);
    }

    for (const childModule of module.child_modules ?? []) {
      visitStateModule(childModule, evidencePrefix);
    }
  }

  function visitStateResource(
    resource: TerraformStateResource,
    evidencePrefix: string,
  ): void {
    if (!resource.address || !resource.type) {
      return;
    }

    upsertNode(
      createResourceNode(resource.address, {
        label: `${resource.type}.${resource.name ?? resource.address}`,
        resourceType: resource.type,
        provider: resolveProviderShortName(resource.provider_name, resource.type),
        module: buildModuleAddress(resource.address),
        actionKind: "no-op",
        resourceGroup: getResourceTypeGroup(resource.type),
        metadata: {
          sourceHints: ["planned_values"],
          fullProviderName: resource.provider_name,
        },
      }),
    );

    addDependsOnEdges(
      resource.address,
      resource.depends_on,
      `${evidencePrefix}.${resource.address}`,
    );
  }

  function visitConfigurationModule(
    module: TerraformConfigurationModule | null | undefined,
    configuration: TerraformConfiguration | null | undefined,
    evidencePrefix: string,
  ): void {
    if (!module) {
      return;
    }

    for (const resource of module.resources ?? []) {
      visitConfigurationResource(resource, configuration, evidencePrefix);
    }

    for (const childModule of module.child_modules ?? []) {
      visitConfigurationModule(childModule, configuration, evidencePrefix);
    }
  }

  function visitConfigurationResource(
    resource: TerraformConfigurationResource,
    configuration: TerraformConfiguration | null | undefined,
    evidencePrefix: string,
  ): void {
    if (!resource.address || !resource.type) {
      return;
    }

    const fullProviderName = resolveConfigurationProviderName(
      configuration,
      resource.provider_config_key,
    );

    upsertNode(
      createResourceNode(resource.address, {
        label: `${resource.type}.${resource.name ?? resource.address}`,
        resourceType: resource.type,
        provider: resolveProviderShortName(fullProviderName, resource.type),
        module: buildModuleAddress(resource.address),
        actionKind: "no-op",
        resourceGroup: getResourceTypeGroup(resource.type),
        metadata: {
          sourceHints: ["configuration"],
          fullProviderName,
          providerConfigKey: resource.provider_config_key,
        },
      }),
    );

    addDependsOnEdges(
      resource.address,
      resource.depends_on,
      `${evidencePrefix}.${resource.address}`,
    );

    for (const referenceAddress of extractReferencesFromConfigurationExpressions(
      resource.expressions,
    )) {
      addEdge({
        source: referenceAddress,
        target: resource.address,
        relationshipType: "expression_reference",
        evidence: `${evidencePrefix}.${resource.address}.expressions`,
        confidence: 0.8,
      });
    }
  }

  upsertNode(createModuleNode(ROOT_MODULE_ID));

  visitStateModule(plan.planned_values?.root_module, "planned_values.root_module");
  visitConfigurationModule(
    plan.configuration?.root_module,
    plan.configuration,
    "configuration.root_module",
  );

  for (const resourceChange of normalizedPlan.resourceChanges) {
    upsertNode(
      createResourceNode(resourceChange.address, {
        label: `${resourceChange.type}.${resourceChange.name}`,
        resourceType: resourceChange.type,
        provider:
          resourceChange.providerShortName === "unknown"
            ? inferProviderFromResourceType(resourceChange.type)
            : resourceChange.providerShortName,
        module: resourceChange.moduleAddress ?? ROOT_MODULE_ID,
        actionKind: resourceChange.action,
        riskLevel:
          (resourceChange.riskSummary?.highestSeverity as GraphNodeRiskLevel | null) ??
          "none",
        resourceGroup: resourceChange.typeGroup,
        existsInPlanChange: true,
        mode: resourceChange.mode,
        metadata: {
          sourceHints: ["resource_changes"],
          fullProviderName: resourceChange.providerName,
          previousAddress: resourceChange.previousAddress ?? undefined,
          replacePaths: resourceChange.replacePaths,
          deposed: resourceChange.deposed ?? undefined,
        },
      }),
    );
  }

  for (const node of Array.from(nodeMap.values())) {
    if (node.metadata.kind === "module") {
      const parentModuleAddress = getParentModuleAddress(node.id);

      if (parentModuleAddress) {
        ensureAddressNode(parentModuleAddress);
      }

      continue;
    }

    ensureAddressNode(node.module);
  }

  for (const node of Array.from(nodeMap.values())) {
    if (node.metadata.kind === "module") {
      const parentModuleAddress = getParentModuleAddress(node.id);

      if (parentModuleAddress) {
        addEdge({
          source: parentModuleAddress,
          target: node.id,
          relationshipType: "module_contains",
          evidence: `module-hierarchy:${node.id}`,
          confidence: 1,
        });
      }

      continue;
    }

    addEdge({
      source: node.module,
      target: node.id,
      relationshipType: "module_contains",
      evidence: `module-hierarchy:${node.id}`,
      confidence: 1,
    });
  }

  return {
    nodes: Array.from(nodeMap.values()).sort(sortNodes),
    edges: Array.from(edgeMap.values()).sort(sortEdges),
  };
}
