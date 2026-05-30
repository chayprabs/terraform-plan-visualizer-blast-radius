import Link from "next/link";
import { Container } from "@/components/ui/container";
import {
  GitHubIcon,
  GlobeIcon,
  XIcon,
} from "@/components/layout/social-icons";
import { siteConfig } from "@/lib/site";

export function TopNav() {
  return (
    <header className="border-border bg-background border-b">
      <Container className="flex items-center justify-between gap-4 py-4">
        <Link
          href={siteConfig.links.home}
          className="text-foreground text-sm font-semibold tracking-[0.12em] uppercase"
        >
          {siteConfig.name}
        </Link>

        <nav
          className="flex flex-wrap items-center justify-end gap-4 text-sm"
          aria-label="External links"
        >
          <a
            href={siteConfig.links.repository}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors"
            rel="noreferrer"
            target="_blank"
          >
            <GitHubIcon className="h-4 w-4" />
            <span>GitHub</span>
          </a>
          <a
            href={siteConfig.links.twitter}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors"
            rel="noreferrer"
            target="_blank"
          >
            <XIcon className="h-4 w-4" />
            <span>{siteConfig.social.twitterHandle}</span>
          </a>
          <a
            href={siteConfig.links.website}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors"
            rel="noreferrer"
            target="_blank"
          >
            <GlobeIcon className="h-4 w-4" />
            <span className="hidden sm:inline">chaitanyaprabuddha.com</span>
            <span className="sm:hidden">Website</span>
          </a>
        </nav>
      </Container>
    </header>
  );
}
