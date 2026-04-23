import type { Metadata } from "next";
import { TerraformPlanVisualizer } from "@/features/terraform-plan";
import { faqItems } from "@/features/terraform-plan/data";
import { siteConfig } from "@/lib/site";

const toolTitle =
  "Terraform Plan Visualizer - Blast-Radius Analyzer for terraform show -json";
const toolDescription =
  "Paste or upload Terraform plan JSON to visualize resource changes, detect risky deletes and replacements, inspect dependencies, and export a PR-ready blast-radius report.";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: toolTitle,
  description: toolDescription,
  alternates: {
    canonical: siteConfig.links.tools,
  },
  openGraph: {
    title: toolTitle,
    description: toolDescription,
    type: "website",
    url: siteConfig.links.tools,
  },
};

export default function TerraformPlanVisualizerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <TerraformPlanVisualizer />
    </>
  );
}
