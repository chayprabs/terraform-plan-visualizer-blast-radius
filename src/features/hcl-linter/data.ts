export const faqItems = [
  {
    question: "What does the Terraform HCL Linter analyze?",
    answer:
      "Paste Terraform .tf content to lint for public CIDRs, hardcoded secret-like strings, missing variable descriptions, and related module hygiene issues. A documentation tab generates reviewer-friendly module docs.",
  },
  {
    question: "Where is HCL parsed?",
    answer:
      "HCL is converted with hcl2json on the server for parsing only. Lint results and generated docs render in your browser; your module source is not stored.",
  },
  {
    question: "Does this replace terraform validate or tflint?",
    answer:
      "No. This tool focuses on quick reviewer-oriented checks and docs. Keep terraform validate, fmt, and tflint in CI for authoritative enforcement.",
  },
  {
    question: "Can I export findings?",
    answer:
      "Copy lint output and generated Markdown docs from the workspace after analysis completes.",
  },
] as const;
