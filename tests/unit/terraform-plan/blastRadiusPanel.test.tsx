import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BlastRadiusPanel } from "@/features/terraform-plan/components/blast-radius/BlastRadiusPanel";
import { buildBlastRadiusAnalysis } from "@/features/terraform-plan/components/blast-radius/blastRadiusModel";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import { riskyPlan } from "@/features/terraform-plan/fixtures/samplePlans";
import { createBlastRadiusPlan } from "./blastRadiusTestPlan";

const writeText = vi.fn();

describe("BlastRadiusPanel", () => {
  beforeEach(() => {
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);

    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText,
      },
    });
  });

  it("renders dependency paths and copies a Markdown summary", async () => {
    const normalizedPlan = normalizeTerraformPlan(
      createBlastRadiusPlan({ includeUnrelatedChanged: false }),
    );
    const analysis = buildBlastRadiusAnalysis(
      normalizedPlan,
      "module.app.aws_instance.api",
    );

    render(
      <BlastRadiusPanel
        analysis={analysis}
        hasAnalyzed
        onSelectFocus={() => undefined}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /module\.app\.aws_instance\.api/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Upstream dependencies/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Downstream dependents/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        /module\.data\.aws_db_instance\.primary -> module\.app\.aws_instance\.api -> module\.edge\.aws_lb_listener\.public/i,
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Copy blast-radius summary/i }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });

    const copiedMarkdown = writeText.mock.calls[0]?.[0] ?? "";

    expect(copiedMarkdown).toContain("# Blast Radius Summary");
    expect(copiedMarkdown).toContain("Focus resource: `module.app.aws_instance.api`");
    expect(copiedMarkdown).toContain("## Suggested reviewer checklist");
    expect(copiedMarkdown).toContain(
      "Confirm backups/snapshots exist for database resources.",
    );
  }, 15000);

  it("explains when dependency data is incomplete", () => {
    const normalizedPlan = normalizeTerraformPlan(riskyPlan);
    const analysis = buildBlastRadiusAnalysis(
      normalizedPlan,
      "module.data.aws_db_instance.primary",
    );

    render(
      <BlastRadiusPanel
        analysis={analysis}
        hasAnalyzed
        onSelectFocus={() => undefined}
      />,
    );

    expect(
      screen.getByText(/Dependency data is incomplete\./i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/No explicit dependency edges were extracted/i).length,
    ).toBeGreaterThan(0);
  });
});
