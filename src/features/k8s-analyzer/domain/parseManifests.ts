import { parseAllDocuments } from "yaml";
import type {
  K8sManifestMetadata,
  K8sSpecHighlight,
  ParseManifestError,
  ParseManifestsResult,
  ParsedK8sManifest,
} from "@/features/k8s-analyzer/domain/manifestTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringMap(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function extractMetadata(document: Record<string, unknown>): K8sManifestMetadata {
  const metadata = isRecord(document.metadata) ? document.metadata : {};

  return {
    name: asString(metadata.name),
    namespace: asString(metadata.namespace),
    labels: asStringMap(metadata.labels),
    annotations: asStringMap(metadata.annotations),
  };
}

function pushHighlight(
  highlights: K8sSpecHighlight[],
  label: string,
  value: unknown,
): void {
  const normalized = asString(value);

  if (!normalized) {
    return;
  }

  highlights.push({ label, value: normalized });
}

function extractContainerHighlights(
  highlights: K8sSpecHighlight[],
  containers: unknown,
  prefix: string,
): void {
  if (!Array.isArray(containers)) {
    return;
  }

  for (const container of containers) {
    if (!isRecord(container)) {
      continue;
    }

    const name = asString(container.name) ?? "container";
    pushHighlight(highlights, `${prefix} container`, name);
    pushHighlight(highlights, `${prefix} image`, container.image);

    const resources = isRecord(container.resources) ? container.resources : null;
    const limits = resources && isRecord(resources.limits) ? resources.limits : null;

    if (limits) {
      const limitSummary = Object.entries(limits)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        .map(([key, entryValue]) => `${key}=${entryValue}`)
        .join(", ");

      if (limitSummary) {
        pushHighlight(highlights, `${prefix} limits`, limitSummary);
      }
    }

    const securityContext = isRecord(container.securityContext)
      ? container.securityContext
      : null;

    if (securityContext?.privileged === true) {
      pushHighlight(highlights, `${prefix} privileged`, "true");
    }
  }
}

function extractPodSpecHighlights(
  highlights: K8sSpecHighlight[],
  podSpec: Record<string, unknown> | null,
  prefix: string,
): void {
  if (!podSpec) {
    return;
  }

  extractContainerHighlights(highlights, podSpec.containers, prefix);
  extractContainerHighlights(highlights, podSpec.initContainers, `${prefix} init`);

  const podSecurityContext = isRecord(podSpec.securityContext)
    ? podSpec.securityContext
    : null;

  if (podSecurityContext?.privileged === true) {
    pushHighlight(highlights, `${prefix} pod privileged`, "true");
  }

  if (Array.isArray(podSpec.volumes)) {
    for (const volume of podSpec.volumes) {
      if (!isRecord(volume)) {
        continue;
      }

      const volumeName = asString(volume.name) ?? "volume";
      const hostPath = isRecord(volume.hostPath) ? volume.hostPath : null;

      if (hostPath) {
        pushHighlight(
          highlights,
          `${prefix} hostPath`,
          `${volumeName}:${asString(hostPath.path) ?? "(no path)"}`,
        );
      }
    }
  }
}

function extractWorkloadPodSpec(
  document: Record<string, unknown>,
): Record<string, unknown> | null {
  const spec = isRecord(document.spec) ? document.spec : null;

  if (!spec) {
    return null;
  }

  const template = isRecord(spec.template) ? spec.template : null;
  const templateSpec =
    template && isRecord(template.spec) ? template.spec : null;

  if (templateSpec) {
    return templateSpec;
  }

  if (isRecord(spec.jobTemplate)) {
    const jobTemplate = spec.jobTemplate;
    const jobSpec =
      isRecord(jobTemplate.spec) && isRecord(jobTemplate.spec.template)
        ? jobTemplate.spec.template
        : null;
    const jobPodSpec =
      jobSpec && isRecord(jobSpec.spec) ? jobSpec.spec : null;

    if (jobPodSpec) {
      return jobPodSpec;
    }
  }

  return spec;
}

function extractSpecHighlights(document: Record<string, unknown>): K8sSpecHighlight[] {
  const highlights: K8sSpecHighlight[] = [];
  const kind = asString(document.kind) ?? "Unknown";
  const spec = isRecord(document.spec) ? document.spec : null;

  const roleRef =
    (spec && isRecord(spec.roleRef) ? spec.roleRef : null) ??
    (isRecord(document.roleRef) ? document.roleRef : null);

  if (spec) {
    pushHighlight(highlights, "replicas", spec.replicas);
    pushHighlight(highlights, "service type", spec.type);

    if (roleRef) {
      pushHighlight(highlights, "roleRef kind", roleRef.kind);
      pushHighlight(highlights, "roleRef name", roleRef.name);
    }

    const rules = Array.isArray(spec.rules) ? spec.rules.length : null;

    if (rules !== null) {
      pushHighlight(highlights, "rule count", String(rules));
    }
  }

  if (kind === "Pod") {
    extractPodSpecHighlights(
      highlights,
      extractWorkloadPodSpec(document),
      metadataLabel(document),
    );
  } else {
    extractPodSpecHighlights(
      highlights,
      extractWorkloadPodSpec(document),
      kind,
    );
  }

  return highlights;
}

function metadataLabel(document: Record<string, unknown>): string {
  const metadata = isRecord(document.metadata) ? document.metadata : null;
  return asString(metadata?.name) ?? "pod";
}

function toManifest(
  document: unknown,
  documentIndex: number,
): ParsedK8sManifest | ParseManifestError {
  if (!isRecord(document)) {
    return {
      documentIndex,
      message: "Document must be a YAML mapping.",
    };
  }

  const kind = asString(document.kind);
  const apiVersion = asString(document.apiVersion);

  if (!kind) {
    return {
      documentIndex,
      message: "Missing required field: kind.",
    };
  }

  if (!apiVersion) {
    return {
      documentIndex,
      message: "Missing required field: apiVersion.",
    };
  }

  return {
    documentIndex,
    kind,
    apiVersion,
    metadata: extractMetadata(document),
    specHighlights: extractSpecHighlights(document),
    document,
  };
}

export function parseManifests(input: string): ParseManifestsResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { manifests: [], errors: [] };
  }

  const manifests: ParsedK8sManifest[] = [];
  const errors: ParseManifestError[] = [];

  try {
    const documents = parseAllDocuments(trimmed, {
      prettyErrors: true,
      uniqueKeys: false,
    });

    if (documents.length === 0) {
      return { manifests: [], errors: [] };
    }

    documents.forEach((document, documentIndex) => {
      const value = document.toJSON();

      if (value === null || value === undefined) {
        return;
      }

      const parsed = toManifest(value, documentIndex);

      if ("message" in parsed) {
        errors.push(parsed);
        return;
      }

      manifests.push(parsed);
    });
  } catch (error) {
    errors.push({
      documentIndex: 0,
      message:
        error instanceof Error ? error.message : "Unable to parse YAML input.",
    });
  }

  return { manifests, errors };
}
