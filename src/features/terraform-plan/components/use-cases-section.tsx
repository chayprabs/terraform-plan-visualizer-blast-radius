import { SectionHeading } from "@/features/terraform-plan/components/section-heading";
import { useCases } from "@/features/terraform-plan/data";

export function UseCasesSection() {
  return (
    <section className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8">
      <SectionHeading
        eyebrow="Common use cases"
        title="Where this workspace earns its keep"
        description="Keep the initial release grounded in practical infrastructure review tasks instead of generic dashboard filler."
      />

      <ul className="mt-6 grid gap-3">
        {useCases.map((useCase) => (
          <li
            key={useCase}
            className="border-border bg-background text-foreground rounded-lg border px-4 py-4 text-sm leading-7"
          >
            {useCase}
          </li>
        ))}
      </ul>
    </section>
  );
}
