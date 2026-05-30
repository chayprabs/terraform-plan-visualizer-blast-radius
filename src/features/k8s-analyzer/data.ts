export const workflowSteps = [
  {
    step: "Step 1",
    title: "Collect manifests.",
    description:
      "Export rendered YAML from Helm, Kustomize, or kubectl and keep multi-document files together.",
  },
  {
    step: "Step 2",
    title: "Paste or upload them.",
    description:
      "Bring manifests into the browser workspace with paste, drag-and-drop upload, or sample fixtures.",
  },
  {
    step: "Step 3",
    title: "Review risk findings.",
    description:
      "Scan image tags, resource limits, privileged containers, hostPath mounts, RBAC bindings, and API versions.",
  },
] as const;

export const useCases = [
  "Pre-deploy review for Kubernetes YAML changes.",
  "Catch floating image tags before rollout.",
  "Spot privileged containers and hostPath mounts.",
  "Audit cluster-admin bindings and deprecated API versions.",
] as const;

export const faqItems = [
  {
    question: "What input does the Kubernetes Manifest Analyzer accept?",
    answer:
      "The analyzer accepts multi-document Kubernetes YAML. Paste the manifests, upload a .yaml or .yml file, or load a sample fixture. JSON manifests are not supported in this release.",
  },
  {
    question: "Are my manifests uploaded to a server?",
    answer:
      "No. Parsing and risk evaluation run entirely in this browser tab. Nothing is sent to Terraform Plan Visualizer servers.",
  },
  {
    question: "Which risks are detected?",
    answer:
      "The analyzer flags floating image tags, missing container limits, privileged security contexts, hostPath volumes, cluster-admin bindings, and deprecated apiVersion values.",
  },
  {
    question: "Can this replace kube-score or policy engines?",
    answer:
      "This tool is a fast local review aid. Pair it with cluster policy engines, admission controllers, and CI scanners for enforcement.",
  },
] as const;
