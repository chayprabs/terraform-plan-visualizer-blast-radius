import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { faqItems } from "@/features/terraform-plan/data";
import { TerraformPlanHome } from "@/features/terraform-plan/terraform-plan-home";
import { serializeFaqJsonLd } from "@/lib/shared/seo/buildFaqJsonLd";
import { getAbsoluteUrl, getSiteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `${siteConfig.name} | Blast Radius & Risk Review`,
  description: siteConfig.seoDescription,
  alternates: {
    canonical: getAbsoluteUrl("/"),
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.seoDescription,
    type: "website",
    url: getAbsoluteUrl("/"),
  },
};

function buildWebApplicationJsonLd() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteConfig.name,
    description: siteConfig.seoDescription,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    browserRequirements: "Requires JavaScript. Runs entirely in the browser.",
    url: getSiteUrl(),
  });
}

export default function HomePage() {
  return (
    <AppShell showSeoIntro>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeFaqJsonLd(faqItems) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildWebApplicationJsonLd() }}
      />
      <TerraformPlanHome />
    </AppShell>
  );
}
