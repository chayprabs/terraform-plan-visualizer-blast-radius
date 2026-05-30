import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage, { metadata } from "@/app/page";
import { TerraformPlanHome } from "@/features/terraform-plan/terraform-plan-home";
import { getAbsoluteUrl, siteConfig } from "@/lib/site";

describe("TerraformPlanHome", () => {
  it("renders the workspace and local-processing privacy notice", () => {
    render(<TerraformPlanHome />);

    expect(
      screen.getByRole("tab", { name: /Paste JSON/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^CI$/i })).toBeInTheDocument();
    const privacyNotice = screen.getByLabelText(/Workspace privacy notice/i);

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
    render(<TerraformPlanHome />);

    fireEvent.change(screen.getByLabelText(/Load sample plan/i), {
      target: { value: "riskyPlan" },
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Success/i).length).toBeGreaterThan(0);
    });

    const outputPanel = screen.getByLabelText(/Analysis output/i);

    expect(
      within(outputPanel).getByText(/Total resource changes/i),
    ).toBeInTheDocument();
    expect(
      within(outputPanel).getByRole("heading", { name: /Risk findings/i }),
    ).toBeInTheDocument();
  });

  it("shows a friendly invalid JSON error", async () => {
    render(<TerraformPlanHome />);

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
  });
});

describe("HomePage metadata", () => {
  it("publishes route metadata and FAQ schema", () => {
    expect(metadata.title).toContain(siteConfig.name);
    expect(metadata.description).toBe(siteConfig.seoDescription);
    expect(metadata.alternates?.canonical).toBe(getAbsoluteUrl("/"));

    const { container } = render(<HomePage />);
    const schemaScripts = container.querySelectorAll(
      'script[type="application/ld+json"]',
    );

    expect(schemaScripts.length).toBeGreaterThanOrEqual(1);

    const faqSchema = JSON.parse(schemaScripts[0]?.textContent ?? "{}") as {
      "@type"?: string;
    };

    expect(faqSchema["@type"]).toBe("FAQPage");
  });
});
