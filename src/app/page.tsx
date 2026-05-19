import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ToolsGrid } from "@/components/home/tools-grid";
import { siteConfig } from "@/lib/site";

export default function HomePage() {
  return (
    <section className="py-16 sm:py-24">
      <Container className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="border-border bg-surface rounded-lg border p-8 shadow-sm sm:p-10">
          <p className="text-muted-foreground text-sm font-medium tracking-[0.22em] uppercase">
            Authos
          </p>
          <h1 className="text-foreground mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Browser-first tools for careful infrastructure review
          </h1>
          <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-8">
            Authos ships local-first analyzers that run in your browser tab. The
            first release is a Terraform plan workspace that turns{" "}
            <code className="text-foreground font-mono text-[0.95rem]">
              terraform show -json
            </code>{" "}
            into risk findings, dependency graphs, and exportable blast-radius
            reports—without uploading plans to a server.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={siteConfig.links.tools}
              className="bg-brand text-brand-foreground inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-medium transition-transform duration-150 hover:-translate-y-0.5"
            >
              Open Terraform Plan Visualizer
            </Link>
            <a
              href={siteConfig.links.repository}
              className="border-border bg-background text-foreground hover:bg-surface-muted inline-flex items-center justify-center rounded-md border px-5 py-3 text-sm font-medium transition-colors duration-150"
              rel="noreferrer"
              target="_blank"
            >
              View source on GitHub
            </a>
          </div>
        </div>

        <aside className="border-border bg-surface rounded-lg border p-8 shadow-sm">
          <p className="text-muted-foreground text-sm font-medium tracking-[0.22em] uppercase">
            Authos tools
          </p>
          <ToolsGrid />
        </aside>
      </Container>
    </section>
  );
}
