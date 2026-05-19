"use client";

import { Container } from "@/components/ui/container";
import { FaqSection } from "@/features/k8s-analyzer/components/faq-section";
import { HeroSection } from "@/features/k8s-analyzer/components/hero-section";
import { HowItWorksSection } from "@/features/k8s-analyzer/components/how-it-works-section";
import { PrivacyStrip } from "@/features/k8s-analyzer/components/privacy-strip";
import { RelatedToolsSection } from "@/features/k8s-analyzer/components/related-tools-section";
import { UseCasesSection } from "@/features/k8s-analyzer/components/use-cases-section";
import { WorkspaceShell } from "@/features/k8s-analyzer/components/workspace-shell";

export function KubernetesManifestAnalyzer() {
  return (
    <div className="py-8 sm:py-10">
      <Container className="space-y-8 sm:space-y-10">
        <HeroSection />
        <HowItWorksSection />
        <WorkspaceShell />
        <UseCasesSection />
        <PrivacyStrip />
        <FaqSection />
        <RelatedToolsSection />
      </Container>
    </div>
  );
}
