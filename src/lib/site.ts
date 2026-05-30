const DEFAULT_PRODUCTION_SITE_URL =
  "https://terraform-plan-visualizer-blast-radius.vercel.app";

function normalizeSiteUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

/**
 * Public site origin for metadata, canonical URLs, and Open Graph.
 * Override with NEXT_PUBLIC_SITE_URL in production.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;

  if (configured?.trim()) {
    return normalizeSiteUrl(configured);
  }

  const vercelHost = process.env.VERCEL_URL;

  if (vercelHost?.trim()) {
    return normalizeSiteUrl(`https://${vercelHost}`);
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_SITE_URL;
  }

  return "http://localhost:3000";
}

export function getAbsoluteUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${getSiteUrl()}${normalizedPath}`;
}

export const siteConfig = {
  name: "Terraform Plan Visualizer",
  description:
    "Paste or upload terraform show -json output to review creates, updates, deletes, blast radius, and risky infrastructure changes in your browser.",
  seoIntro: {
    line1:
      "Paste or upload Terraform plan JSON from terraform show -json to visualize resource changes, risky deletes, replacements, and dependency blast radius.",
    line2:
      "Analysis runs locally in your browser tab—no plan upload to a server. Export PR-ready Markdown, JSON, and HTML reports when you are done reviewing.",
  },
  links: {
    home: "/",
    tools: "/",
    repository:
      "https://github.com/chayprabs/terraform-plan-visualizer-blast-radius",
    twitter: "https://x.com/chayprabs",
    website: "https://chaitanyaprabuddha.com",
    privacy: "/privacy",
    terms: "/terms",
  },
  social: {
    twitterHandle: "@chayprabs",
  },
} as const;
