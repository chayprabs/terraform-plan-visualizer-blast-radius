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
  shortName: "Plan Visualizer",
  tagline:
    "Review terraform show -json plans with risk findings, dependency graphs, and blast-radius exports—entirely in your browser.",
  seoDescription:
    "Paste or upload Terraform plan JSON to visualize changes, flag risky deletes and replacements, explore dependencies, and export PR-ready blast-radius reports. No uploads to a server.",
  description:
    "Local-first Terraform plan review with blast radius, risk findings, and exportable reports.",
  links: {
    home: "/",
    repository:
      "https://github.com/chayprabs/terraform-plan-visualizer-blast-radius",
    twitter: "https://x.com/chayprabs",
    website: "https://www.chaitanyaprabuddha.com",
  },
} as const;
