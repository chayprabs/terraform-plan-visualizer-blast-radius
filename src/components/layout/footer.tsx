import Link from "next/link";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-border border-t">
      <Container className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 py-6 text-sm">
        <Link
          href={siteConfig.links.privacy}
          className="hover:text-foreground transition-colors duration-150"
        >
          Privacy
        </Link>
        <Link
          href={siteConfig.links.terms}
          className="hover:text-foreground transition-colors duration-150"
        >
          Terms
        </Link>
      </Container>
    </footer>
  );
}
