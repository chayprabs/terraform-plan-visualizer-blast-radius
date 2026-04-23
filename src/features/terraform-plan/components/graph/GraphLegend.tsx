"use client";

import { getGraphNodeActionShape } from "@/features/terraform-plan/components/graph/GraphNode";
import { cn } from "@/lib/utils";

const actionItems = [
  { action: "create", label: "Create", tone: "bg-positive border-positive" },
  { action: "update", label: "Update", tone: "bg-warning border-warning" },
  { action: "delete", label: "Delete", tone: "bg-critical border-critical" },
  { action: "replace", label: "Replace", tone: "bg-critical border-critical" },
] as const;

const riskItems = [
  { label: "Critical", tone: "bg-critical" },
  { label: "High / Medium", tone: "bg-warning" },
  { label: "Low", tone: "bg-positive" },
  { label: "Info / None", tone: "bg-border" },
] as const;

function ShapeSwatch({
  action,
  tone,
}: {
  action: "create" | "delete" | "replace" | "update";
  tone: string;
}) {
  const shape = getGraphNodeActionShape(action);
  const style =
    shape === "triangle"
      ? { clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }
      : shape === "hexagon"
        ? {
            clipPath:
              "polygon(24% 4%, 76% 4%, 100% 50%, 76% 96%, 24% 96%, 0% 50%)",
          }
        : undefined;

  return (
    <span
      className={cn(
        "inline-flex h-4 w-4 shrink-0 border",
        tone,
        shape === "circle" && "rounded-full",
        shape === "square" && "rounded-[0.35rem]",
        shape === "diamond" && "rotate-45 rounded-sm",
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

export function GraphLegend() {
  return (
    <section className="border-border bg-surface rounded-lg border p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
        <div>
          <p className="text-foreground text-sm font-semibold">Action shapes</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {actionItems.map((item) => (
              <span
                key={item.action}
                className="border-border bg-background inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium"
              >
                <ShapeSwatch action={item.action} tone={item.tone} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-foreground text-sm font-semibold">Risk stripes</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {riskItems.map((item) => (
              <span
                key={item.label}
                className="border-border bg-background inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium"
              >
                <span
                  className={cn("inline-flex h-2.5 w-8 rounded-full", item.tone)}
                  aria-hidden="true"
                />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-foreground text-sm font-semibold">Edge meaning</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <span className="border-border bg-background inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium">
              <span className="bg-foreground inline-flex h-px w-8" aria-hidden="true" />
              depends_on
            </span>
            <span className="border-border bg-background inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium">
              <span
                className="inline-flex h-px w-8 border-t border-dashed border-foreground"
                aria-hidden="true"
              />
              expression_reference
            </span>
            <span className="border-border bg-background inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium">
              Module context stays available in filters and node metadata to keep the graph readable.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
