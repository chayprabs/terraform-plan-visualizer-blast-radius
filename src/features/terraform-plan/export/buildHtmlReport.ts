import {
  formatCostThresholdSummary,
  formatCurrencyAmount,
  formatMonthlyDelta,
} from "@/features/terraform-plan/cost/costUtils";
import { getRiskActionLabel, getRiskCategoryLabel, getRiskSeverityLabel } from "@/features/terraform-plan/risk/riskCopy";
import type {
  TerraformPlanExportCostImpact,
  TerraformPlanExportData,
  TerraformPlanExportFinding,
  TerraformPlanExportResourceChange,
} from "@/features/terraform-plan/export/exportTypes";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSeverity(severity: string | null): string {
  return severity ? getRiskSeverityLabel(severity as Parameters<typeof getRiskSeverityLabel>[0]) : "None";
}

function formatCostSource(source: TerraformPlanExportCostImpact["source"]): string {
  switch (source) {
    case "infracost":
      return "Imported Infracost JSON";
    case "manual":
      return "Manual estimate";
    case "mixed":
    default:
      return "Imported + manual estimate";
  }
}

function renderFinding(finding: TerraformPlanExportFinding): string {
  return [
    "<li>",
    `<h3>${escapeHtml(finding.title)}</h3>`,
    `<p><strong>Severity:</strong> ${escapeHtml(formatSeverity(finding.severity))} <strong>Category:</strong> ${escapeHtml(getRiskCategoryLabel(finding.category))} <strong>Action:</strong> ${escapeHtml(getRiskActionLabel(finding.actionKind))}</p>`,
    `<p><strong>Resource:</strong> ${escapeHtml(finding.resourceAddress ?? "plan-wide")}</p>`,
    `<p>${escapeHtml(finding.explanation)}</p>`,
    `<p><strong>Evidence:</strong> ${escapeHtml(finding.evidence.join(" ") || "No supporting evidence included.")}</p>`,
    `<p><strong>Suggested review:</strong> ${escapeHtml(finding.suggestion)}</p>`,
    "</li>",
  ].join("");
}

function renderResourceRows(resources: TerraformPlanExportResourceChange[]): string {
  if (resources.length === 0) {
    return '<tr><td colspan="7">None identified.</td></tr>';
  }

  return resources
    .map(
      (resource) => `
        <tr>
          <td>${escapeHtml(getRiskActionLabel(resource.action))}</td>
          <td>${escapeHtml(resource.address)}</td>
          <td>${escapeHtml(resource.type)}</td>
          <td>${escapeHtml(resource.provider)}</td>
          <td>${escapeHtml(resource.module)}</td>
          <td>${escapeHtml(formatSeverity(resource.highestSeverity))}</td>
          <td>${escapeHtml(resource.replacePaths.join(", ") || "n/a")}</td>
        </tr>
      `,
    )
    .join("");
}

export function buildHtmlReport(exportData: TerraformPlanExportData): string {
  const topFindingsMarkup =
    exportData.topFindings.length > 0
      ? exportData.topFindings.map((finding) => renderFinding(finding)).join("")
      : "<li>No critical or high-severity findings were included.</li>";
  const blastRadiusMarkup = exportData.blastRadius
    ? `
      <section>
        <h2>Blast-Radius Summary</h2>
        <ul>
          <li><strong>Focus resource:</strong> ${escapeHtml(exportData.blastRadius.focusResource)}</li>
          <li><strong>Overall risk:</strong> ${escapeHtml(formatSeverity(exportData.blastRadius.overallRisk === "none" ? null : exportData.blastRadius.overallRisk))}</li>
          <li><strong>Direct changes in radius:</strong> ${exportData.blastRadius.directChangesCount}</li>
          <li><strong>Downstream dependents:</strong> ${exportData.blastRadius.downstreamDependentsCount}</li>
          <li><strong>Total resources in radius:</strong> ${exportData.blastRadius.totalResourcesInRadius}</li>
          <li><strong>High-risk resources:</strong> ${escapeHtml(exportData.blastRadius.highRiskResources.join(", ") || "none")}</li>
          ${
            exportData.blastRadius.dependencyCaveat
              ? `<li><strong>Dependency caveat:</strong> ${escapeHtml(exportData.blastRadius.dependencyCaveat)}</li>`
              : ""
          }
        </ul>
      </section>
    `
    : "";
  const costImpactMarkup = exportData.costImpact
    ? `
      <section>
        <h2>Cost Impact</h2>
        <div class="card">
          <p><strong>Source:</strong> ${escapeHtml(
            formatCostSource(exportData.costImpact.source),
          )}</p>
          <p><strong>Monthly delta:</strong> ${escapeHtml(
            formatMonthlyDelta(
              exportData.costImpact.totalMonthlyDelta,
              exportData.costImpact.currency,
            ),
          )}</p>
          <p><strong>Monthly cost before:</strong> ${escapeHtml(
            formatCurrencyAmount(
              exportData.costImpact.totalMonthlyCostBefore,
              exportData.costImpact.currency,
            ),
          )}</p>
          <p><strong>Monthly cost after:</strong> ${escapeHtml(
            formatCurrencyAmount(
              exportData.costImpact.totalMonthlyCostAfter,
              exportData.costImpact.currency,
            ),
          )}</p>
          <p><strong>Mapped resources:</strong> ${
            exportData.costImpact.mappedResourceCount
          }</p>
          <p><strong>Thresholds:</strong> ${escapeHtml(
            formatCostThresholdSummary(
              exportData.costImpact.thresholds,
              exportData.costImpact.currency,
            ),
          )}</p>
          ${
            exportData.costImpact.note
              ? `<p><strong>Reviewer note:</strong> ${escapeHtml(
                  exportData.costImpact.note,
                )}</p>`
              : ""
          }
        </div>
        ${
          exportData.costImpact.resourceEntries.length > 0
            ? `
              <table>
                <thead>
                  <tr>
                    <th>Resource</th>
                    <th>Delta/mo</th>
                    <th>Before/mo</th>
                    <th>After/mo</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  ${exportData.costImpact.resourceEntries
                    .map(
                      (entry) => `
                        <tr>
                          <td>${escapeHtml(entry.address ?? entry.name ?? "unmapped")}</td>
                          <td>${escapeHtml(
                            formatMonthlyDelta(entry.monthlyDelta, entry.currency),
                          )}</td>
                          <td>${escapeHtml(
                            formatCurrencyAmount(
                              entry.monthlyCostBefore,
                              entry.currency,
                            ),
                          )}</td>
                          <td>${escapeHtml(
                            formatCurrencyAmount(
                              entry.monthlyCostAfter,
                              entry.currency,
                            ),
                          )}</td>
                          <td>${escapeHtml(formatCostSource(entry.source))}</td>
                        </tr>
                      `,
                    )
                    .join("")}
                </tbody>
              </table>
            `
            : '<p class="small">No per-resource cost mappings were attached.</p>'
        }
      </section>
    `
    : "";

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(exportData.title)}</title>
    <style>
      :root {
        color-scheme: light;
        --border: #d0d7de;
        --muted: #57606a;
        --surface: #f6f8fa;
        --text: #1f2328;
        --accent: #0969da;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 32px;
        background: white;
        color: var(--text);
        font: 15px/1.6 "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      }
      main {
        max-width: 1040px;
        margin: 0 auto;
      }
      section {
        margin-top: 24px;
        break-inside: avoid;
      }
      h1, h2, h3 {
        margin: 0 0 12px;
        line-height: 1.25;
      }
      h1 {
        font-size: 32px;
      }
      h2 {
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border);
        font-size: 22px;
      }
      h3 {
        font-size: 17px;
      }
      p, ul, ol {
        margin: 0 0 12px;
      }
      .meta,
      .card {
        padding: 16px 18px;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--surface);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
      }
      th,
      td {
        padding: 10px 12px;
        border: 1px solid var(--border);
        text-align: left;
        vertical-align: top;
      }
      th {
        background: var(--surface);
      }
      code {
        font-family: "Cascadia Code", Consolas, monospace;
        font-size: 0.94em;
      }
      .small {
        color: var(--muted);
        font-size: 13px;
      }
      @media print {
        body {
          padding: 0;
        }
        section,
        .meta,
        .card,
        table {
          break-inside: avoid;
        }
        a {
          color: inherit;
          text-decoration: none;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>${escapeHtml(exportData.title)}</h1>
        <div class="meta">
          <p><strong>Generated:</strong> ${escapeHtml(exportData.source.generatedAt)}</p>
          <p><strong>Source:</strong> ${escapeHtml(exportData.source.name)}</p>
          <p><strong>Terraform version:</strong> ${escapeHtml(exportData.source.terraformVersion ?? "unknown")}</p>
          <p><strong>Plan timestamp:</strong> ${escapeHtml(exportData.source.planTimestamp ?? "unknown")}</p>
        </div>
      </header>

      <section>
        <h2>Privacy &amp; Redaction</h2>
        <div class="card">
          <p>${escapeHtml(exportData.privacy.note)}</p>
          <ul>${exportData.privacy.appliedRedactions
            .map((item) => `<li><input type="checkbox" disabled /> ${escapeHtml(item)}</li>`)
            .join("")}</ul>
        </div>
      </section>

      <section>
        <h2>Plan Summary</h2>
        <table>
          <thead>
            <tr><th>Metric</th><th>Value</th></tr>
          </thead>
          <tbody>
            <tr><td>Total resource changes</td><td>${exportData.summary.totalResourceChanges}</td></tr>
            <tr><td>Creates</td><td>${exportData.summary.createCount}</td></tr>
            <tr><td>Updates</td><td>${exportData.summary.updateCount}</td></tr>
            <tr><td>Deletes</td><td>${exportData.summary.deleteCount}</td></tr>
            <tr><td>Replacements</td><td>${exportData.summary.replaceCount}</td></tr>
            <tr><td>Imports</td><td>${exportData.summary.importCount}</td></tr>
            <tr><td>Output changes</td><td>${exportData.summary.totalOutputChanges}</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Overall Risk Score</h2>
        <div class="card">
          <p><strong>Score:</strong> ${exportData.overallRisk.score}/100</p>
          <p><strong>Level:</strong> ${escapeHtml(exportData.overallRisk.level)}</p>
          <p><strong>Highest severity:</strong> ${escapeHtml(formatSeverity(exportData.overallRisk.highestSeverity))}</p>
          <p><strong>Critical/high findings:</strong> ${exportData.overallRisk.highRiskFindingCount}</p>
          <p><strong>Total findings:</strong> ${exportData.overallRisk.totalFindings}</p>
        </div>
      </section>

      ${costImpactMarkup}

      <section>
        <h2>Top Findings</h2>
        <ol>${topFindingsMarkup}</ol>
      </section>

      <section>
        <h2>Destructive Changes</h2>
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Resource</th>
              <th>Type</th>
              <th>Provider</th>
              <th>Module</th>
              <th>Risk</th>
              <th>Replace paths</th>
            </tr>
          </thead>
          <tbody>${renderResourceRows(exportData.destructiveChanges)}</tbody>
        </table>
      </section>

      <section>
        <h2>Replacements</h2>
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Resource</th>
              <th>Type</th>
              <th>Provider</th>
              <th>Module</th>
              <th>Risk</th>
              <th>Replace paths</th>
            </tr>
          </thead>
          <tbody>${renderResourceRows(exportData.replacements)}</tbody>
        </table>
      </section>

      <section>
        <h2>Provider Summary</h2>
        <table>
          <thead>
            <tr><th>Provider</th><th>Resources</th><th>Destructive</th><th>Resource types</th></tr>
          </thead>
          <tbody>
            ${exportData.providers
              .map(
                (provider) => `
                  <tr>
                    <td>${escapeHtml(provider.shortName)}</td>
                    <td>${provider.resourceCount}</td>
                    <td>${provider.destructiveCount}</td>
                    <td>${escapeHtml(provider.resourceTypes.join(", ") || "n/a")}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Module Summary</h2>
        <table>
          <thead>
            <tr><th>Module</th><th>Depth</th><th>Resources</th><th>Destructive</th></tr>
          </thead>
          <tbody>
            ${exportData.modules
              .map(
                (module) => `
                  <tr>
                    <td>${escapeHtml(module.address)}</td>
                    <td>${module.depth}</td>
                    <td>${module.resourceCount}</td>
                    <td>${module.destructiveCount}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </section>

      ${blastRadiusMarkup}

      <section>
        <h2>Reviewer Checklist</h2>
        <ul>${exportData.reviewerChecklist
          .map((item) => `<li><input type="checkbox" disabled /> ${escapeHtml(item)}</li>`)
          .join("")}</ul>
      </section>

      <p class="small">Schema version: ${escapeHtml(exportData.schemaVersion)}</p>
    </main>
  </body>
</html>
  `.trim();
}
