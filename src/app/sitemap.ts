import type { MetadataRoute } from "next";
import { getAbsoluteUrl, siteConfig } from "@/lib/site";
import { authosTools } from "@/lib/authos/tools-registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: getAbsoluteUrl(siteConfig.links.home),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...authosTools.map((tool) => ({
      url: getAbsoluteUrl(tool.href),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: tool.id === "terraform-plan-visualizer" ? 0.9 : 0.8,
    })),
  ];
}
