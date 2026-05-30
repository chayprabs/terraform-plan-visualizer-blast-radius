import Link from "next/link";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export default function NotFound() {
  return (
    <section className="py-16 sm:py-24">
      <Container className="max-w-xl">
        <p className="text-muted-foreground text-sm font-medium tracking-[0.22em] uppercase">
          Page not found
        </p>
        <h1 className="text-foreground mt-4 text-3xl font-semibold tracking-tight">
          This route does not exist
        </h1>
        <p className="text-muted-foreground mt-4 text-base leading-7">
          The Terraform Plan Visualizer and companion tools live at known paths
          below. If you followed an old bookmark, use the home page or a tool
          link from the footer.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href={siteConfig.links.home}
            className="bg-brand text-brand-foreground inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-medium"
          >
            Open {siteConfig.name}
          </Link>
          <Link
            href="/tools/secrets-redactor"
            className="border-border bg-background text-foreground hover:bg-surface-muted inline-flex items-center justify-center rounded-md border px-5 py-3 text-sm font-medium"
          >
            Secrets Redactor
          </Link>
        </div>
      </Container>
    </section>
  );
}
