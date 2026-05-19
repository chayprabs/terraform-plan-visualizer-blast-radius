import Link from "next/link";
import { authosTools } from "@/lib/authos/tools-registry";
import { cn } from "@/lib/utils";

export function ToolsGrid() {
  return (
    <div className="mt-5 grid gap-4">
      {authosTools.map((tool) => {
        const isAvailable = tool.status === "available";

        return (
          <Link
            key={tool.id}
            href={tool.href}
            className={cn(
              "border-border bg-surface-muted block rounded-md border p-4 transition-colors",
              isAvailable && "hover:bg-surface hover:border-brand/40",
              !isAvailable && "pointer-events-none opacity-60",
            )}
          >
            <ToolCardHeader tool={tool} />
          </Link>
        );
      })}
    </div>
  );
}


function ToolCardHeader({ tool }: { tool: (typeof authosTools)[number] }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-foreground text-sm font-semibold">{tool.title}</p>
        <span
          className={cn(
            "text-xs font-medium tracking-[0.14em] uppercase",
            tool.status === "available" ? "text-positive" : "text-muted-foreground",
          )}
        >
          {tool.status === "available" ? "Available" : "Coming soon"}
        </span>
      </div>
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        {tool.description}
      </p>
    </>
  );
}
