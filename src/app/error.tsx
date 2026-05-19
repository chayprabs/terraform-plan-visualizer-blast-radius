"use client";

import { useEffect } from "react";
import Link from "next/link";

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
    <div className="bg-background flex min-h-[50vh] items-center justify-center px-6 py-16">
      <div className="border-border bg-surface max-w-lg rounded-lg border p-8 shadow-sm">
        <p className="text-muted-foreground text-sm font-medium tracking-[0.18em] uppercase">
          Something went wrong
        </p>
        <h1 className="text-foreground mt-3 text-2xl font-semibold">
          Authos hit an unexpected error
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-7">
          Your Terraform plan and other inputs were not sent anywhere. Reload
          the page to try again. If the problem persists, clear local browser
          storage for this site.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="bg-brand text-brand-foreground rounded-md px-4 py-2 text-sm font-medium"
            onClick={() => reset()}
          >
            Reload page
          </button>
          <Link
            href="/"
            className="border-border bg-background text-foreground hover:bg-surface-muted inline-flex rounded-md border px-4 py-2 text-sm font-medium"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
