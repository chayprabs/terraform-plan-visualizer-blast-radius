import Link from "next/link";

export function LegalFooter() {
  return (
    <footer className="border-border bg-surface border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-6 text-sm sm:px-6">
        <Link
          href="/privacy"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Privacy Policy
        </Link>
        <Link
          href="/terms"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Terms &amp; Conditions
        </Link>
      </div>
    </footer>
  );
}
