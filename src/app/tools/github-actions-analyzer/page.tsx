import type { Metadata } from "next";
import { GitHubActionsAnalyzer } from "@/features/gha-analyzer/gha-analyzer";
import { faqItems } from "@/features/gha-analyzer/data";
import { serializeFaqJsonLd } from "@/lib/authos/seo/buildFaqJsonLd";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/site";

const toolPath = "/tools/github-actions-analyzer";
const toolTitle = "GitHub Actions Workflow Analyzer - Local YAML Risk Review";
const toolDescription =
  "Paste GitHub Actions workflow YAML to review permissions, dangerous triggers, unpinned actions, secret exposure, checkout settings, and artifact retention in your browser.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: toolTitle,
  description: toolDescription,
  alternates: {
    canonical: getAbsoluteUrl(toolPath),
  },
  openGraph: {
    title: toolTitle,
    description: toolDescription,
    type: "website",
    url: getAbsoluteUrl(toolPath),
  },
};

export default function GitHubActionsAnalyzerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeFaqJsonLd(faqItems) }}
      />
      <GitHubActionsAnalyzer />
    </>
  );
}
