import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import type { TerraformPlan } from "@/features/terraform-plan/domain/terraformPlanTypes";
import { ResourceChangesTable } from "@/features/terraform-plan/components/resources/ResourceChangesTable";
import { riskyPlan, tinyPlan } from "@/features/terraform-plan/fixtures/samplePlans";

const writeText = vi.fn();

function createLargePlanWithNoOps(): TerraformPlan {
  return {
    format_version: "1.3",
    resource_changes: [
      ...Array.from({ length: 22 }, (_, index) => ({
        address: `aws_cloudwatch_log_group.app_${index}`,
        mode: "managed" as const,
        type: "aws_cloudwatch_log_group",
        name: `app_${index}`,
        provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
        change: {
          actions: ["no-op"],
          before: {
            retention_in_days: 30,
          },
          after: {
            retention_in_days: 30,
          },
        },
      })),
      {
        address: "module.compute.aws_instance.api",
        module_address: "module.compute",
        mode: "managed",
        type: "aws_instance",
        name: "api",
        provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
        change: {
          actions: ["update"],
          before: {
            instance_type: "t3.small",
          },
          after: {
            instance_type: "t3.medium",
          },
        },
      },
      {
        address: "module.compute.aws_instance.worker",
        module_address: "module.compute",
        mode: "managed",
        type: "aws_instance",
        name: "worker",
        provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
        change: {
          actions: ["update"],
          before: {
            instance_type: "t3.small",
          },
          after: {
            instance_type: "t3.medium",
          },
        },
      },
    ],
  };
}

describe("ResourceChangesTable", () => {
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

  it("supports deterministic filtering, sorting, copy, and row selection callbacks", async () => {
    const onOpenResource = vi.fn();

    render(
      <ResourceChangesTable
        hasAnalyzed
        normalizedPlan={normalizeTerraformPlan(riskyPlan)}
        onOpenResource={onOpenResource}
      />,
    );

    expect(screen.getByText(/Showing all 4 resources\./i)).toBeInTheDocument();
    const table = screen.getByRole("table", { name: /Terraform resource changes/i });
    const initialRows = within(table).getAllByRole("row").slice(1);

    expect(initialRows[0]).toHaveTextContent(/module\.data\.aws_db_instance\.primary/i);

    fireEvent.change(screen.getByLabelText(/Sort resources/i), {
      target: { value: "address" },
    });
    const addressSortedRows = within(table).getAllByRole("row").slice(1);

    expect(addressSortedRows[0]).toHaveTextContent(/aws_s3_bucket_policy\.logs/i);

    fireEvent.change(screen.getByLabelText(/^Action$/i), {
      target: { value: "replace" },
    });
    expect(screen.getByText(/Showing 1 of 4 resources\./i)).toBeInTheDocument();
    expect(screen.getByText(/module\.data\.aws_db_instance\.primary/i)).toBeInTheDocument();

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

    fireEvent.click(screen.getByText(/module\.data\.aws_db_instance\.primary/i));

    expect(onOpenResource).toHaveBeenCalledWith(
      "module.data.aws_db_instance.primary",
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Copy filtered resource list/i }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(2);
    });

    const copiedList = writeText.mock.calls[1]?.[0] ?? "";

    expect(copiedList).toContain("# Filtered Terraform resources");
    expect(copiedList).toContain("module.data.aws_db_instance.primary");

    fireEvent.change(screen.getByLabelText(/Search resources/i), {
      target: { value: "does-not-exist" },
    });
    expect(
      screen.getByText(/No resources match these filters\./i),
    ).toBeInTheDocument();
  });

  it("shows no-op resources by default for smaller plans", () => {
    render(
      <ResourceChangesTable
        hasAnalyzed
        normalizedPlan={normalizeTerraformPlan(tinyPlan)}
      />,
    );

    expect(screen.getByLabelText(/Include no-op resources/i)).toBeChecked();
    expect(
      screen.getByText(/aws_cloudwatch_log_group\.app/i),
    ).toBeInTheDocument();
  });

  it("hides no-op resources by default for larger plans and lets the user reveal them", () => {
    render(
      <ResourceChangesTable
        hasAnalyzed
        normalizedPlan={normalizeTerraformPlan(createLargePlanWithNoOps())}
      />,
    );

    const noOpToggle = screen.getByLabelText(/Include no-op resources/i);

    expect(noOpToggle).not.toBeChecked();
    expect(
      screen.getByText(/No-op resources are hidden by default for larger plans\./i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/aws_cloudwatch_log_group\.app_0/i),
    ).not.toBeInTheDocument();

    fireEvent.click(noOpToggle);

    expect(screen.getByText(/aws_cloudwatch_log_group\.app_0/i)).toBeInTheDocument();
  });
});
