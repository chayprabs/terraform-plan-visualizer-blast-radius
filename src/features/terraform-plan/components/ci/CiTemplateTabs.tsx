"use client";

import { useState } from "react";
import { CommandSnippet } from "@/features/terraform-plan/components/ci/CommandSnippet";
import { cn } from "@/lib/utils";

export type CiTemplateTabKey =
  | "github-actions"
  | "gitlab-ci"
  | "local"
  | "pr-comment";

interface CiTemplateTabsProps {
  githubActionsSnippet: string;
  gitlabCiSnippet: string;
  localCommandSnippet: string;
  prCommentTemplate: string;
}

const templateTabs: Array<{
  description: string;
  key: CiTemplateTabKey;
  label: string;
}> = [
  {
    key: "local",
    label: "Local commands",
    description:
      "Generate the `terraform plan` and `terraform show -json` flow locally before you upload a report or artifact.",
  },
  {
    key: "github-actions",
    label: "GitHub Actions",
    description:
      "Run Terraform in CI and upload `plan.json` as a build artifact for later download and local analysis.",
  },
  {
    key: "gitlab-ci",
    label: "GitLab CI",
    description:
      "Keep the flow generic and artifact-based so reviewers can still analyze the exported JSON locally.",
  },
  {
    key: "pr-comment",
    label: "PR review",
    description:
      "This tool does not post to GitHub or GitLab directly yet. Copy a redacted export and paste it into the PR manually.",
  },
];

export function CiTemplateTabs({
  githubActionsSnippet,
  gitlabCiSnippet,
  localCommandSnippet,
  prCommentTemplate,
}: CiTemplateTabsProps) {
  const [activeTab, setActiveTab] = useState<CiTemplateTabKey>("local");

  const tabMeta = templateTabs.find((tab) => tab.key === activeTab) ?? templateTabs[0]!;

  return (
    <section className="space-y-4">
      <div
        className="border-border flex flex-wrap gap-2 border-b pb-3"
        role="tablist"
        aria-label="CI helper templates"
      >
        {templateTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-controls={`ci-template-panel-${tab.key}`}
            aria-selected={activeTab === tab.key}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-brand text-brand-foreground"
                : "bg-background text-muted-foreground hover:bg-surface-muted",
            )}
            id={`ci-template-tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id={`ci-template-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`ci-template-tab-${activeTab}`}
      >
        {activeTab === "local" ? (
          <CommandSnippet
            code={localCommandSnippet}
            copyLabel="Copy local shell commands"
            description={tabMeta.description}
            label="Local shell commands"
            language="bash"
          />
        ) : null}

        {activeTab === "github-actions" ? (
          <CommandSnippet
            code={githubActionsSnippet}
            copyLabel="Copy GitHub Actions snippet"
            description={tabMeta.description}
            label="GitHub Actions YAML"
            language="yaml"
          />
        ) : null}

        {activeTab === "gitlab-ci" ? (
          <CommandSnippet
            code={gitlabCiSnippet}
            copyLabel="Copy GitLab CI snippet"
            description={tabMeta.description}
            label="GitLab CI YAML"
            language="yaml"
          />
        ) : null}

        {activeTab === "pr-comment" ? (
          <CommandSnippet
            code={prCommentTemplate}
            copyLabel="Copy PR review template"
            description={tabMeta.description}
            label="PR review template"
            language="markdown"
          />
        ) : null}
      </div>
    </section>
  );
}
