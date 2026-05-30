import type { Metadata } from "next";
import { SecretsRedactor } from "@/features/secrets-redactor/secrets-redactor";
import { faqItems } from "@/features/secrets-redactor/data";
import { serializeFaqJsonLd } from "@/lib/shared/seo/buildFaqJsonLd";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/site";

const toolTitle = "Secrets Redactor - Mask Tokens and Identifiers Locally";
const toolDescription =
  "Paste or upload text to redact secret-like strings, cloud account IDs, IP addresses, and domain names entirely in your browser before sharing logs or exports.";
const toolPath = "/tools/secrets-redactor";

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

export default function SecretsRedactorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeFaqJsonLd(faqItems) }}
      />
      <SecretsRedactor />
    </>
  );
}
