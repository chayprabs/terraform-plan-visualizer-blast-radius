export const changeActionKinds = [
  "create",
  "update",
  "delete",
  "replace",
  "no-op",
  "read",
  "import",
  "forget",
  "unknown",
] as const;

export type ChangeActionKind = (typeof changeActionKinds)[number];

function sanitizeAction(action: string): string {
  return action.trim().toLowerCase();
}

export function normalizeAction(actions: string[]): ChangeActionKind {
  const normalizedActions = Array.from(
    new Set(actions.map(sanitizeAction).filter(Boolean)),
  );

  if (normalizedActions.length === 0) {
    return "unknown";
  }

  const actionSet = new Set(normalizedActions);

  if (actionSet.has("delete") && actionSet.has("create")) {
    return "replace";
  }

  if (actionSet.has("import")) {
    return normalizedActions.length === 1 ? "import" : "unknown";
  }

  if (actionSet.has("forget")) {
    return normalizedActions.length === 1 ? "forget" : "unknown";
  }

  if (normalizedActions.length !== 1) {
    return "unknown";
  }

  switch (normalizedActions[0]) {
    case "create":
      return "create";
    case "update":
      return "update";
    case "delete":
      return "delete";
    case "no-op":
      return "no-op";
    case "read":
      return "read";
    default:
      return "unknown";
  }
}
