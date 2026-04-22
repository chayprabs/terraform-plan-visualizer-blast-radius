import { workflowSteps } from "@/features/terraform-plan/data";
import { SectionHeading } from "@/features/terraform-plan/components/section-heading";

export function HowItWorksSection() {
  return (
    <section className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8">
      <SectionHeading
        eyebrow="How it works"
        title="Three steps to a review-ready plan"
        description="The analyzer runs locally in the browser, starting with paste, upload, and sample-plan review."
      />

      <ol className="mt-6 grid gap-4">
        {workflowSteps.map((item) => (
          <li
            key={item.step}
            className="border-border bg-background rounded-lg border p-4"
          >
            <p className="text-brand text-sm font-semibold">{item.step}</p>
            <h3 className="text-foreground mt-2 text-lg font-semibold">
              {item.title}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm leading-7">
              {item.description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
