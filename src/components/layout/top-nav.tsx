"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/ui/container";
import { availableAuthosTools } from "@/lib/authos/tools-registry";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="border-border bg-background border-b">
      <Container className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <Link
          href={siteConfig.links.home}
          className="text-foreground flex items-center gap-3 text-sm font-semibold tracking-[0.16em] uppercase"
        >
          <span className="border-border bg-surface flex h-9 w-9 items-center justify-center rounded-md border font-mono text-xs">
            AO
          </span>
          <span>Authos</span>
        </Link>

        <nav
          className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
          aria-label="Authos tools"
        >
          <Link
            href={siteConfig.links.home}
            className={cn(
              "text-muted-foreground hover:text-foreground transition-colors",
              pathname === siteConfig.links.home && "text-foreground font-medium",
            )}
          >
            Home
          </Link>
          {availableAuthosTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors",
                pathname === tool.href && "text-foreground font-medium",
              )}
            >
              {tool.title}
            </Link>
          ))}
        </nav>
      </Container>
    </header>
  );
}
