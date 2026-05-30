import type { Metadata } from "next";
import { TerraformPlanVisualizer } from "@/features/terraform-plan";
import { faqItems } from "@/features/terraform-plan/data";
import { serializeFaqJsonLd } from "@/lib/shared/seo/buildFaqJsonLd";
import { getAbsoluteUrl, getSiteUrl, siteConfig } from "@/lib/site";

const toolTitle =
  "Terraform Plan Visualizer - Blast-Radius Analyzer for terraform show -json";
const toolDescription = siteConfig.description;

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: toolTitle,
  description: toolDescription,
  alternates: {
    canonical: getAbsoluteUrl(siteConfig.links.home),
  },
  openGraph: {
    title: toolTitle,
    description: toolDescription,
    type: "website",
    url: getAbsoluteUrl(siteConfig.links.home),
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeFaqJsonLd(faqItems) }}
      />
      <TerraformPlanVisualizer variant="workspace" />
    </>
  );
}
