import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TerraformPlanVisualizer } from "@/features/terraform-plan";

describe("TerraformPlanVisualizer", () => {
  it("renders the product shell and local-processing privacy notice", () => {
    render(<TerraformPlanVisualizer />);

    expect(
      screen.getByRole("heading", { name: /terraform plan visualizer/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Paste or upload terraform show -json output to review creates, updates, deletes, replacements, risky resources, and blast radius before you apply\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Paste JSON/i }),
    ).toBeInTheDocument();
    const privacyNotice = screen.getByLabelText(/^Privacy notice$/i);

    expect(
      within(privacyNotice).getByText(
        /Local processing: your plan is parsed in this browser tab\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Analyze a Terraform plan to see the change summary\./i),
    ).toBeInTheDocument();
  });

  it("loads the risky sample and analyzes it", async () => {
    render(<TerraformPlanVisualizer />);

    fireEvent.change(screen.getByLabelText(/Load sample plan/i), {
      target: { value: "riskyPlan" },
    });

    expect(
      screen.getByDisplayValue(/"module\.network\.aws_security_group\.web"/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Parsing/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getAllByText(/Success/i).length).toBeGreaterThan(0);
    });
    const outputPanel = screen.getByLabelText(/Analysis output/i);

    expect(
      screen.getAllByText(/module\.network\.aws_security_group\.web/i).length,
    ).toBeGreaterThan(0);
    expect(
      within(outputPanel).getByText(/Total resource changes/i),
    ).toBeInTheDocument();
    expect(
      within(outputPanel).getByText(/Provider breakdown/i),
    ).toBeInTheDocument();
    expect(
      within(outputPanel).getByText(/Output changes/i),
    ).toBeInTheDocument();
    expect(
      within(outputPanel).getByText(/Terraform metadata/i),
    ).toBeInTheDocument();
    expect(
      within(outputPanel).getAllByText(/module\.network/i).length,
    ).toBeGreaterThan(0);
    expect(
      within(outputPanel).getByRole("heading", { name: /Risk findings/i }),
    ).toBeInTheDocument();
    expect(
      within(outputPanel).getByRole("button", {
        name: /Copy all high-risk findings/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(outputPanel).getByRole("heading", { name: /Resource changes/i }),
    ).toBeInTheDocument();
    expect(
      within(outputPanel).getByRole("table", {
        name: /Terraform resource changes/i,
      }),
    ).toBeInTheDocument();

    const resourceTable = within(outputPanel).getByRole("table", {
      name: /Terraform resource changes/i,
    });

    fireEvent.click(
      within(resourceTable).getByText(/aws_s3_bucket_policy\.logs/i),
    );

    expect(
      screen.getByRole("dialog", { name: /aws_s3_bucket_policy\.logs/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Overview/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /aws_s3_bucket_policy\.logs/i }),
      ).not.toBeInTheDocument();
    });

    fireEvent.click(
      within(outputPanel).getAllByRole("button", {
        name: /module\.network\.aws_security_group\.web/i,
      })[0],
    );

    expect(
      screen.getByRole("dialog", {
        name: /module\.network\.aws_security_group\.web/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Findings/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("shows a friendly invalid JSON error", async () => {
    render(<TerraformPlanVisualizer />);

    fireEvent.change(screen.getByLabelText(/Terraform plan JSON/i), {
      target: { value: "{not valid json" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Analyze plan/i }));
    const outputPanel = screen.getByLabelText(/Analysis output/i);

    await waitFor(() => {
      expect(
        within(outputPanel).getByText(/That file could not be parsed as JSON\./i),
      ).toBeInTheDocument();
    });

    expect(
      within(outputPanel).getByText(
        /This is not valid JSON\. Generate a plan with: terraform show -json tfplan > plan\.json/i,
      ),
    ).toBeInTheDocument();
  });
});
