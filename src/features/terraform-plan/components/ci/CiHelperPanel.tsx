"use client";

import { useMemo, useState } from "react";
import { CiTemplateTabs } from "@/features/terraform-plan/components/ci/CiTemplateTabs";

function normalizeShellPath(value: string): string {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : ".";
}

function normalizeFileName(value: string, fallback: string): string {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : fallback;
}

function quoteShellValue(value: string): string {
  return /^[./\w-]+$/.test(value) ? value : `"${value.replaceAll('"', '\\"')}"`;
}

function buildLocalCommandSnippet(options: {
  includeInit: boolean;
  includeWorkspaceSelect: boolean;
  outputFileName: string;
  planFileName: string;
  workspaceDirectory: string;
  workspaceName: string;
}): string {
  const lines = [`cd ${quoteShellValue(options.workspaceDirectory)}`];

  if (options.includeInit) {
    lines.push("terraform init");
  }

  if (options.includeWorkspaceSelect) {
    lines.push(`terraform workspace select ${quoteShellValue(options.workspaceName)}`);
  }

  lines.push(`terraform plan -out=${quoteShellValue(options.planFileName)}`);
  lines.push(
    `terraform show -json ${quoteShellValue(options.planFileName)} > ${quoteShellValue(options.outputFileName)}`,
  );

  return lines.join("\n");
}

function buildGithubActionsSnippet(options: {
  includeInit: boolean;
  includeWorkspaceSelect: boolean;
  outputFileName: string;
  planFileName: string;
  workspaceDirectory: string;
  workspaceName: string;
}): string {
  const steps = [
    "# Treat plan artifacts as sensitive review data.",
    "# Do not upload plan.json from public repositories unless the contents are safe to share.",
    "jobs:",
    "  terraform-plan:",
    "    runs-on: ubuntu-latest",
    "    permissions:",
    "      contents: read",
    "    steps:",
    "      - name: Checkout repository",
    "        uses: actions/checkout@v5",
    "      - name: Setup Terraform",
    "        uses: hashicorp/setup-terraform@v4",
  ];

  if (options.includeInit) {
    steps.push(
      "      - name: Terraform init",
      `        working-directory: ${quoteShellValue(options.workspaceDirectory)}`,
      "        run: terraform init",
    );
  }

  if (options.includeWorkspaceSelect) {
    steps.push(
      "      - name: Terraform workspace select",
      `        working-directory: ${quoteShellValue(options.workspaceDirectory)}`,
      `        run: terraform workspace select ${quoteShellValue(options.workspaceName)}`,
    );
  }

  steps.push(
    "      - name: Terraform plan",
    `        working-directory: ${quoteShellValue(options.workspaceDirectory)}`,
    `        run: terraform plan -out=${quoteShellValue(options.planFileName)}`,
    "      - name: Export Terraform plan JSON",
    `        working-directory: ${quoteShellValue(options.workspaceDirectory)}`,
    `        run: terraform show -json ${quoteShellValue(options.planFileName)} > ${quoteShellValue(options.outputFileName)}`,
    "      - name: Upload plan artifact",
    "        uses: actions/upload-artifact@v4",
    "        with:",
    "          name: terraform-plan-json",
    `          path: ${quoteShellValue(`${options.workspaceDirectory}/${options.outputFileName}`)}`,
    "          retention-days: 5",
  );

  return steps.join("\n");
}

function buildGitlabCiSnippet(options: {
  includeInit: boolean;
  includeWorkspaceSelect: boolean;
  outputFileName: string;
  planFileName: string;
  workspaceDirectory: string;
  workspaceName: string;
}): string {
  const scriptLines = [`cd ${quoteShellValue(options.workspaceDirectory)}`];

  if (options.includeInit) {
    scriptLines.push("terraform init");
  }

  if (options.includeWorkspaceSelect) {
    scriptLines.push(`terraform workspace select ${quoteShellValue(options.workspaceName)}`);
  }

  scriptLines.push(`terraform plan -out=${quoteShellValue(options.planFileName)}`);
  scriptLines.push(
    `terraform show -json ${quoteShellValue(options.planFileName)} > ${quoteShellValue(options.outputFileName)}`,
  );

  return [
    "# Treat plan artifacts as sensitive review data.",
    "# Do not expose plan.json publicly unless the contents are safe to share.",
    "terraform_plan:",
    "  stage: plan",
    "  image: hashicorp/terraform:latest",
    "  script:",
    ...scriptLines.map((line) => `    - ${line}`),
    "  artifacts:",
    "    name: terraform-plan-json",
    "    when: always",
    "    expire_in: 5 days",
    "    paths:",
    `      - ${options.workspaceDirectory}/${options.outputFileName}`,
    "  rules:",
    '    - if: $CI_PIPELINE_SOURCE == "merge_request_event"',
  ].join("\n");
}

function buildPrCommentTemplate(options: {
  outputFileName: string;
}): string {
  return [
    "### Terraform plan review",
    "",
    "1. Download the CI artifact that contains the generated Terraform plan JSON.",
    `2. Open the analyzer locally and load \`${options.outputFileName}\`.`,
    "3. Use `Copy Markdown report` or `Copy PR comment` from the Export panel.",
    "4. Paste the redacted Markdown into the PR discussion manually.",
    "",
    "> This tool does not publish comments to GitHub or GitLab directly yet.",
    "",
    "Suggested reviewer note:",
    "",
    "- Plan artifact: downloaded from CI",
    "- Analyzer summary: pasted from the redacted local export",
    "- Review focus: deletes, replacements, risky findings, graph caveats, and cost impact if provided",
  ].join("\n");
}

const troubleshootingNotes = [
  {
    title: "I pasted binary tfplan and got invalid JSON",
    description:
      "The analyzer expects `terraform show -json` output, not the raw binary `tfplan` file. Generate JSON locally with `terraform show -json tfplan > plan.json` and paste or upload that file instead.",
  },
  {
    title: "My plan is too large",
    description:
      "Large plans can exceed the browser-side limit. Try narrowing the plan scope, splitting the rollout, or analyzing the artifact on a machine with more memory before exporting a smaller redacted report.",
  },
  {
    title: "Why are some values unknown?",
    description:
      "Terraform marks some post-apply values as unknown until the provider creates or updates the resource. The analyzer surfaces those unknowns, but it cannot guess values that Terraform itself does not know yet.",
  },
  {
    title: "Why does the graph not show every dependency?",
    description:
      "The graph only includes dependencies that can be inferred from the plan JSON and configuration metadata that Terraform emitted. Hidden provider behavior, dynamic references, or omitted configuration details can leave the graph incomplete.",
  },
];

export function CiHelperPanel() {
  const [workspaceDirectory, setWorkspaceDirectory] = useState(".");
  const [planFileName, setPlanFileName] = useState("tfplan");
  const [outputFileName, setOutputFileName] = useState("plan.json");
  const [includeInit, setIncludeInit] = useState(true);
  const [includeWorkspaceSelect, setIncludeWorkspaceSelect] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("default");

  const normalizedOptions = useMemo(
    () => ({
      includeInit,
      includeWorkspaceSelect,
      outputFileName: normalizeFileName(outputFileName, "plan.json"),
      planFileName: normalizeFileName(planFileName, "tfplan"),
      workspaceDirectory: normalizeShellPath(workspaceDirectory),
      workspaceName: normalizeFileName(workspaceName, "default"),
    }),
    [
      includeInit,
      includeWorkspaceSelect,
      outputFileName,
      planFileName,
      workspaceDirectory,
      workspaceName,
    ],
  );
  const localCommandSnippet = useMemo(
    () => buildLocalCommandSnippet(normalizedOptions),
    [normalizedOptions],
  );
  const githubActionsSnippet = useMemo(
    () => buildGithubActionsSnippet(normalizedOptions),
    [normalizedOptions],
  );
  const gitlabCiSnippet = useMemo(
    () => buildGitlabCiSnippet(normalizedOptions),
    [normalizedOptions],
  );
  const prCommentTemplate = useMemo(
    () => buildPrCommentTemplate(normalizedOptions),
    [normalizedOptions],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">
            CI/CD helper
          </h3>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-7">
            Generate Terraform plan JSON locally or in CI, upload it as an
            artifact, and then analyze it in this tool during PR review.
          </p>
        </div>

        <div className="border-border bg-background rounded-lg border px-3 py-2 text-sm text-muted-foreground">
          Manual workflow guidance only
        </div>
      </div>

      <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
        <h4 className="text-foreground text-sm font-semibold">
          Local command generator
        </h4>
        <p className="text-muted-foreground mt-1 text-sm leading-6">
          Start with the same command shape locally and in CI so the generated
          `plan.json` stays consistent.
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <label className="text-muted-foreground text-sm">
            Workspace directory
            <input
              aria-label="Workspace directory"
              className="border-border bg-background text-foreground mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              onChange={(event) => setWorkspaceDirectory(event.target.value)}
              value={workspaceDirectory}
            />
          </label>
          <label className="text-muted-foreground text-sm">
            Plan file name
            <input
              aria-label="Plan file name"
              className="border-border bg-background text-foreground mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              onChange={(event) => setPlanFileName(event.target.value)}
              value={planFileName}
            />
          </label>
          <label className="text-muted-foreground text-sm">
            Output file name
            <input
              aria-label="Output file name"
              className="border-border bg-background text-foreground mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              onChange={(event) => setOutputFileName(event.target.value)}
              value={outputFileName}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="border-border bg-background flex items-start gap-3 rounded-lg border p-4">
              <input
                checked={includeInit}
                className="border-border mt-1 h-4 w-4 rounded"
                onChange={(event) => setIncludeInit(event.target.checked)}
                type="checkbox"
              />
              <span>
                <span className="text-foreground block text-sm font-medium">
                  Run `terraform init`
                </span>
                <span className="text-muted-foreground mt-1 block text-sm leading-6">
                  Include provider and module initialization in the generated flow.
                </span>
              </span>
            </label>

            <label className="border-border bg-background flex items-start gap-3 rounded-lg border p-4">
              <input
                checked={includeWorkspaceSelect}
                className="border-border mt-1 h-4 w-4 rounded"
                onChange={(event) =>
                  setIncludeWorkspaceSelect(event.target.checked)
                }
                type="checkbox"
              />
              <span>
                <span className="text-foreground block text-sm font-medium">
                  Select Terraform workspace
                </span>
                <span className="text-muted-foreground mt-1 block text-sm leading-6">
                  Add an explicit `terraform workspace select` step.
                </span>
              </span>
            </label>
          </div>
        </div>

        {includeWorkspaceSelect ? (
          <label className="text-muted-foreground mt-3 block text-sm">
            Workspace name
            <input
              aria-label="Terraform workspace name"
              className="border-border bg-background text-foreground mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              onChange={(event) => setWorkspaceName(event.target.value)}
              value={workspaceName}
            />
          </label>
        ) : null}
      </section>

      <CiTemplateTabs
        githubActionsSnippet={githubActionsSnippet}
        gitlabCiSnippet={gitlabCiSnippet}
        localCommandSnippet={localCommandSnippet}
        prCommentTemplate={prCommentTemplate}
      />

      <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
        <h4 className="text-foreground text-sm font-semibold">
          Troubleshooting notes
        </h4>
        <div className="mt-4 grid gap-3">
          {troubleshootingNotes.map((note) => (
            <article
              key={note.title}
              className="border-border bg-background rounded-lg border p-4"
            >
              <h5 className="text-foreground text-sm font-semibold">
                {note.title}
              </h5>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {note.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
