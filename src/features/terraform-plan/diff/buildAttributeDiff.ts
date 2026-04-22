import type { TerraformReplacePath } from "@/features/terraform-plan/domain/terraformPlanTypes";
import type {
  AttributeDiffCounts,
  AttributeDiffResourceChange,
  AttributeDiffResult,
  AttributeDiffRow,
  BuildAttributeDiffOptions,
} from "@/features/terraform-plan/diff/attributeDiffTypes";

type PathSegment = number | string;

const DEFAULT_MAX_ARRAY_ITEMS = 25;
const DEFAULT_MAX_OBJECT_KEYS = 25;
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createCounts(): AttributeDiffCounts {
  return {
    added: 0,
    changed: 0,
    removed: 0,
    replacedPath: 0,
    sensitive: 0,
    unchanged: 0,
    unknown: 0,
  };
}

function clonePath(path: PathSegment[]): PathSegment[] {
  return [...path];
}

function normalizeRootValues(
  resourceChange: AttributeDiffResourceChange,
): Pick<
  AttributeDiffResourceChange,
  | "address"
  | "after"
  | "afterSensitive"
  | "afterUnknown"
  | "before"
  | "beforeSensitive"
  | "replacePaths"
> {
  return {
    address: resourceChange.address,
    after:
      resourceChange.action === "delete" && resourceChange.after === null
        ? undefined
        : resourceChange.after,
    afterSensitive: resourceChange.afterSensitive,
    afterUnknown: resourceChange.afterUnknown,
    before:
      resourceChange.action === "create" && resourceChange.before === null
        ? undefined
        : resourceChange.before,
    beforeSensitive: resourceChange.beforeSensitive,
    replacePaths: resourceChange.replacePaths,
  };
}

function areValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((entry, index) => areValuesEqual(entry, right[index]));
  }

  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();

    if (
      leftKeys.length !== rightKeys.length ||
      leftKeys.some((key, index) => key !== rightKeys[index])
    ) {
      return false;
    }

    return leftKeys.every((key) => areValuesEqual(left[key], right[key]));
  }

  return false;
}

function formatPath(path: PathSegment[]): string {
  if (path.length === 0) {
    return "root";
  }

  return path.reduce<string>((formatted, segment) => {
    if (typeof segment === "number") {
      return `${formatted}[${segment}]`;
    }

    if (formatted.length === 0) {
      return IDENTIFIER_PATTERN.test(segment)
        ? segment
        : `[${JSON.stringify(segment)}]`;
    }

    return IDENTIFIER_PATTERN.test(segment)
      ? `${formatted}.${segment}`
      : `${formatted}[${JSON.stringify(segment)}]`;
  }, "");
}

function getChildValue(value: unknown, segment: PathSegment): unknown {
  if (Array.isArray(value) && typeof segment === "number") {
    return value[segment];
  }

  if (isRecord(value) && typeof segment === "string") {
    return value[segment];
  }

  return undefined;
}

function hasChildValue(value: unknown, segment: PathSegment): boolean {
  if (Array.isArray(value) && typeof segment === "number") {
    return segment >= 0 && segment < value.length;
  }

  if (isRecord(value) && typeof segment === "string") {
    return Object.prototype.hasOwnProperty.call(value, segment);
  }

  return false;
}

function getCollectionLength(value: unknown): number {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (isRecord(value)) {
    return Object.keys(value).length;
  }

  return 0;
}

function isCompatibleArrayNode(...values: unknown[]): boolean {
  const definedValues = values.filter((value) => value !== undefined);

  return (
    definedValues.some((value) => Array.isArray(value)) &&
    definedValues.every((value) => Array.isArray(value))
  );
}

function isCompatibleObjectNode(...values: unknown[]): boolean {
  const definedValues = values.filter((value) => value !== undefined);

  return (
    definedValues.some((value) => isRecord(value)) &&
    definedValues.every((value) => isRecord(value))
  );
}

function getMaskChild(mask: unknown, segment: PathSegment): unknown {
  return getChildValue(mask, segment);
}

function isSensitiveMask(mask: unknown): boolean {
  return mask === true;
}

function createRow(
  resourceAddress: string,
  path: PathSegment[],
  row: Omit<AttributeDiffRow, "depth" | "id" | "path">,
): AttributeDiffRow {
  const formattedPath = formatPath(path);

  return {
    ...row,
    depth: path.length,
    id: `${resourceAddress}:${row.kind}:${formattedPath}:${row.note ?? ""}`,
    path: formattedPath,
  };
}

function createTruncatedRow(
  resourceAddress: string,
  path: PathSegment[],
  note: string,
): AttributeDiffRow {
  return createRow(resourceAddress, path, {
    afterPresent: false,
    afterSensitive: false,
    beforePresent: false,
    beforeSensitive: false,
    isTruncated: true,
    kind: "unchanged",
    note,
    unknownState: null,
  });
}

function getLeafKind(before: unknown, after: unknown): AttributeDiffRow["kind"] {
  if (before === undefined && after !== undefined) {
    return "added";
  }

  if (before !== undefined && after === undefined) {
    return "removed";
  }

  return areValuesEqual(before, after) ? "unchanged" : "changed";
}

function getValueAtPath(value: unknown, path: TerraformReplacePath): unknown {
  return path.reduce<unknown>((currentValue, segment) => {
    if (currentValue === undefined) {
      return undefined;
    }

    return getChildValue(currentValue, segment);
  }, value);
}

function isPathSensitive(mask: unknown, path: TerraformReplacePath): boolean {
  if (mask === true) {
    return true;
  }

  return path.some((_, index) => {
    const currentPath = path.slice(0, index + 1);
    const currentMask = currentPath.reduce<unknown>((currentValue, segment) => {
      if (currentValue === undefined || currentValue === true) {
        return currentValue;
      }

      return getMaskChild(currentValue, segment);
    }, mask);

    return currentMask === true;
  });
}

function buildReplacePathRows(
  resourceAddress: string,
  beforeValue: unknown,
  afterValue: unknown,
  beforeSensitive: unknown,
  afterSensitive: unknown,
  replacePaths: TerraformReplacePath[],
): AttributeDiffRow[] {
  return [...replacePaths]
    .map((path) => [...path])
    .sort((left, right) => formatPath(left).localeCompare(formatPath(right)))
    .map((path) => {
      const sensitive =
        isPathSensitive(beforeSensitive, path) ||
        isPathSensitive(afterSensitive, path);

      return createRow(resourceAddress, path, {
        afterPresent: getValueAtPath(afterValue, path) !== undefined,
        afterSensitive: sensitive,
        afterValue: sensitive ? undefined : getValueAtPath(afterValue, path),
        beforePresent: getValueAtPath(beforeValue, path) !== undefined,
        beforeSensitive: sensitive,
        beforeValue: sensitive ? undefined : getValueAtPath(beforeValue, path),
        kind: "replacedPath",
        note: "Terraform marked this path as forcing replacement.",
        unknownState: null,
      });
    });
}

function walkDiffTree(
  resourceAddress: string,
  rows: AttributeDiffRow[],
  path: PathSegment[],
  beforeValue: unknown,
  afterValue: unknown,
  afterUnknown: unknown,
  beforeSensitive: unknown,
  afterSensitive: unknown,
  options: Required<BuildAttributeDiffOptions>,
): void {
  const pathBeforeSensitive = isSensitiveMask(beforeSensitive);
  const pathAfterSensitive = isSensitiveMask(afterSensitive);

  if (pathBeforeSensitive || pathAfterSensitive) {
    rows.push(
      createRow(resourceAddress, path, {
        afterPresent: afterValue !== undefined,
        afterSensitive: pathAfterSensitive || pathBeforeSensitive,
        beforePresent: beforeValue !== undefined,
        beforeSensitive: pathBeforeSensitive || pathAfterSensitive,
        kind: "sensitive",
        note: "Terraform marked this value as sensitive, so raw values are redacted.",
        unknownState: null,
      }),
    );
    return;
  }

  if (typeof afterUnknown === "boolean") {
    rows.push(
      createRow(resourceAddress, path, {
        afterPresent: afterValue !== undefined || afterUnknown === false,
        afterSensitive: false,
        afterValue: afterUnknown ? undefined : afterValue,
        beforePresent: beforeValue !== undefined,
        beforeSensitive: false,
        beforeValue,
        kind: "unknown",
        note: afterUnknown
          ? "Terraform cannot fully resolve this value until apply."
          : "Terraform marked this path as known after apply.",
        unknownState: afterUnknown
          ? "unknown-after-apply"
          : "known-after-apply",
      }),
    );
    return;
  }

  const shouldWalkArray = isCompatibleArrayNode(
    beforeValue,
    afterValue,
    afterUnknown,
    beforeSensitive,
    afterSensitive,
  );
  const shouldWalkObject =
    !shouldWalkArray &&
    isCompatibleObjectNode(
      beforeValue,
      afterValue,
      afterUnknown,
      beforeSensitive,
      afterSensitive,
    );

  if (shouldWalkArray) {
    const lengths = [
      getCollectionLength(beforeValue),
      getCollectionLength(afterValue),
      getCollectionLength(afterUnknown),
      getCollectionLength(beforeSensitive),
      getCollectionLength(afterSensitive),
    ];
    const totalLength = Math.max(...lengths);
    const visibleLength = Math.min(totalLength, options.maxArrayItems);

    if (totalLength === 0) {
      rows.push(
        createRow(resourceAddress, path, {
          afterPresent: afterValue !== undefined,
          afterSensitive: false,
          afterValue,
          beforePresent: beforeValue !== undefined,
          beforeSensitive: false,
          beforeValue,
          kind: getLeafKind(beforeValue, afterValue),
          note: "Empty array.",
          unknownState: null,
        }),
      );
      return;
    }

    for (let index = 0; index < visibleLength; index += 1) {
      const childPath = [...path, index];

      walkDiffTree(
        resourceAddress,
        rows,
        childPath,
        hasChildValue(beforeValue, index)
          ? getChildValue(beforeValue, index)
          : undefined,
        hasChildValue(afterValue, index)
          ? getChildValue(afterValue, index)
          : undefined,
        hasChildValue(afterUnknown, index)
          ? getChildValue(afterUnknown, index)
          : undefined,
        hasChildValue(beforeSensitive, index)
          ? getMaskChild(beforeSensitive, index)
          : undefined,
        hasChildValue(afterSensitive, index)
          ? getMaskChild(afterSensitive, index)
          : undefined,
        options,
      );
    }

    if (totalLength > visibleLength) {
      rows.push(
        createTruncatedRow(
          resourceAddress,
          clonePath(path),
          `Additional ${totalLength - visibleLength} array items truncated.`,
        ),
      );
    }

    return;
  }

  if (shouldWalkObject) {
    const keySet = new Set<string>();

    for (const value of [
      beforeValue,
      afterValue,
      afterUnknown,
      beforeSensitive,
      afterSensitive,
    ]) {
      if (!isRecord(value)) {
        continue;
      }

      for (const key of Object.keys(value)) {
        keySet.add(key);
      }
    }

    const keys = [...keySet].sort();
    const visibleKeys = keys.slice(0, options.maxObjectKeys);

    if (keys.length === 0) {
      rows.push(
        createRow(resourceAddress, path, {
          afterPresent: afterValue !== undefined,
          afterSensitive: false,
          afterValue,
          beforePresent: beforeValue !== undefined,
          beforeSensitive: false,
          beforeValue,
          kind: getLeafKind(beforeValue, afterValue),
          note: "Empty object.",
          unknownState: null,
        }),
      );
      return;
    }

    for (const key of visibleKeys) {
      const childPath = [...path, key];

      walkDiffTree(
        resourceAddress,
        rows,
        childPath,
        hasChildValue(beforeValue, key)
          ? getChildValue(beforeValue, key)
          : undefined,
        hasChildValue(afterValue, key)
          ? getChildValue(afterValue, key)
          : undefined,
        hasChildValue(afterUnknown, key)
          ? getChildValue(afterUnknown, key)
          : undefined,
        hasChildValue(beforeSensitive, key)
          ? getMaskChild(beforeSensitive, key)
          : undefined,
        hasChildValue(afterSensitive, key)
          ? getMaskChild(afterSensitive, key)
          : undefined,
        options,
      );
    }

    if (keys.length > visibleKeys.length) {
      rows.push(
        createTruncatedRow(
          resourceAddress,
          clonePath(path),
          `Additional ${keys.length - visibleKeys.length} object keys truncated.`,
        ),
      );
    }

    return;
  }

  rows.push(
    createRow(resourceAddress, path, {
      afterPresent: afterValue !== undefined,
      afterSensitive: false,
      afterValue,
      beforePresent: beforeValue !== undefined,
      beforeSensitive: false,
      beforeValue,
      kind: getLeafKind(beforeValue, afterValue),
      unknownState: null,
    }),
  );
}

function buildCounts(rows: AttributeDiffRow[]): AttributeDiffCounts {
  return rows.reduce<AttributeDiffCounts>((counts, row) => {
    counts[row.kind] += 1;
    return counts;
  }, createCounts());
}

function buildChangedPaths(rows: AttributeDiffRow[]): string[] {
  return Array.from(
    new Set(
      rows
        .filter((row) => row.kind !== "unchanged" && !row.isTruncated)
        .map((row) => row.path),
    ),
  );
}

export function buildAttributeDiff(
  resourceChange: AttributeDiffResourceChange,
  options: BuildAttributeDiffOptions = {},
): AttributeDiffResult {
  const resolvedOptions: Required<BuildAttributeDiffOptions> = {
    maxArrayItems: options.maxArrayItems ?? DEFAULT_MAX_ARRAY_ITEMS,
    maxObjectKeys: options.maxObjectKeys ?? DEFAULT_MAX_OBJECT_KEYS,
  };
  const normalizedResource = normalizeRootValues(resourceChange);
  const rows = buildReplacePathRows(
    normalizedResource.address,
    normalizedResource.before,
    normalizedResource.after,
    normalizedResource.beforeSensitive,
    normalizedResource.afterSensitive,
    normalizedResource.replacePaths,
  );

  walkDiffTree(
    normalizedResource.address,
    rows,
    [],
    normalizedResource.before,
    normalizedResource.after,
    normalizedResource.afterUnknown,
    normalizedResource.beforeSensitive,
    normalizedResource.afterSensitive,
    resolvedOptions,
  );

  return {
    changedPaths: buildChangedPaths(rows),
    counts: buildCounts(rows),
    resourceAddress: normalizedResource.address,
    rows,
  };
}
