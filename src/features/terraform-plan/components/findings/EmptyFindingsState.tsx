import { cn } from "@/lib/utils";

interface EmptyFindingsStateProps {
  description: string;
  title: string;
  tone?: "default" | "positive" | "warning";
}

const toneClasses = {
  default: "border-border bg-surface-muted",
  positive: "border-positive bg-positive-soft",
  warning: "border-warning bg-warning-soft",
} as const;

export function EmptyFindingsState({
  description,
  title,
  tone = "default",
}: EmptyFindingsStateProps) {
  return (
    <div className={cn("rounded-lg border p-5", toneClasses[tone])}>
      <p className="text-foreground text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground mt-2 text-sm leading-7">
        {description}
      </p>
    </div>
  );
}
