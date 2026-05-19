import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const template = {
  address: "aws_s3_bucket.assets",
  mode: "managed",
  type: "aws_s3_bucket",
  name: "assets",
  provider_name: 'provider["registry.terraform.io/hashicorp/aws"]',
  change: {
    actions: ["create"],
    before: null,
    after: { bucket: "authos-assets-prod" },
    after_unknown: { arn: true },
  },
};

const plan = {
  format_version: "1.3",
  terraform_version: "1.8.5",
  timestamp: "2026-04-22T15:00:00Z",
  resource_changes: Array.from({ length: 800 }, (_, index) => ({
    ...template,
    address: `aws_s3_bucket.assets_${index}`,
    name: `assets_${index}`,
  })),
};

const outputDir = join(__dirname, "../tests/fixtures");
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, "large-plan.json");
writeFileSync(outputPath, JSON.stringify(plan));
console.log(`Wrote ${outputPath} (${(JSON.stringify(plan).length / (1024 * 1024)).toFixed(2)} MB)`);
