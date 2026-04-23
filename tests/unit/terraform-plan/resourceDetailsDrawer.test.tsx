import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import { ResourceDetailsDrawer } from "@/features/terraform-plan/components/resources/ResourceDetailsDrawer";
import { riskyPlan } from "@/features/terraform-plan/fixtures/samplePlans";

const writeText = vi.fn();

const normalizedRiskyPlan = normalizeTerraformPlan(riskyPlan);

function getResourceChange(address: string) {
  const resourceChange = normalizedRiskyPlan.resourceChanges.find(
    (entry) => entry.address === address,
  );

  if (!resourceChange) {
    throw new Error(`Expected resource change for ${address}`);
  }

  return resourceChange;
}

describe("ResourceDetailsDrawer", () => {
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

  it("supports tabs, copies the resource address, and closes on Escape", async () => {
    const onClose = vi.fn();

    render(
      <ResourceDetailsDrawer
        initialTab="findings"
        onClose={onClose}
        resourceChange={getResourceChange("module.data.aws_db_instance.primary")}
      />,
    );

    expect(
      screen.getByRole("dialog", {
        name: /module\.data\.aws_db_instance\.primary/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Findings/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText(/Database replacement detected/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Copy resource address module\.data\.aws_db_instance\.primary/i,
      }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "module.data.aws_db_instance.primary",
      );
    });

    fireEvent.click(screen.getByRole("tab", { name: /Overview/i }));
    expect(
      screen.getByText(/This aws_db_instance will be replaced\./i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /^Diff$/i }));
    expect(
      screen.getByRole("button", { name: /Copy diff as Markdown/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Dependencies/i }));
    expect(
      screen.getByText(
        /Dependency graph will show upstream and downstream impact after graph analysis is enabled\./i,
      ),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  }, 15000);

  it("never renders or copies raw sensitive values in the raw JSON tab", async () => {
    render(
      <ResourceDetailsDrawer
        onClose={() => undefined}
        resourceChange={getResourceChange("aws_s3_bucket_policy.logs")}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /Raw JSON/i }));

    expect(screen.queryByText(/old-bucket-policy/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/new-bucket-policy/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/\[sensitive value\]/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Copy redacted JSON/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });

    const copiedJson = writeText.mock.calls[0]?.[0] ?? "";

    expect(copiedJson).toContain("[sensitive value]");
    expect(copiedJson).not.toContain("old-bucket-policy");
    expect(copiedJson).not.toContain("new-bucket-policy");
  });
});
