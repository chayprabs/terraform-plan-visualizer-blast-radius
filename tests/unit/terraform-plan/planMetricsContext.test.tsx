import { render, screen, within } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { HeroSummaryCards } from "@/features/terraform-plan/components/hero-summary-cards";
import {
  PlanMetricsProvider,
  usePlanMetrics,
} from "@/features/terraform-plan/context/planMetricsContext";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import { riskyPlan } from "@/features/terraform-plan/fixtures/samplePlans";

function MetricsBootstrap() {
  const { setMetricsFromPlan } = usePlanMetrics();

  useEffect(() => {
    setMetricsFromPlan(normalizeTerraformPlan(riskyPlan));
  }, [setMetricsFromPlan]);

  return <HeroSummaryCards />;
}

describe("planMetricsContext", () => {
  it("shows live metrics in hero cards after analysis", () => {
    render(
      <PlanMetricsProvider>
        <MetricsBootstrap />
      </PlanMetricsProvider>,
    );

    const highRiskCard = screen.getByText("High Risk").parentElement?.parentElement;
    expect(within(highRiskCard as HTMLElement).getByText("4")).toBeInTheDocument();
    expect(
      screen.queryByText(/Analyze a plan to populate this metric/i),
    ).not.toBeInTheDocument();
  });
});
