import {
  DEFAULT_COST_CURRENCY,
  EXPECTED_INFRACOST_SOURCE_COPY,
  type ImportedCostResourceEntry,
  type ParseInfracostReportResult,
  type ParsedInfracostReport,
} from "@/features/terraform-plan/cost/costTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(
  record: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value
    .trim()
    .replaceAll(",", "")
    .replace(/[^\d.+-]+/g, "");

  if (!normalizedValue || normalizedValue === "." || normalizedValue === "-" || normalizedValue === "+") {
    return null;
  }

  const parsedValue = Number.parseFloat(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getNumberValue(
  record: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const parsedValue = parseNumber(record[key]);

    if (parsedValue !== null) {
      return parsedValue;
    }
  }

  return null;
}

function looksLikeTerraformPlanJson(value: Record<string, unknown>): boolean {
  return (
    Array.isArray(value.resource_changes) ||
    isRecord(value.planned_values) ||
    isRecord(value.configuration)
  );
}

function collectProjectRecords(
  value: Record<string, unknown>,
): Record<string, unknown>[] {
  if (Array.isArray(value.projects)) {
    return value.projects.filter(isRecord);
  }

  if (
    Array.isArray(value.resources) ||
    (isRecord(value.breakdown) && Array.isArray(value.breakdown.resources))
  ) {
    return [value];
  }

  return [];
}

function buildImportedEntry(
  resource: Record<string, unknown>,
  projectName: string | null,
  defaultCurrency: string,
  index: number,
): ImportedCostResourceEntry | null {
  const metadata = isRecord(resource.metadata) ? resource.metadata : {};
  const address =
    getStringValue(metadata, [
      "address",
      "resourceAddress",
      "terraformAddress",
      "resource",
    ]) ?? getStringValue(resource, ["address", "resourceAddress"]);
  const name =
    getStringValue(resource, ["name"]) ??
    getStringValue(metadata, ["name", "resourceName", "displayName"]);
  const monthlyCostBefore =
    getNumberValue(resource, [
      "pastMonthlyCost",
      "previousMonthlyCost",
      "monthlyCostBefore",
      "beforeMonthlyCost",
    ]) ??
    getNumberValue(metadata, [
      "pastMonthlyCost",
      "previousMonthlyCost",
      "monthlyCostBefore",
      "beforeMonthlyCost",
    ]);
  const monthlyCostAfter =
    getNumberValue(resource, [
      "monthlyCost",
      "monthlyCostAfter",
      "afterMonthlyCost",
    ]) ??
    getNumberValue(metadata, [
      "monthlyCost",
      "monthlyCostAfter",
      "afterMonthlyCost",
    ]);
  const monthlyDelta =
    getNumberValue(resource, [
      "diffMonthlyCost",
      "monthlyDelta",
      "monthlyCostDiff",
      "diff",
    ]) ??
    (monthlyCostBefore !== null && monthlyCostAfter !== null
      ? monthlyCostAfter - monthlyCostBefore
      : null);

  if (
    address === null &&
    name === null &&
    monthlyCostBefore === null &&
    monthlyCostAfter === null &&
    monthlyDelta === null
  ) {
    return null;
  }

  return {
    address,
    currency:
      getStringValue(resource, ["currency"]) ??
      getStringValue(metadata, ["currency"]) ??
      defaultCurrency,
    id: `${projectName ?? "project"}:${address ?? name ?? index}`,
    monthlyCostAfter,
    monthlyCostBefore,
    monthlyDelta,
    name,
    projectName,
    source: "infracost",
  };
}

function getProjectTotals(project: Record<string, unknown>) {
  const breakdown = isRecord(project.breakdown) ? project.breakdown : {};
  const monthlyCostBefore =
    getNumberValue(project, [
      "pastTotalMonthlyCost",
      "previousTotalMonthlyCost",
      "totalMonthlyCostBefore",
    ]) ??
    getNumberValue(breakdown, [
      "pastTotalMonthlyCost",
      "previousTotalMonthlyCost",
      "totalMonthlyCostBefore",
    ]);
  const monthlyCostAfter =
    getNumberValue(project, [
      "totalMonthlyCost",
      "totalMonthlyCostAfter",
    ]) ??
    getNumberValue(breakdown, [
      "totalMonthlyCost",
      "totalMonthlyCostAfter",
    ]);
  const monthlyDelta =
    getNumberValue(project, [
      "diffTotalMonthlyCost",
      "totalMonthlyDelta",
      "monthlyCostDiff",
    ]) ??
    getNumberValue(breakdown, [
      "diffTotalMonthlyCost",
      "totalMonthlyDelta",
      "monthlyCostDiff",
    ]) ??
    (monthlyCostBefore !== null && monthlyCostAfter !== null
      ? monthlyCostAfter - monthlyCostBefore
      : null);

  return {
    monthlyCostAfter,
    monthlyCostBefore,
    monthlyDelta,
  };
}

function sumNullableNumbers(values: Array<number | null>): number | null {
  const numericValues = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );

  if (numericValues.length === 0) {
    return null;
  }

  return numericValues.reduce((total, value) => total + value, 0);
}

export function parseInfracostReportValue(
  value: unknown,
): ParseInfracostReportResult {
  if (!isRecord(value)) {
    return {
      expectedSourceCopy: EXPECTED_INFRACOST_SOURCE_COPY,
      message: "This JSON is not an object that looks like an Infracost report.",
      ok: false,
    };
  }

  if (looksLikeTerraformPlanJson(value)) {
    return {
      expectedSourceCopy: EXPECTED_INFRACOST_SOURCE_COPY,
      message: "This looks like Terraform plan JSON rather than Infracost JSON.",
      ok: false,
    };
  }

  const projects = collectProjectRecords(value);

  if (projects.length === 0) {
    return {
      expectedSourceCopy: EXPECTED_INFRACOST_SOURCE_COPY,
      message:
        "We could not find any Infracost projects or resource breakdowns in this JSON.",
      ok: false,
    };
  }

  const defaultCurrency =
    getStringValue(value, ["currency"]) ?? DEFAULT_COST_CURRENCY;
  const entries: ImportedCostResourceEntry[] = [];
  const totalBeforeParts: Array<number | null> = [];
  const totalAfterParts: Array<number | null> = [];
  const totalDeltaParts: Array<number | null> = [];

  for (const project of projects) {
    const breakdown = isRecord(project.breakdown) ? project.breakdown : {};
    const resources = Array.isArray(breakdown.resources)
      ? breakdown.resources
      : Array.isArray(project.resources)
        ? project.resources
        : [];
    const projectName = getStringValue(project, ["name", "projectName"]);
    const projectCurrency =
      getStringValue(project, ["currency"]) ??
      getStringValue(breakdown, ["currency"]) ??
      defaultCurrency;
    const projectTotals = getProjectTotals(project);

    totalBeforeParts.push(projectTotals.monthlyCostBefore);
    totalAfterParts.push(projectTotals.monthlyCostAfter);
    totalDeltaParts.push(projectTotals.monthlyDelta);

    resources
      .filter(isRecord)
      .map((resource, index) =>
        buildImportedEntry(resource, projectName, projectCurrency, index),
      )
      .forEach((entry) => {
        if (entry) {
          entries.push(entry);
        }
      });
  }

  const report: ParsedInfracostReport = {
    currency: defaultCurrency,
    entries,
    totalMonthlyCostAfter:
      sumNullableNumbers(totalAfterParts) ??
      sumNullableNumbers(entries.map((entry) => entry.monthlyCostAfter)),
    totalMonthlyCostBefore:
      sumNullableNumbers(totalBeforeParts) ??
      sumNullableNumbers(entries.map((entry) => entry.monthlyCostBefore)),
    totalMonthlyDelta:
      sumNullableNumbers(totalDeltaParts) ??
      sumNullableNumbers(entries.map((entry) => entry.monthlyDelta)),
    warnings: [],
  };

  if (
    report.entries.length === 0 &&
    report.totalMonthlyCostBefore === null &&
    report.totalMonthlyCostAfter === null &&
    report.totalMonthlyDelta === null
  ) {
    return {
      expectedSourceCopy: EXPECTED_INFRACOST_SOURCE_COPY,
      message:
        "This Infracost JSON did not include resource costs or total monthly costs we could read.",
      ok: false,
    };
  }

  return {
    ok: true,
    report,
  };
}

export function parseInfracostReportJson(
  value: string,
): ParseInfracostReportResult {
  try {
    return parseInfracostReportValue(JSON.parse(value) as unknown);
  } catch {
    return {
      expectedSourceCopy: EXPECTED_INFRACOST_SOURCE_COPY,
      message: "We could not parse that text as JSON.",
      ok: false,
    };
  }
}
