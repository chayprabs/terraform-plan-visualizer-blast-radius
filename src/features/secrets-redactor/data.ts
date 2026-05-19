export const faqItems = [
  {
    question: "What can I redact with the Secrets Redactor?",
    answer:
      "Paste or upload plain-text logs, JSON, YAML, Terraform snippets, or CI output. The tool masks secret-like strings, optional cloud account IDs, IP addresses, and domain names entirely in your browser.",
  },
  {
    question: "Is my text uploaded to a server?",
    answer:
      "No. Redaction runs locally in this browser tab. Nothing is sent to Authos servers.",
  },
  {
    question: "What file types are supported?",
    answer:
      "Text-oriented files such as .txt, .log, .json, .md, and .env up to 25 MB. Binary files are rejected.",
  },
  {
    question: "Can I trust every redaction?",
    answer:
      "Redaction is best-effort. Always review the preview and downloaded output before sharing externally.",
  },
] as const;
