import type { NormalizedResourceChange } from "@/features/terraform-plan/domain/normalizedPlanTypes";

export type AttributeDiffKind =
  | "added"
  | "removed"
  | "changed"
  | "unchanged"
  | "unknown"
  | "sensitive"
  | "replacedPath";

export type AttributeDiffUnknownState =
  | "known-after-apply"
  | "unknown-after-apply"
  | null;

export interface AttributeDiffRow {
  afterPresent: boolean;
  afterSensitive: boolean;
  afterValue?: unknown;
  beforePresent: boolean;
  beforeSensitive: boolean;
  beforeValue?: unknown;
  depth: number;
  id: string;
  isTruncated?: boolean;
  kind: AttributeDiffKind;
  note?: string;
  path: string;
  unknownState: AttributeDiffUnknownState;
}

export interface AttributeDiffCounts {
  added: number;
  changed: number;
  removed: number;
  replacedPath: number;
  sensitive: number;
  unchanged: number;
  unknown: number;
}

export interface AttributeDiffResult {
  changedPaths: string[];
  counts: AttributeDiffCounts;
  resourceAddress: string;
  rows: AttributeDiffRow[];
}

export interface BuildAttributeDiffOptions {
  maxArrayItems?: number;
  maxObjectKeys?: number;
}

export type AttributeDiffResourceChange = Pick<
  NormalizedResourceChange,
  | "action"
  | "address"
  | "after"
  | "afterSensitive"
  | "afterUnknown"
  | "before"
  | "beforeSensitive"
  | "replacePaths"
>;
