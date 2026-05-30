import type { ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
import { SeoIntroBar } from "@/components/layout/seo-intro-bar";
import { TopNav } from "@/components/layout/top-nav";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <SeoIntroBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
