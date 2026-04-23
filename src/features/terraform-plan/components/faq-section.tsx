import { SectionHeading } from "@/features/terraform-plan/components/section-heading";
import { faqItems } from "@/features/terraform-plan/data";

export function FaqSection() {
  return (
    <section className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8">
      <SectionHeading
        eyebrow="FAQ"
        title="Common questions from Terraform reviewers"
        description="Quick answers about supported plan input, local browser processing, destructive-change detection, and why some dependency edges stay out of view."
      />

      <div className="mt-6 space-y-3">
        {faqItems.map((item, index) => (
          <details
            key={item.question}
            className="border-border bg-background rounded-lg border px-5 py-4"
            open={index === 0}
          >
            <summary className="text-foreground cursor-pointer list-none pr-8 text-base font-semibold">
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
