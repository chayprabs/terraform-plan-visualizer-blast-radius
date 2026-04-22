import Link from "next/link";
import { Container } from "@/components/ui/container";
import { primaryNavigation, siteConfig } from "@/lib/site";

export function TopNav() {
  return (
    <header className="border-border bg-background border-b">
      <Container className="flex items-center justify-between py-4">
        <Link
          href={siteConfig.links.home}
          className="text-foreground flex items-center gap-3 text-sm font-semibold tracking-[0.16em] uppercase"
        >
          <span className="border-border bg-surface flex h-9 w-9 items-center justify-center rounded-md border font-mono text-xs">
            AO
          </span>
          <span>Authos</span>
        </Link>

        <nav className="text-muted-foreground flex items-center gap-6 text-sm">
          {primaryNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-foreground transition-colors duration-150"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </Container>
    </header>
  );
}
