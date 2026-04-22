import Link from "next/link";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-border border-t">
      <Container className="text-muted-foreground flex flex-col gap-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>Browser-first developer tools with local-first defaults.</p>
        <Link
          href={siteConfig.links.tools}
          className="hover:text-foreground transition-colors duration-150"
        >
          Terraform Plan Visualizer
        </Link>
      </Container>
    </footer>
  );
}
