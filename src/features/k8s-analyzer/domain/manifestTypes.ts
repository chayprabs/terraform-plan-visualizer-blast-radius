export interface K8sManifestMetadata {
  name?: string;
  namespace?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface K8sSpecHighlight {
  label: string;
  value: string;
}

export interface ParsedK8sManifest {
  documentIndex: number;
  kind: string;
  apiVersion: string;
  metadata: K8sManifestMetadata;
  specHighlights: K8sSpecHighlight[];
  /** Normalized document for risk rules (metadata + spec + kind + apiVersion). */
  document: Record<string, unknown>;
}

export interface ParseManifestError {
  documentIndex: number;
  message: string;
}

export interface ParseManifestsResult {
  manifests: ParsedK8sManifest[];
  errors: ParseManifestError[];
}

export function getManifestRef(manifest: ParsedK8sManifest): string {
  const name = manifest.metadata.name ?? `doc-${manifest.documentIndex + 1}`;
  const namespace = manifest.metadata.namespace;

  if (namespace) {
    return `${manifest.kind}/${namespace}/${name}`;
  }

  return `${manifest.kind}/${name}`;
}
