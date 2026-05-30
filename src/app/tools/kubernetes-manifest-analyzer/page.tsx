import type { Metadata } from "next";
import { KubernetesManifestAnalyzer } from "@/features/k8s-analyzer";
import { faqItems } from "@/features/k8s-analyzer/data";
import { serializeFaqJsonLd } from "@/lib/shared/seo/buildFaqJsonLd";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/site";

const toolPath = "/tools/kubernetes-manifest-analyzer";

const toolTitle =
  "Kubernetes Manifest Analyzer - Local YAML Risk Review for Terraform Plan Visualizer";
const toolDescription =
  "Paste or upload Kubernetes YAML to detect floating image tags, missing limits, privileged containers, hostPath mounts, cluster-admin bindings, and deprecated API versions in your browser.";

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

export default function KubernetesManifestAnalyzerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeFaqJsonLd(faqItems) }}
      />
      <KubernetesManifestAnalyzer />
    </>
  );
}
