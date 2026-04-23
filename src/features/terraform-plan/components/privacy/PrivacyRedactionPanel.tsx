"use client";

import type { BlastRadiusAnalysis } from "@/features/terraform-plan/components/blast-radius/blastRadiusModel";
import { ExportPanel } from "@/features/terraform-plan/components/export/ExportPanel";
import type { NormalizedPlan } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import {
  type TerraformPlanRedactionSettings,
} from "@/features/terraform-plan/privacy/redactionTypes";

interface PrivacyRedactionPanelProps {
  blastRadiusAnalysis: BlastRadiusAnalysis | null;
  hasAnalyzed: boolean;
  normalizedPlan: NormalizedPlan | null;
  onSettingsChange: (settings: TerraformPlanRedactionSettings) => void;
  settings: TerraformPlanRedactionSettings;
  sourceName?: string;
}

function SettingToggle({
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="border-border bg-background flex items-start gap-3 rounded-lg border p-4">
      <input
        checked={checked}
        className="border-border mt-1 h-4 w-4 rounded"
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        type="checkbox"
      />
      <span>
        <span className="text-foreground block text-sm font-medium">{label}</span>
        <span className="text-muted-foreground mt-1 block text-sm leading-6">
          {description}
        </span>
      </span>
    </label>
  );
}

export function PrivacyRedactionPanel({
  blastRadiusAnalysis,
  hasAnalyzed,
  normalizedPlan,
  onSettingsChange,
  settings,
  sourceName,
}: PrivacyRedactionPanelProps) {
  return (
    <section className="space-y-4">
      <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-foreground text-lg font-semibold">
              Privacy &amp; Redaction
            </h3>
            <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-7">
              These settings stay in this browser tab only. Export and copy
              actions run through the local redaction pipeline by default, but
              every generated report should still be reviewed before sharing.
            </p>
          </div>

          <div className="border-border bg-background rounded-lg border px-3 py-2 text-sm text-muted-foreground">
            {hasAnalyzed
              ? "Export-ready after local redaction"
              : "Analyze a plan to enable export"}
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <SettingToggle
            checked={settings.maskTerraformSensitiveValues}
            description="Always on. Terraform `before_sensitive` and `after_sensitive` metadata is honored before display or export."
            disabled
            label="Mask Terraform-sensitive values"
          />
          <SettingToggle
            checked={settings.detectSecretLikeStrings}
            description="Masks common tokens, private keys, and sensitive key/value pairs before display or export."
            label="Detect and mask secret-like strings"
            onChange={(checked) =>
              onSettingsChange({
                ...settings,
                detectSecretLikeStrings: checked,
              })
            }
          />
          <SettingToggle
            checked={settings.anonymizeResourceNamesInExports}
            description="Uses stable placeholders like `resource_001` and `module_001` in copied or exported reports."
            label="Anonymize resource names in exports"
            onChange={(checked) =>
              onSettingsChange({
                ...settings,
                anonymizeResourceNamesInExports: checked,
              })
            }
          />
          <SettingToggle
            checked={settings.maskCloudAccountIdsInExports}
            description="Masks account-like identifiers in copied or exported content."
            label="Mask cloud account IDs in exports"
            onChange={(checked) =>
              onSettingsChange({
                ...settings,
                maskCloudAccountIdsInExports: checked,
              })
            }
          />
          <SettingToggle
            checked={settings.maskIpAddressesInExports}
            description="Masks IPv4 addresses in copied and exported content."
            label="Mask IP addresses in exports"
            onChange={(checked) =>
              onSettingsChange({
                ...settings,
                maskIpAddressesInExports: checked,
              })
            }
          />
          <SettingToggle
            checked={settings.maskDomainNamesInExports}
            description="Masks domain names in copied and exported content."
            label="Mask domain names in exports"
            onChange={(checked) =>
              onSettingsChange({
                ...settings,
                maskDomainNamesInExports: checked,
              })
            }
          />
        </div>
      </section>

      <ExportPanel
        blastRadiusAnalysis={blastRadiusAnalysis}
        hasAnalyzed={hasAnalyzed}
        normalizedPlan={normalizedPlan}
        settings={settings}
        sourceName={sourceName}
      />
    </section>
  );
}
