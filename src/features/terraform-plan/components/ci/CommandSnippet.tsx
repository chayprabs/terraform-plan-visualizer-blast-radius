"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "absolute";
    helper.style.left = "-9999px";
    document.body.append(helper);
    helper.select();

    const copied = document.execCommand("copy");
    helper.remove();

    return copied;
  } catch {
    return false;
  }
}

interface CommandSnippetProps {
  code: string;
  copyLabel: string;
  description?: string;
  label: string;
  language?: string;
}

export function CommandSnippet({
  code,
  copyLabel,
  description,
  label,
  language = "text",
}: CommandSnippetProps) {
  const [copyState, setCopyState] = useState<"copied" | "error" | "idle">(
    "idle",
  );

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopyState("idle"), 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  return (
    <section className="border-border bg-background rounded-lg border p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-foreground text-sm font-semibold">{label}</h4>
          {description ? (
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {description}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          aria-label={copyLabel}
          className={cn(
            "inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            copyState === "copied" &&
              "border-positive bg-positive-soft text-positive",
            copyState === "error" &&
              "border-critical bg-critical-soft text-critical",
            copyState === "idle" &&
              "border-border bg-surface text-foreground hover:bg-surface-muted",
          )}
          onClick={async () => {
            const copied = await copyText(code);

            setCopyState(copied ? "copied" : "error");
          }}
        >
          {copyState === "copied"
            ? "Copied"
            : copyState === "error"
              ? "Copy failed"
              : "Copy snippet"}
        </button>
      </div>

      <pre
        aria-label={label}
        className="bg-surface-muted text-foreground mt-4 overflow-x-auto rounded-lg border border-border p-4 text-sm leading-6"
      >
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </section>
  );
}
