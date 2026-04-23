import type { RiskSeverity } from "@/features/terraform-plan/risk/riskTypes";
import {
  DEFAULT_COST_CURRENCY,
  type CostThresholds,
} from "@/features/terraform-plan/cost/costTypes";

function normalizeCurrency(currency?: string | null): string {
  return currency?.trim().toUpperCase() || DEFAULT_COST_CURRENCY;
}

export function formatCurrencyAmount(
  value: number | null,
  currency: string = DEFAULT_COST_CURRENCY,
): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }

  const normalizedCurrency = normalizeCurrency(currency);

  try {
    return new Intl.NumberFormat("en-US", {
      currency: normalizedCurrency,
      maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
      minimumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
      style: "currency",
    }).format(value);
  } catch {
    return `${normalizedCurrency} ${value.toFixed(2)}`;
  }
}

export function formatMonthlyDelta(
  value: number | null,
  currency: string = DEFAULT_COST_CURRENCY,
): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }

  const absolute = formatCurrencyAmount(Math.abs(value), currency);

  if (value > 0) {
    return `+${absolute}/mo`;
  }

  if (value < 0) {
    return `-${absolute}/mo`;
  }

  return `${absolute}/mo`;
}

export function getCostSeverityForDelta(
  monthlyDelta: number | null,
  thresholds: CostThresholds,
): RiskSeverity | null {
  if (monthlyDelta === null || !Number.isFinite(monthlyDelta) || monthlyDelta <= 0) {
    return null;
  }

  if (monthlyDelta > thresholds.critical) {
    return "critical";
  }

  if (monthlyDelta > thresholds.high) {
    return "high";
  }

  if (monthlyDelta > thresholds.medium) {
    return "medium";
  }

  return null;
}

export function formatCostThresholdSummary(
  thresholds: CostThresholds,
  currency: string = DEFAULT_COST_CURRENCY,
): string {
  return [
    `medium > ${formatCurrencyAmount(thresholds.medium, currency)}`,
    `high > ${formatCurrencyAmount(thresholds.high, currency)}`,
    `critical > ${formatCurrencyAmount(thresholds.critical, currency)}`,
  ].join(", ");
}
