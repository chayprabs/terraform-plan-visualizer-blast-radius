import { faqItems } from "@/features/k8s-analyzer/data";

export function FaqSection() {
  return (
    <section className="border-border bg-surface rounded-lg border p-6 sm:p-8">
      <h2 className="text-foreground text-2xl font-semibold tracking-tight">
        FAQ
      </h2>
      <div className="mt-6 space-y-4">
        {faqItems.map((item) => (
          <details
            key={item.question}
            className="border-border bg-background group rounded-lg border px-5 py-4"
          >
            <summary className="text-foreground cursor-pointer list-none text-base font-medium marker:content-none [&::-webkit-details-marker]:hidden">
              {item.question}
            </summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
