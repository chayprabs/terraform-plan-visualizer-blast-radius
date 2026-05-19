"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { NormalizedPlan } from "@/features/terraform-plan/domain/normalizedPlanTypes";

export interface PlanHeroMetrics {
  creates: number;
  deletes: number;
  highRisk: number;
  replacements: number;
  updates: number;
}

interface PlanMetricsContextValue {
  metrics: PlanHeroMetrics | null;
  setMetricsFromPlan: (plan: NormalizedPlan | null) => void;
}

const PlanMetricsContext = createContext<PlanMetricsContextValue | null>(null);

function buildMetricsFromPlan(plan: NormalizedPlan): PlanHeroMetrics {
  return {
    creates: plan.summary.createCount,
    updates: plan.summary.updateCount,
    deletes: plan.summary.deleteCount,
    replacements: plan.summary.replaceCount,
    highRisk: plan.riskReport?.highRiskFindingCount ?? plan.summary.highRiskCount,
  };
}

export function PlanMetricsProvider({ children }: { children: ReactNode }) {
  const [metrics, setMetrics] = useState<PlanHeroMetrics | null>(null);

  const setMetricsFromPlan = useCallback((plan: NormalizedPlan | null) => {
    setMetrics(plan ? buildMetricsFromPlan(plan) : null);
  }, []);

  const value = useMemo(
    () => ({
      metrics,
      setMetricsFromPlan,
    }),
    [metrics, setMetricsFromPlan],
  );

  return (
    <PlanMetricsContext.Provider value={value}>
      {children}
    </PlanMetricsContext.Provider>
  );
}

export function usePlanMetrics(): PlanMetricsContextValue {
  const context = useContext(PlanMetricsContext);

  if (!context) {
    throw new Error("usePlanMetrics must be used within PlanMetricsProvider");
  }

  return context;
}
