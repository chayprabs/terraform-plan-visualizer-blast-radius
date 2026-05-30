"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { siteConfig } from "@/lib/site";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppShell>
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="text-foreground text-2xl font-semibold">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mt-4 text-sm leading-7">
          {siteConfig.name} hit an unexpected error. You can try again or return
          to the workspace.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="bg-brand text-brand-foreground rounded-md px-4 py-2 text-sm font-medium"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border-border text-foreground hover:bg-surface-muted rounded-md border px-4 py-2 text-sm font-medium"
          >
            Go home
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
