import { workflowSteps } from "@/features/k8s-analyzer/data";

export function HowItWorksSection() {
  return (
    <section className="border-border bg-surface rounded-lg border p-6 sm:p-8">
      <h2 className="text-foreground text-2xl font-semibold tracking-tight">
        How it works
      </h2>
      <ol className="mt-6 grid gap-4 md:grid-cols-3">
        {workflowSteps.map((step) => (
          <li
            key={step.step}
            className="border-border bg-background rounded-lg border p-5"
          >
            <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
              {step.step}
            </p>
            <h3 className="text-foreground mt-3 text-lg font-semibold">
              {step.title}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm leading-7">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
