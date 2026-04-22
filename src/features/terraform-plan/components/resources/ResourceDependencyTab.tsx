export function ResourceDependencyTab() {
  return (
    <section className="space-y-4" aria-label="Resource dependencies">
      <div className="border-border bg-surface rounded-lg border p-4 sm:p-5">
        <p className="text-foreground text-sm font-semibold">Dependencies</p>
        <p className="text-muted-foreground mt-2 text-sm leading-7">
          Dependency graph will show upstream and downstream impact after graph
          analysis is enabled.
        </p>
      </div>
    </section>
  );
}
