import { siteConfig } from "@/lib/site";

export function SeoIntroBar() {
  return (
    <section
      className="border-border bg-surface w-full border-b px-4 py-4 sm:px-6 lg:px-8"
      aria-label="Product introduction"
    >
      <p className="text-foreground mx-auto max-w-6xl text-base leading-7 font-medium sm:text-lg">
        {siteConfig.seoIntro.line1}
      </p>
      <p className="text-muted-foreground mx-auto mt-2 max-w-6xl text-sm leading-7 sm:text-base">
        {siteConfig.seoIntro.line2}
      </p>
    </section>
  );
}
