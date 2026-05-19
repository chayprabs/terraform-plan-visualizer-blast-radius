import { useCases } from "@/features/k8s-analyzer/data";

export function UseCasesSection() {
  return (
    <section className="border-border bg-surface rounded-lg border p-6 sm:p-8">
      <h2 className="text-foreground text-2xl font-semibold tracking-tight">
        Use cases
      </h2>
      <ul className="text-muted-foreground mt-5 grid gap-3 sm:grid-cols-2">
        {useCases.map((useCase) => (
          <li
            key={useCase}
            className="border-border bg-background rounded-md border px-4 py-3 text-sm leading-7"
          >
            {useCase}
          </li>
        ))}
      </ul>
    </section>
  );
}
