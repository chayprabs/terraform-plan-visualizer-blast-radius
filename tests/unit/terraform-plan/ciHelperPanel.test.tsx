import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CiHelperPanel } from "@/features/terraform-plan/components/ci/CiHelperPanel";

const writeText = vi.fn();

describe("CiHelperPanel", () => {
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

  it("generates copyable local commands and CI snippets without claiming direct integration", async () => {
    render(<CiHelperPanel />);
    const getLocalSnippet = () =>
      screen.getByLabelText(/Local shell commands/i, {
        selector: "pre",
      });

    expect(getLocalSnippet()).toHaveTextContent("terraform init");
    expect(getLocalSnippet()).toHaveTextContent("terraform plan -out=tfplan");
    expect(getLocalSnippet()).toHaveTextContent(
      "terraform show -json tfplan > plan.json",
    );

    fireEvent.change(screen.getByLabelText(/Workspace directory/i), {
      target: { value: "infra/review" },
    });
    fireEvent.change(screen.getByLabelText(/Plan file name/i), {
      target: { value: "review.tfplan" },
    });
    fireEvent.change(screen.getByLabelText(/Output file name/i), {
      target: { value: "review-plan.json" },
    });
    fireEvent.click(screen.getByLabelText(/Select Terraform workspace/i));
    fireEvent.change(screen.getByLabelText(/Terraform workspace name/i), {
      target: { value: "staging" },
    });

    expect(getLocalSnippet()).toHaveTextContent("cd infra/review");
    expect(getLocalSnippet()).toHaveTextContent(
      "terraform workspace select staging",
    );
    expect(getLocalSnippet()).toHaveTextContent(
      "terraform show -json review.tfplan > review-plan.json",
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Copy local shell commands/i }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        [
          "cd infra/review",
          "terraform init",
          "terraform workspace select staging",
          "terraform plan -out=review.tfplan",
          "terraform show -json review.tfplan > review-plan.json",
        ].join("\n"),
      );
    });

    fireEvent.click(screen.getByRole("tab", { name: /GitHub Actions/i }));

    expect(
      screen.getByLabelText(/GitHub Actions YAML/i),
    ).toHaveTextContent("actions/upload-artifact@v4");
    expect(
      screen.getByLabelText(/GitHub Actions YAML/i),
    ).toHaveTextContent("Do not upload plan.json from public repositories");

    fireEvent.click(screen.getByRole("tab", { name: /GitLab CI/i }));

    expect(screen.getByLabelText(/GitLab CI YAML/i)).toHaveTextContent(
      "artifacts:",
    );

    fireEvent.click(screen.getByRole("tab", { name: /PR review/i }));

    expect(
      screen.getByLabelText(/PR review template/i, { selector: "pre" }),
    ).toHaveTextContent(
      "This tool does not publish comments to GitHub or GitLab directly yet.",
    );
    expect(
      screen.getByLabelText(/PR review template/i, { selector: "pre" }),
    ).toHaveTextContent(
      "Copy Markdown report",
    );
  });
});
