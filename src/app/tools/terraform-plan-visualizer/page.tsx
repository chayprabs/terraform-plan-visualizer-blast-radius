import type { Metadata } from "next";
import { TerraformPlanVisualizer } from "@/features/terraform-plan";
import { faqItems } from "@/features/terraform-plan/data";
import { serializeFaqJsonLd } from "@/lib/authos/seo/buildFaqJsonLd";
import { getAbsoluteUrl, getSiteUrl, siteConfig } from "@/lib/site";

const toolTitle =
  "Terraform Plan Visualizer - Blast-Radius Analyzer for terraform show -json";
const toolDescription =
  "Paste or upload Terraform plan JSON to visualize resource changes, detect risky deletes and replacements, inspect dependencies, and export a PR-ready blast-radius report.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: toolTitle,
  description: toolDescription,
  alternates: {
    canonical: getAbsoluteUrl(siteConfig.links.tools),
  },
  openGraph: {
    title: toolTitle,
    description: toolDescription,
    type: "website",
    url: getAbsoluteUrl(siteConfig.links.tools),
  },
};

export default function TerraformPlanVisualizerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeFaqJsonLd(faqItems) }}
      />
      <TerraformPlanVisualizer />
    </>
  );
}
