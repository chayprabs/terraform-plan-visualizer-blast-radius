export const siteConfig = {
  name: "Authos",
  siteUrl: "https://example.com",
  description:
    "Browser-first developer tools built for local, trustworthy workflows.",
  links: {
    home: "/",
    tools: "/tools/terraform-plan-visualizer",
  },
} as const;

export const primaryNavigation = [
  {
    label: "Tools",
    href: siteConfig.links.tools,
  },
] as const;
