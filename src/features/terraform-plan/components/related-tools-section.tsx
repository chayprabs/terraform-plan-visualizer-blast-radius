import { relatedTools } from "@/features/terraform-plan/data";
import { SectionHeading } from "@/features/terraform-plan/components/section-heading";

export function RelatedToolsSection() {
  return (
    <section className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8">
      <SectionHeading
        eyebrow="Related tools"
        title="Next infrastructure review surfaces"
        description="These placeholder links stay disabled for now so the page can preview the wider Authos toolset without promising unfinished routes."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {relatedTools.map((tool) => (
          <a
            key={tool.title}
            href={tool.href}
            aria-disabled="true"
            tabIndex={-1}
            className="border-border bg-background pointer-events-none rounded-lg border p-5 opacity-65"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-foreground text-base font-semibold">
                {tool.title}
              </h3>
              <span className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                Disabled
              </span>
            </div>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {tool.description}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
