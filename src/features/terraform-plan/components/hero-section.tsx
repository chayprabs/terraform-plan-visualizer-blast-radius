export function HeroSection() {
  return (
    <section className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div>
          <span className="bg-surface-muted text-muted-foreground border-border inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-[0.18em] uppercase">
            Local browser processing
          </span>
          <h1 className="text-foreground mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Terraform Plan Visualizer
          </h1>
          <p className="text-muted-foreground mt-5 max-w-3xl text-lg leading-8">
            Paste or upload terraform show -json output to review creates,
            updates, deletes, replacements, risky resources, and blast radius
            before you apply.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="#workspace"
              className="bg-brand text-brand-foreground inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-medium transition-transform duration-150 hover:-translate-y-0.5"
            >
              Analyze a plan
            </a>
            <a
              href="#workspace"
              className="border-border bg-background text-foreground hover:bg-surface-muted inline-flex items-center justify-center rounded-md border px-5 py-3 text-sm font-medium transition-colors duration-150"
            >
              Load sample plan
            </a>
          </div>
        </div>

        <aside className="border-border bg-background rounded-lg border p-5">
          <p className="text-foreground text-sm font-semibold">
            Review-first workspace
          </p>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="border-border rounded-md border p-3">
              <dt className="text-muted-foreground">Input</dt>
              <dd className="text-foreground mt-1 font-medium">
                terraform show -json
              </dd>
            </div>
            <div className="border-border rounded-md border p-3">
              <dt className="text-muted-foreground">Output focus</dt>
              <dd className="text-foreground mt-1 font-medium">
                Risk, blast radius, and review-ready summaries
              </dd>
            </div>
            <div className="border-border rounded-md border p-3">
              <dt className="text-muted-foreground">Mode</dt>
              <dd className="text-foreground mt-1 font-medium">
                Browser-first and local by default
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
