import Link from "next/link";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export default function HomePage() {
  return (
    <section className="py-16 sm:py-24">
      <Container className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="border-border bg-surface rounded-lg border p-8 shadow-sm sm:p-10">
          <p className="text-muted-foreground text-sm font-medium tracking-[0.22em] uppercase">
            Temporary home
          </p>
          <h1 className="text-foreground mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Authos builds browser-first tools for careful engineering work.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-8">
            The first tool is a local-first Terraform plan workspace designed to
            turn structured plan output into a clear review surface.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={siteConfig.links.tools}
              className="bg-brand text-brand-foreground inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-medium transition-transform duration-150 hover:-translate-y-0.5"
            >
              Open Terraform Plan Visualizer
            </Link>
          </div>
        </div>

        <aside className="border-border bg-surface rounded-lg border p-8 shadow-sm">
          <p className="text-muted-foreground text-sm font-medium tracking-[0.22em] uppercase">
            First release
          </p>
          <div className="mt-5 space-y-4">
            <div className="border-border bg-surface-muted rounded-md border p-4">
              <p className="text-foreground text-sm font-medium">
                Terraform Plan Visualizer
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-7">
                Route:
                <span className="text-foreground ml-2 font-mono text-[0.95rem]">
                  /tools/terraform-plan-visualizer
                </span>
              </p>
            </div>
            <p className="text-muted-foreground text-sm leading-7">
              The initial scaffold keeps the structure intentionally small so
              the tool can evolve without dragging in backend routes or auth
              concerns.
            </p>
          </div>
        </aside>
      </Container>
    </section>
  );
}
