"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ToolWorkspaceLayoutProps {
  className?: string;
  guideSections?: ReactNode;
  hero?: ReactNode;
  inputPanel: ReactNode;
  outputPanel: ReactNode;
}

export function ToolWorkspaceLayout({
  className,
  guideSections,
  hero,
  inputPanel,
  outputPanel,
}: ToolWorkspaceLayoutProps) {
  return (
    <div className={cn("space-y-8", className)}>
      {hero}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">{inputPanel}</div>
        <div className="min-w-0 space-y-4">{outputPanel}</div>
      </div>
      {guideSections}
    </div>
  );
}
