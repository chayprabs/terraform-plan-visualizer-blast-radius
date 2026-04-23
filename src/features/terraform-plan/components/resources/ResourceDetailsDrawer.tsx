"use client";

import { startTransition, useEffect, useId, useState } from "react";
import { usePrivacyRedaction } from "@/features/terraform-plan/components/privacy/PrivacyRedactionContext";
import type { NormalizedResourceChange } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { ResourceDependencyTab } from "@/features/terraform-plan/components/resources/ResourceDependencyTab";
import { ResourceDetailsHeader } from "@/features/terraform-plan/components/resources/ResourceDetailsHeader";
import { ResourceDiffTab } from "@/features/terraform-plan/components/resources/ResourceDiffTab";
import { ResourceFindingsTab } from "@/features/terraform-plan/components/resources/ResourceFindingsTab";
import { ResourceOverviewTab } from "@/features/terraform-plan/components/resources/ResourceOverviewTab";
import { ResourceRawJsonTab } from "@/features/terraform-plan/components/resources/ResourceRawJsonTab";
import { redactText } from "@/features/terraform-plan/privacy/redactTerraformPlan";
import { cn } from "@/lib/utils";

export type ResourceDetailsTabKey =
  | "overview"
  | "diff"
  | "findings"
  | "raw-json"
  | "dependencies";

interface ResourceDetailsDrawerProps {
  activeTab?: ResourceDetailsTabKey;
  initialTab?: ResourceDetailsTabKey;
  onClose: () => void;
  onActiveTabChange?: (tab: ResourceDetailsTabKey) => void;
  resourceChange: NormalizedResourceChange;
}

const RESOURCE_DETAILS_TABS: Array<{
  key: ResourceDetailsTabKey;
  label: string;
}> = [
  { key: "overview", label: "Overview" },
  { key: "diff", label: "Diff" },
  { key: "findings", label: "Findings" },
  { key: "raw-json", label: "Raw JSON" },
  { key: "dependencies", label: "Dependencies" },
];

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

export function ResourceDetailsDrawer({
  activeTab: controlledActiveTab,
  initialTab = "overview",
  onClose,
  onActiveTabChange,
  resourceChange,
}: ResourceDetailsDrawerProps) {
  const { settings } = usePrivacyRedaction();
  const titleId = useId();
  const [activeTabState, setActiveTabState] = useState<ResourceDetailsTabKey>(initialTab);
  const [copyState, setCopyState] = useState<"copied" | "error" | "idle">("idle");
  const resolvedActiveTab = controlledActiveTab ?? activeTabState;

  useEffect(() => {
    if (!controlledActiveTab) {
      startTransition(() => {
        setActiveTabState(initialTab);
      });
    }
  }, [controlledActiveTab, initialTab]);

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopyState("idle"), 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleCopyAddress = async () => {
    const copied = await copyText(
      redactText(resourceChange.address, {
        scope: "export",
        settings,
      }),
    );
    setCopyState(copied ? "copied" : "error");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close resource details"
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="border-border bg-background relative flex h-full w-full flex-col border-l shadow-2xl sm:max-w-3xl"
      >
        <ResourceDetailsHeader
          copyState={copyState}
          onClose={onClose}
          onCopyAddress={() => {
            void handleCopyAddress();
          }}
          resourceChange={resourceChange}
          titleId={titleId}
        />

        <div className="border-border overflow-x-auto border-b px-4 py-3 sm:px-5">
          <div
            className="border-border bg-surface-muted inline-flex min-w-full rounded-lg border p-1 sm:min-w-0"
            role="tablist"
            aria-label="Resource detail tabs"
          >
            {RESOURCE_DETAILS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={resolvedActiveTab === tab.key}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  resolvedActiveTab === tab.key
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  if (!controlledActiveTab) {
                    setActiveTabState(tab.key);
                  }

                  onActiveTabChange?.(tab.key);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {resolvedActiveTab === "overview" ? (
            <ResourceOverviewTab resourceChange={resourceChange} />
          ) : null}
          {resolvedActiveTab === "diff" ? (
            <ResourceDiffTab resourceChange={resourceChange} />
          ) : null}
          {resolvedActiveTab === "findings" ? (
            <ResourceFindingsTab resourceChange={resourceChange} />
          ) : null}
          {resolvedActiveTab === "raw-json" ? (
            <ResourceRawJsonTab resourceChange={resourceChange} />
          ) : null}
          {resolvedActiveTab === "dependencies" ? <ResourceDependencyTab /> : null}
        </div>
      </div>
    </div>
  );
}
