import type { Metadata } from "next";
import { TerraformPlanVisualizer } from "@/features/terraform-plan";

export const metadata: Metadata = {
  title: "Terraform Plan Visualizer and Blast-Radius Analyzer",
  description:
    "Visualize Terraform plan JSON, inspect resource changes, detect destructive infrastructure risk, and export a PR-ready blast-radius report.",
  openGraph: {
    title: "Terraform Plan Visualizer and Blast-Radius Analyzer",
    description:
      "Visualize Terraform plan JSON, inspect resource changes, detect destructive infrastructure risk, and export a PR-ready blast-radius report.",
  },
};

export default function TerraformPlanVisualizerPage() {
  return <TerraformPlanVisualizer />;
}
