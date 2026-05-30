import Link from "next/link";
import { productTools } from "@/lib/shared/tools-registry";
import { SectionHeading } from "@/features/terraform-plan/components/section-heading";
import { cn } from "@/lib/utils";

export function RelatedToolsSection() {
  return (
    <section className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8">
      <SectionHeading
        eyebrow="Related tools"
        title="Terraform Plan Visualizer review tools"
        description="Local-first analyzers for infrastructure review workflows. Everything runs in your browser tab unless you choose to export."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {productTools.map((tool) => {
          const isAvailable = tool.status === "available";

          return (
            <Link
              key={tool.title}
              href={tool.href}
              className={cn(
                "border-border bg-background rounded-lg border p-5 transition-colors",
                isAvailable
                  ? "hover:bg-surface-muted hover:border-brand/40"
                  : "pointer-events-none opacity-65",
              )}
              {...(isAvailable ? {} : { "aria-disabled": true, tabIndex: -1 })}
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-foreground text-base font-semibold">
                  {tool.title}
                </h3>
                <span
                  className={cn(
                    "text-xs font-medium tracking-[0.18em] uppercase",
                    isAvailable ? "text-positive" : "text-muted-foreground",
                  )}
                >
                  {isAvailable ? "Available now" : "Coming soon"}
                </span>
              </div>
              <p className="text-muted-foreground mt-3 text-sm leading-7">
                {tool.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
