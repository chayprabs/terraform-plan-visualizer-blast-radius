import {
  analyzerChecks,
  analyzerLimitations,
  practicalExamples,
  reviewerWorkflowSteps,
  riskyTerraformChanges,
  terraformActionExplanations,
} from "@/features/terraform-plan/data";
import { SectionHeading } from "@/features/terraform-plan/components/section-heading";

const terraformPlanJsonCommand = `terraform init
terraform workspace select <workspace-name>  # optional
terraform plan -out=tfplan
terraform show -json tfplan > plan.json`;

export function ReviewGuideSection() {
  return (
    <section className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8">
      <SectionHeading
        eyebrow="Guide"
        title="Review Terraform plan JSON with more context"
        description="The live analyzer stays above the fold so you can paste or upload a plan immediately. The sections below explain how to generate Terraform plan JSON, what the local browser analysis checks, and how to turn redacted exports into a cleaner pull request review."
      />

      <div className="mt-8 space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="border-border bg-background rounded-lg border p-5">
            <h3 className="text-foreground text-xl font-semibold">
              How to generate Terraform plan JSON
            </h3>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              Save the binary plan locally, then convert it with{" "}
              <code>terraform show -json</code>. The analyzer expects that JSON
              output, not raw Terraform configuration and not the binary{" "}
              <code>tfplan</code> file itself.
            </p>
            <pre className="bg-surface-muted text-foreground mt-4 overflow-x-auto rounded-lg border border-border p-4 text-sm leading-6">
              <code>{terraformPlanJsonCommand}</code>
            </pre>
            <p className="text-muted-foreground mt-4 text-sm leading-7">
              If you use workspaces, select the same workspace you plan to
              review. Analysis happens locally in this browser tab, so you can
              inspect the plan without uploading it to a server.
            </p>
          </article>

          <article className="border-border bg-background rounded-lg border p-5">
            <h3 className="text-foreground text-xl font-semibold">
              What the analyzer checks
            </h3>
            <ul className="text-muted-foreground mt-4 space-y-3 text-sm leading-7">
              {analyzerChecks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="border-border bg-background rounded-lg border p-5">
            <h3 className="text-foreground text-xl font-semibold">
              Terraform actions explained
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {terraformActionExplanations.map((item) => (
                <div
                  key={item.action}
                  className="border-border bg-surface rounded-lg border p-4"
                >
                  <h4 className="text-foreground text-sm font-semibold">
                    {item.action}
                  </h4>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="border-border bg-background rounded-lg border p-5">
            <h3 className="text-foreground text-xl font-semibold">
              Common risky Terraform changes
            </h3>
            <ul className="text-muted-foreground mt-4 space-y-3 text-sm leading-7">
              {riskyTerraformChanges.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>

        <article className="border-border bg-background rounded-lg border p-5">
          <h3 className="text-foreground text-xl font-semibold">
            Example review scenarios
          </h3>
          <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-7">
            These examples reflect the kinds of long-tail Terraform review
            questions teams ask in pull requests, incident follow-ups, and
            change management reviews.
          </p>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {practicalExamples.map((example) => (
              <div
                key={example.title}
                className="border-border bg-surface rounded-lg border p-4"
              >
                <h4 className="text-foreground text-base font-semibold">
                  {example.title}
                </h4>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {example.summary}
                </p>
                <p className="text-muted-foreground mt-3 text-sm leading-6">
                  <span className="text-foreground font-medium">
                    What to inspect first:
                  </span>{" "}
                  {example.reviewerFocus}
                </p>
              </div>
            ))}
          </div>
        </article>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="border-border bg-background rounded-lg border p-5">
            <h3 className="text-foreground text-xl font-semibold">
              Using the report in pull request reviews
            </h3>
            <ul className="text-muted-foreground mt-4 space-y-3 text-sm leading-7">
              {reviewerWorkflowSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="border-border bg-background rounded-lg border p-5">
            <h3 className="text-foreground text-xl font-semibold">
              Limitations
            </h3>
            <ul className="text-muted-foreground mt-4 space-y-3 text-sm leading-7">
              {analyzerLimitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
