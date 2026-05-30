import type { ReactNode } from "react";
import { LegalFooter } from "@/components/layout/legal-footer";
import { SeoIntroBar } from "@/components/layout/seo-intro-bar";
import { SiteHeader } from "@/components/layout/site-header";

type AppShellProps = {
  children: ReactNode;
  showSeoIntro?: boolean;
};

export function AppShell({ children, showSeoIntro = false }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      {showSeoIntro ? <SeoIntroBar /> : null}
      <main className="flex-1">{children}</main>
      <LegalFooter />
    </div>
  );
}
