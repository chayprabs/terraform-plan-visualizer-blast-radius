export const workspaceTabs = [
  {
    label: "Paste JSON",
    active: true,
  },
  {
    label: "Upload file",
    active: false,
  },
] as const;

export const summaryCards = [
  {
    title: "Creates",
    value: "--",
    description: "New resources that will be added after apply.",
    tone: "positive",
  },
  {
    title: "Updates",
    value: "--",
    description: "In-place changes across existing infrastructure.",
    tone: "default",
  },
  {
    title: "Deletes",
    value: "--",
    description: "Resources removed or destroyed from the plan.",
    tone: "critical",
  },
  {
    title: "Replacements",
    value: "--",
    description: "Destroy and recreate operations that expand blast radius.",
    tone: "warning",
  },
  {
    title: "High Risk",
    value: "--",
    description:
      "IAM, security, database, and network changes to inspect first.",
    tone: "critical",
  },
] as const;

export const workflowSteps = [
  {
    step: "Step 1",
    title: "Generate a plan JSON.",
    description:
      "Run Terraform locally and convert the saved plan to terraform show -json output.",
  },
  {
    step: "Step 2",
    title: "Paste or upload it.",
    description:
      "Bring the plan into the browser workspace with paste, drag-and-drop upload, or sample fixtures.",
  },
  {
    step: "Step 3",
    title: "Review risk and blast radius.",
    description:
      "Scan the change summary, inspect high-risk resources, and focus on destructive operations first.",
  },
] as const;

export const useCases = [
  "PR review for infrastructure changes.",
  "Catch destructive changes before apply.",
  "Review IAM, security group, database, and network changes.",
  "Create a Markdown summary for code review.",
] as const;

export const faqItems = [
  {
    question: "What input format does Terraform Plan Visualizer expect?",
    answer:
      "The analyzer expects terraform show -json output. You can paste it directly, upload a file, or load a sample plan to preview the workflow.",
  },
  {
    question: "Does the tool upload my Terraform plan anywhere?",
    answer:
      "No. Plan parsing happens in this browser tab, and the current workflow does not send the plan to a backend service.",
  },
  {
    question: "Can I open the workspace directly in the browser?",
    answer:
      "Yes. The route is intended to open directly for infrastructure review as soon as the page loads, without extra gating before you reach the workspace.",
  },
  {
    question:
      "What kinds of risky infrastructure changes will it help surface?",
    answer:
      "The planned review surface focuses on creates, updates, deletes, replacements, and higher-risk areas such as IAM, security group, database, and network changes.",
  },
  {
    question: "Will I be able to export a PR-ready summary?",
    answer:
      "Not yet. The current release focuses on local analysis, summary cards, and hotspot review before export features are added.",
  },
] as const;

export const relatedTools = [
  {
    title: "Terraform Drift Diff",
    description: "Compare drift signals against a reviewed plan before apply.",
    href: "/tools/terraform-drift-diff",
  },
  {
    title: "OpenTofu Plan Visualizer",
    description:
      "Inspect OpenTofu plan JSON with the same local-first review model.",
    href: "/tools/opentofu-plan-visualizer",
  },
  {
    title: "Infra PR Summary Builder",
    description:
      "Turn risk findings and blast radius into a reusable review summary.",
    href: "/tools/infra-pr-summary-builder",
  },
] as const;
