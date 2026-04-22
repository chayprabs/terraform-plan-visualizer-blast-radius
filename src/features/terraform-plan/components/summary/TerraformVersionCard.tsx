import type { TerraformVersionSummary } from "@/features/terraform-plan/domain/planDashboardSummary";

interface TerraformVersionCardProps {
  summary: TerraformVersionSummary;
}

export function TerraformVersionCard({ summary }: TerraformVersionCardProps) {
  return (
    <section className="border-border bg-surface rounded-lg border p-4">
      <div>
        <p
          className="text-foreground text-sm font-semibold"
          title="Terraform version comes from terraform_version, and plan format version comes from format_version."
        >
          Terraform metadata
        </p>
        <p className="text-muted-foreground mt-1 text-sm leading-6">
          Version fields render when present and stay resilient when optional metadata is missing.
        </p>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="border-border bg-background rounded-lg border px-3 py-3">
          <dt className="text-muted-foreground text-xs font-medium uppercase tracking-[0.16em]">
            Terraform version
          </dt>
          <dd className="text-foreground mt-2 text-lg font-semibold">
            {summary.terraformVersion ?? "Unavailable"}
          </dd>
        </div>
        <div className="border-border bg-background rounded-lg border px-3 py-3">
          <dt className="text-muted-foreground text-xs font-medium uppercase tracking-[0.16em]">
            Plan format version
          </dt>
          <dd className="text-foreground mt-2 text-lg font-semibold">
            {summary.formatVersion ?? "Unavailable"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
