import type { Metadata } from "next";
import { HclLinter } from "@/features/hcl-linter/hcl-linter";
import { faqItems } from "@/features/hcl-linter/data";
import { serializeFaqJsonLd } from "@/lib/shared/seo/buildFaqJsonLd";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/site";

const toolTitle = "Terraform HCL Linter - Lint modules and generate docs";
const toolDescription =
  "Paste Terraform HCL to lint for public CIDRs, hardcoded secret-like strings, missing variable descriptions, and generate reviewer-friendly module documentation.";
const toolPath = "/tools/terraform-hcl-linter";

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

export default function TerraformHclLinterPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeFaqJsonLd(faqItems) }}
      />
      <HclLinter />
    </>
  );
}
