export function PrivacyStrip() {
  return (
    <section
      className="border-border bg-surface-muted rounded-lg border px-5 py-4"
      aria-label="Privacy notice"
    >
      <p className="text-foreground text-sm font-medium leading-7 sm:text-base">
        Local processing: your manifests are parsed in this browser tab.
      </p>
    </section>
  );
}
