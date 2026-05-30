import type { MetadataRoute } from "next";
import { getAbsoluteUrl, siteConfig } from "@/lib/site";
import { productTools } from "@/lib/shared/tools-registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const toolEntries = productTools
    .filter((tool) => tool.id !== "terraform-plan-visualizer")
    .map((tool) => ({
      url: getAbsoluteUrl(tool.href),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  return [
    {
      url: getAbsoluteUrl(siteConfig.links.home),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: getAbsoluteUrl(siteConfig.links.privacy),
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: getAbsoluteUrl(siteConfig.links.terms),
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...toolEntries,
  ];
}
