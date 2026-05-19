"use client";

import { Container } from "@/components/ui/container";
import { PlanMetricsProvider } from "@/features/terraform-plan/context/planMetricsContext";
import { FaqSection } from "@/features/terraform-plan/components/faq-section";
import { HeroSection } from "@/features/terraform-plan/components/hero-section";
import { HowItWorksSection } from "@/features/terraform-plan/components/how-it-works-section";
import { PrivacyStrip } from "@/features/terraform-plan/components/privacy-strip";
import { UseCasesSection } from "@/features/terraform-plan/components/use-cases-section";
import { ReviewGuideSection } from "@/features/terraform-plan/components/review-guide-section";
import { RelatedToolsSection } from "@/features/terraform-plan/components/related-tools-section";
import { WorkspaceShell } from "@/features/terraform-plan/components/workspace-shell";

export function TerraformPlanVisualizer() {
  return (
    <PlanMetricsProvider>
      <div className="py-8 sm:py-10">
        <Container className="space-y-8 sm:space-y-10">
          <HeroSection />
          <HowItWorksSection />
          <WorkspaceShell />
          <UseCasesSection />
          <PrivacyStrip />
          <ReviewGuideSection />
          <FaqSection />
          <RelatedToolsSection />
        </Container>
      </div>
    </PlanMetricsProvider>
  );
}
