export type AuthosToolStatus = "available" | "coming-soon";

export interface AuthosToolDefinition {
  description: string;
  href: string;
  id: string;
  status: AuthosToolStatus;
  title: string;
}

export const authosTools: AuthosToolDefinition[] = [
  {
    id: "terraform-plan-visualizer",
    title: "Terraform Plan Visualizer",
    description:
      "Review terraform show -json plans with risk findings, blast radius, and exports.",
    href: "/tools/terraform-plan-visualizer",
    status: "available",
  },
  {
    id: "secrets-redactor",
    title: "Secrets Redactor",
    description:
      "Strip tokens, credentials, and sensitive values from logs and reports before sharing.",
    href: "/tools/secrets-redactor",
    status: "available",
  },
  {
    id: "github-actions-analyzer",
    title: "GitHub Actions Workflow Analyzer",
    description:
      "Review workflow permissions, secret handling, and cache or artifact behavior.",
    href: "/tools/github-actions-analyzer",
    status: "available",
  },
  {
    id: "kubernetes-manifest-analyzer",
    title: "Kubernetes Manifest Analyzer",
    description:
      "Inspect Kubernetes YAML for risky updates, missing safeguards, and rollout impact.",
    href: "/tools/kubernetes-manifest-analyzer",
    status: "available",
  },
  {
    id: "terraform-hcl-linter",
    title: "Terraform HCL Linter",
    description:
      "Lint Terraform modules and generate reviewer-friendly module documentation.",
    href: "/tools/terraform-hcl-linter",
    status: "available",
  },
];

export const availableAuthosTools = authosTools.filter(
  (tool) => tool.status === "available",
);
