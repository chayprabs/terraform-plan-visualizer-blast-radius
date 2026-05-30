import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TerraformPlanVisualizer } from "@/features/terraform-plan";
import HomePage, { metadata } from "@/app/page";
import { getAbsoluteUrl, getSiteUrl, siteConfig } from "@/lib/site";

describe("TerraformPlanVisualizer", () => {
  it("renders the workspace shell and local-processing privacy notice", () => {
    render(<TerraformPlanVisualizer variant="workspace" />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /terraform plan visualizer/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Paste JSON/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^CI$/i })).toBeInTheDocument();
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

  it("renders marketing sections only in full variant", () => {
    render(<TerraformPlanVisualizer variant="full" />);

    expect(
      screen.getByRole("heading", { name: /three steps to a review-ready plan/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /How to generate Terraform plan JSON/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Terraform HCL Linter/i)).toBeInTheDocument();
  });

  it("publishes route metadata and FAQ schema on the home page", () => {
    expect(metadata.title).toBe(
      "Terraform Plan Visualizer - Blast-Radius Analyzer for terraform show -json",
    );
    expect(metadata.description).toBe(siteConfig.description);
    expect(metadata.openGraph?.title).toBe(
      "Terraform Plan Visualizer - Blast-Radius Analyzer for terraform show -json",
    );
    expect(metadata.openGraph?.description).toBe(siteConfig.description);
    expect(metadata.alternates?.canonical).toBe(
      getAbsoluteUrl(siteConfig.links.home),
    );
    expect(metadata.metadataBase?.toString()).toBe(`${getSiteUrl()}/`);

    const { container } = render(<HomePage />);
    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );

    expect(schemaScript).not.toBeNull();

    const schema = JSON.parse(schemaScript?.textContent ?? "{}") as {
      "@type"?: string;
      mainEntity?: Array<{ name: string }>;
    };

    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity?.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        "What input does this Terraform plan visualizer accept?",
        "Does my Terraform plan get uploaded?",
        "How do I generate Terraform plan JSON?",
        "Can this detect destructive Terraform changes?",
        "Why are some dependencies missing from the graph?",
      ]),
    );
  });

  it("loads the risky sample and analyzes it", async () => {
    render(<TerraformPlanVisualizer variant="workspace" />);

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
    render(<TerraformPlanVisualizer variant="workspace" />);

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
