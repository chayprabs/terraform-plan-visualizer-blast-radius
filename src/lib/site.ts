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
  name: "Authos",
  description:
    "Browser-first developer tools built for local, trustworthy workflows.",
  links: {
    home: "/",
    tools: "/tools/terraform-plan-visualizer",
    repository:
      "https://github.com/chayprabs/terraform-plan-visualizer-blast-radius",
  },
} as const;

export const primaryNavigation = [
  {
    label: "Tools",
    href: siteConfig.links.tools,
  },
] as const;
