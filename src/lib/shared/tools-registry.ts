export type ProductToolStatus = "available" | "coming-soon";

export interface ProductToolDefinition {
  description: string;
  href: string;
  id: string;
  status: ProductToolStatus;
  title: string;
}

/** Primary product route and metadata for sitemap generation. */
export const productTools: ProductToolDefinition[] = [
  {
    id: "terraform-plan-visualizer",
    title: "Terraform Plan Visualizer",
    description:
      "Review terraform show -json plans with risk findings, blast radius, and exports.",
    href: "/",
    status: "available",
  },
];

export const availableProductTools = productTools.filter(
  (tool) => tool.status === "available",
);
