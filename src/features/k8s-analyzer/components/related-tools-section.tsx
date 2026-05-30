import Link from "next/link";
import { productTools } from "@/lib/shared/tools-registry";

export function RelatedToolsSection() {
  const relatedTools = productTools.filter(
    (tool) => tool.id !== "kubernetes-manifest-analyzer",
  );

  return (
    <section className="border-border bg-surface rounded-lg border p-6 sm:p-8">
      <h2 className="text-foreground text-2xl font-semibold tracking-tight">
        Related Terraform Plan Visualizer tools
      </h2>
      <ul className="mt-5 grid gap-4 md:grid-cols-2">
        {relatedTools.map((tool) => (
          <li key={tool.id}>
            <Link
              href={tool.href}
              className="border-border bg-background hover:bg-surface-muted block rounded-lg border p-5 transition-colors duration-150"
            >
              <p className="text-foreground font-medium">{tool.title}</p>
              <p className="text-muted-foreground mt-2 text-sm leading-7">
                {tool.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
