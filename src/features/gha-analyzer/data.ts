export const faqItems = [
  {
    question: "What input does the GitHub Actions Workflow Analyzer accept?",
    answer:
      "Paste or upload workflow YAML from .github/workflows. The analyzer parses triggers, jobs, permissions, steps, and common security patterns locally in your browser.",
  },
  {
    question: "Are workflows uploaded to a server?",
    answer:
      "No. Parsing and risk evaluation run entirely in this browser tab.",
  },
  {
    question: "Which workflow risks are detected?",
    answer:
      "The analyzer flags overly broad permissions, pull_request_target misuse, unpinned actions, secrets in env on fork paths, risky checkout settings, cache misuse, and upload-artifact steps without retention.",
  },
  {
    question: "Can this replace GitHub Advanced Security or policy bots?",
    answer:
      "This is a fast local review aid. Pair it with branch protection, required reviews, and organization policy for enforcement.",
  },
] as const;
