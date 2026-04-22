import { Container } from "@/components/ui/container";
import { FaqSection } from "@/features/terraform-plan/components/faq-section";
import { HeroSection } from "@/features/terraform-plan/components/hero-section";
import { HowItWorksSection } from "@/features/terraform-plan/components/how-it-works-section";
import { PrivacyStrip } from "@/features/terraform-plan/components/privacy-strip";
import { RelatedToolsSection } from "@/features/terraform-plan/components/related-tools-section";
import { UseCasesSection } from "@/features/terraform-plan/components/use-cases-section";
import { WorkspaceShell } from "@/features/terraform-plan/components/workspace-shell";

export function TerraformPlanVisualizer() {
  return (
    <div className="py-8 sm:py-10">
      <Container className="space-y-8 sm:space-y-10">
        <HeroSection />
        <WorkspaceShell />
        <PrivacyStrip />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <HowItWorksSection />
          <UseCasesSection />
        </div>

        <FaqSection />
        <RelatedToolsSection />
      </Container>
    </div>
  );
}
