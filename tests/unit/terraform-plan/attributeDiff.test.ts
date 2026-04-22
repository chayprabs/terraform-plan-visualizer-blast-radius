import { describe, expect, it } from "vitest";
import { buildAttributeDiff } from "@/features/terraform-plan/diff/buildAttributeDiff";
import { formatDiffValue } from "@/features/terraform-plan/diff/formatDiffValue";
import type { AttributeDiffRow } from "@/features/terraform-plan/diff/attributeDiffTypes";
import type { AttributeDiffResourceChange } from "@/features/terraform-plan/diff/attributeDiffTypes";

function createResourceChange(
  overrides: Partial<AttributeDiffResourceChange> = {},
): AttributeDiffResourceChange {
  return {
    action: "update",
    address: "aws_security_group.web",
    after: undefined,
    afterSensitive: undefined,
    afterUnknown: undefined,
    before: undefined,
    beforeSensitive: undefined,
    replacePaths: [],
    ...overrides,
  };
}

function findRow(rows: AttributeDiffRow[], path: string): AttributeDiffRow {
  const row = rows.find((entry) => entry.path === path);

  if (!row) {
    throw new Error(`Missing diff row for ${path}`);
  }

  return row;
}

describe("buildAttributeDiff", () => {
  it("diffs nested objects with stable dot-paths", () => {
    const result = buildAttributeDiff(
      createResourceChange({
        after: {
          settings: {
            enabled: true,
          },
          tags: {
            Environment: "prod",
            Owner: "ops",
            Team: "platform",
          },
        },
        before: {
          settings: {
            enabled: true,
          },
          tags: {
            Environment: "dev",
            Owner: "ops",
          },
        },
      }),
    );

    expect(findRow(result.rows, "tags.Environment").kind).toBe("changed");
    expect(findRow(result.rows, "tags.Owner").kind).toBe("unchanged");
    expect(findRow(result.rows, "tags.Team").kind).toBe("added");
    expect(findRow(result.rows, "settings.enabled").kind).toBe("unchanged");
  });

  it("diffs arrays and null values with bracket paths", () => {
    const result = buildAttributeDiff(
      createResourceChange({
        after: {
          ingress: [
            {
              cidr_blocks: ["0.0.0.0/0"],
              description: "web",
            },
          ],
        },
        before: {
          ingress: [
            {
              cidr_blocks: ["10.0.0.0/24"],
              description: null,
            },
          ],
        },
      }),
    );

    const cidrRow = findRow(result.rows, "ingress[0].cidr_blocks[0]");
    const descriptionRow = findRow(result.rows, "ingress[0].description");

    expect(cidrRow.kind).toBe("changed");
    expect(descriptionRow.kind).toBe("changed");
    expect(descriptionRow.beforeValue).toBeNull();
    expect(descriptionRow.afterValue).toBe("web");
  });

  it("includes known and unknown after-apply rows", () => {
    const result = buildAttributeDiff(
      createResourceChange({
        after: {
          arn: "aws:generated",
          id: "new-id",
        },
        afterUnknown: {
          arn: true,
          id: false,
        },
        before: {
          id: "old-id",
        },
      }),
    );

    const arnRow = findRow(result.rows, "arn");
    const idRow = findRow(result.rows, "id");

    expect(arnRow.kind).toBe("unknown");
    expect(arnRow.unknownState).toBe("unknown-after-apply");
    expect(formatDiffValue(arnRow.afterValue, { unknownState: arnRow.unknownState })).toBe(
      "Unknown after apply",
    );

    expect(idRow.kind).toBe("unknown");
    expect(idRow.unknownState).toBe("known-after-apply");
    expect(formatDiffValue(idRow.afterValue, { unknownState: idRow.unknownState })).toBe(
      "Known after apply",
    );
  });

  it("redacts sensitive values and never stores raw secret strings in diff rows", () => {
    const result = buildAttributeDiff(
      createResourceChange({
        after: {
          policy: "new-bucket-policy",
        },
        afterSensitive: {
          policy: true,
        },
        before: {
          policy: "old-bucket-policy",
        },
        beforeSensitive: {
          policy: true,
        },
      }),
    );
    const policyRow = findRow(result.rows, "policy");
    const serializedRows = JSON.stringify(result.rows);

    expect(policyRow.kind).toBe("sensitive");
    expect(policyRow.beforeValue).toBeUndefined();
    expect(policyRow.afterValue).toBeUndefined();
    expect(serializedRows).not.toContain("old-bucket-policy");
    expect(serializedRows).not.toContain("new-bucket-policy");
    expect(
      formatDiffValue(policyRow.afterValue, { isSensitive: policyRow.afterSensitive }),
    ).toBe("[sensitive value]");
  });

  it("includes replace paths as dedicated high-visibility rows", () => {
    const result = buildAttributeDiff(
      createResourceChange({
        action: "replace",
        after: {
          tags: {
            Environment: "prod",
          },
        },
        before: {
          tags: {
            Environment: "dev",
          },
        },
        replacePaths: [["tags", "Environment"]],
      }),
    );
    const replaceRow = result.rows.find((row) => row.kind === "replacedPath");

    expect(replaceRow?.path).toBe("tags.Environment");
    expect(result.changedPaths).toContain("tags.Environment");
  });

  it("handles create and delete resources", () => {
    const createResult = buildAttributeDiff(
      createResourceChange({
        action: "create",
        after: {
          bucket: "assets",
        },
        before: null,
      }),
    );
    const deleteResult = buildAttributeDiff(
      createResourceChange({
        action: "delete",
        after: null,
        before: {
          bucket: "assets",
        },
      }),
    );

    expect(findRow(createResult.rows, "bucket").kind).toBe("added");
    expect(findRow(deleteResult.rows, "bucket").kind).toBe("removed");
  });
});
