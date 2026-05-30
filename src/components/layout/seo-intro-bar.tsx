import { siteConfig } from "@/lib/site";

export function SeoIntroBar() {
  return (
    <section
      className="border-border bg-surface-muted border-b"
      aria-labelledby="product-intro-heading"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
        <h1
          id="product-intro-heading"
          className="text-foreground text-lg font-semibold tracking-tight sm:text-xl"
        >
          {siteConfig.name}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-4xl text-sm leading-6 sm:text-[0.95rem]">
          {siteConfig.tagline}
        </p>
      </div>
    </section>
  );
}
