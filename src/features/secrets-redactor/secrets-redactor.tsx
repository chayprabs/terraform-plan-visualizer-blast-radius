"use client";

import { useId, useMemo, useState } from "react";
import { Container } from "@/components/ui/container";
import { ToolWorkspaceLayout } from "@/lib/authos/components/ToolWorkspaceLayout";
import { redactArbitraryText } from "@/features/secrets-redactor/domain/redactTextInput";
import {
  DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
  type TerraformPlanRedactionSettings,
} from "@/lib/authos/privacy";
import { cn } from "@/lib/utils";

export const MAX_SECRETS_REDACTOR_INPUT_BYTES = 25 * 1024 * 1024;

type InputTab = "paste" | "upload";

interface LoadedFileInfo {
  name: string;
  size: number;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes.toLocaleString()} bytes`;
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

function downloadTextFile(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SecretsRedactor() {
  const uploadInputId = useId();
  const [activeTab, setActiveTab] = useState<InputTab>("paste");
  const [inputText, setInputText] = useState("");
  const [fileInfo, setFileInfo] = useState<LoadedFileInfo | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"copied" | "error" | "idle">("idle");
  const [settings, setSettings] = useState<TerraformPlanRedactionSettings>(
    DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
  );

  const inputByteLength = useMemo(
    () => new TextEncoder().encode(inputText).byteLength,
    [inputText],
  );

  const redactionResult = useMemo(() => {
    if (!inputText || inputError) {
      return {
        redactedText: "",
        replacementCount: 0,
      };
    }

    return redactArbitraryText(inputText, settings);
  }, [inputError, inputText, settings]);

  const handleFile = async (file: File) => {
    if (file.size > MAX_SECRETS_REDACTOR_INPUT_BYTES) {
      setInputError(
        `This file is too large (${formatBytes(file.size)}). Maximum size is ${formatBytes(MAX_SECRETS_REDACTOR_INPUT_BYTES)}.`,
      );
      setFileInfo({ name: file.name, size: file.size });
      return;
    }

    try {
      const text = await file.text();
      const byteLength = new TextEncoder().encode(text).byteLength;

      if (byteLength > MAX_SECRETS_REDACTOR_INPUT_BYTES) {
        setInputError(
          `Decoded content is too large (${formatBytes(byteLength)}). Maximum size is ${formatBytes(MAX_SECRETS_REDACTOR_INPUT_BYTES)}.`,
        );
        setFileInfo({ name: file.name, size: file.size });
        return;
      }

      setInputText(text);
      setFileInfo({ name: file.name, size: file.size });
      setInputError(null);
      setActiveTab("upload");
    } catch {
      setInputError("Could not read the selected file.");
      setFileInfo({ name: file.name, size: file.size });
    }
  };

  const handleTextChange = (value: string) => {
    const byteLength = new TextEncoder().encode(value).byteLength;

    if (byteLength > MAX_SECRETS_REDACTOR_INPUT_BYTES) {
      setInputError(
        `Input is too large (${formatBytes(byteLength)}). Maximum size is ${formatBytes(MAX_SECRETS_REDACTOR_INPUT_BYTES)}.`,
      );
    } else {
      setInputError(null);
    }

    setInputText(value);
    setFileInfo(null);
  };

  const handleCopy = async () => {
    if (!redactionResult.redactedText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(redactionResult.redactedText);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const handleDownload = () => {
    if (!redactionResult.redactedText) {
      return;
    }

    const baseName = fileInfo?.name.replace(/\.[^.]+$/, "") ?? "redacted-text";
    downloadTextFile(`${baseName}.redacted.txt`, redactionResult.redactedText);
  };

  const hasOutput = redactionResult.redactedText.length > 0;

  return (
    <div className="py-8 sm:py-10">
      <Container className="space-y-8 sm:space-y-10">
        <section className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8">
          <span className="bg-surface-muted text-muted-foreground border-border inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-[0.18em] uppercase">
            Local browser processing
          </span>
          <h1 className="text-foreground mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Secrets Redactor
          </h1>
          <p className="text-muted-foreground mt-5 max-w-3xl text-lg leading-8">
            Paste or upload logs, configs, or exports to mask secret-like strings,
            cloud account IDs, IP addresses, and domain names before sharing.
          </p>
        </section>

        <section
          aria-label="Privacy notice"
          className="border-border bg-surface-muted rounded-lg border px-4 py-3"
        >
          <p className="text-foreground text-sm font-medium leading-6">
            Local processing: your text is redacted entirely in this browser tab.
            Nothing is uploaded to a server.
          </p>
        </section>

        <ToolWorkspaceLayout
          inputPanel={
          <div
            className={cn(
              "border-border bg-background rounded-lg border transition-colors duration-150",
              isDragActive && "border-brand bg-surface-muted",
            )}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragActive(false);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragActive(false);
              const file = event.dataTransfer.files?.[0];

              if (file) {
                void handleFile(file);
              }
            }}
          >
            <div
              className="border-border flex items-center gap-2 border-b p-3"
              role="tablist"
              aria-label="Text input methods"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "paste"}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                  activeTab === "paste"
                    ? "bg-brand text-brand-foreground"
                    : "text-muted-foreground hover:bg-surface-muted",
                )}
                onClick={() => setActiveTab("paste")}
              >
                Paste text
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "upload"}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                  activeTab === "upload"
                    ? "bg-brand text-brand-foreground"
                    : "text-muted-foreground hover:bg-surface-muted",
                )}
                onClick={() => setActiveTab("upload")}
              >
                Upload file
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {activeTab === "paste" ? (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="secrets-redactor-input"
                      className="text-foreground text-sm font-semibold"
                    >
                      Source text
                    </label>
                    <p
                      id="secrets-redactor-input-hint"
                      className="text-muted-foreground mt-1 text-sm leading-6"
                    >
                      Paste logs, CI output, Terraform snippets, or any text that
                      may contain secrets.
                    </p>
                  </div>

                  <textarea
                    id="secrets-redactor-input"
                    aria-describedby="secrets-redactor-input-hint"
                    className="border-border bg-background text-foreground min-h-72 w-full rounded-lg border px-4 py-3 font-mono text-sm leading-6 shadow-sm outline-none transition-colors duration-150 focus:border-brand"
                    onChange={(event) => handleTextChange(event.target.value)}
                    placeholder="export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE"
                    spellCheck={false}
                    value={inputText}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-foreground text-sm font-semibold">
                      Upload text file
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                      Drop a plain-text file here or choose one from your device.
                      Maximum size {formatBytes(MAX_SECRETS_REDACTOR_INPUT_BYTES)}.
                    </p>
                  </div>

                  <div
                    className={cn(
                      "border-border bg-background rounded-lg border border-dashed p-6 text-center transition-colors duration-150",
                      isDragActive && "border-brand bg-surface-muted",
                    )}
                  >
                    <input
                      id={uploadInputId}
                      accept=".txt,.log,.json,.md,.env,text/plain"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file) {
                          void handleFile(file);
                        }

                        event.currentTarget.value = "";
                      }}
                      type="file"
                    />

                    <label
                      htmlFor={uploadInputId}
                      className="bg-brand text-brand-foreground inline-flex cursor-pointer items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-transform duration-150 hover:-translate-y-0.5"
                    >
                      Choose file
                    </label>

                    <p className="text-foreground mt-4 text-sm font-medium">
                      Drag and drop a text file onto this panel.
                    </p>
                  </div>

                  {fileInfo ? (
                    <div className="border-border bg-surface-muted rounded-lg border px-4 py-3">
                      <p className="text-foreground text-sm font-semibold">
                        Loaded file
                      </p>
                      <p className="text-foreground mt-2 text-sm">{fileInfo.name}</p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {formatBytes(fileInfo.size)}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {inputError ? (
                <div className="border-critical bg-critical-soft text-critical rounded-lg border px-4 py-3">
                  <p className="text-sm font-semibold">Input too large</p>
                  <p className="mt-1 text-sm leading-6">{inputError}</p>
                </div>
              ) : inputText ? (
                <div className="border-border bg-surface-muted text-muted-foreground rounded-lg border px-4 py-3 text-sm">
                  {formatBytes(inputByteLength)} loaded
                </div>
              ) : (
                <div className="border-border bg-surface-muted text-muted-foreground rounded-lg border px-4 py-3 text-sm">
                  Paste or upload text to preview redacted output.
                </div>
              )}
            </div>
          </div>
          }
          outputPanel={
          <div className="space-y-4">
            <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
              <h2 className="text-foreground text-lg font-semibold">
                Privacy settings
              </h2>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                Settings apply only in this browser tab. Review redacted output
                before sharing.
              </p>

              <div className="mt-4 grid gap-3">
                <SettingToggle
                  checked={settings.maskTerraformSensitiveValues}
                  description="Always on for Terraform plan JSON. Ignored for arbitrary text."
                  disabled
                  label="Mask Terraform-sensitive values"
                />
                <SettingToggle
                  checked={settings.detectSecretLikeStrings}
                  description="Masks common tokens, private keys, and sensitive key/value pairs."
                  label="Detect and mask secret-like strings"
                  onChange={(checked) =>
                    setSettings({
                      ...settings,
                      detectSecretLikeStrings: checked,
                    })
                  }
                />
                <SettingToggle
                  checked={settings.anonymizeResourceNamesInExports}
                  description="Uses stable placeholders like resource_001 for Terraform addresses and names."
                  label="Anonymize resource names in exports"
                  onChange={(checked) =>
                    setSettings({
                      ...settings,
                      anonymizeResourceNamesInExports: checked,
                    })
                  }
                />
                <SettingToggle
                  checked={settings.maskCloudAccountIdsInExports}
                  description="Masks 12-digit account-like identifiers."
                  label="Mask cloud account IDs in exports"
                  onChange={(checked) =>
                    setSettings({
                      ...settings,
                      maskCloudAccountIdsInExports: checked,
                    })
                  }
                />
                <SettingToggle
                  checked={settings.maskIpAddressesInExports}
                  description="Masks IPv4 addresses."
                  label="Mask IP addresses in exports"
                  onChange={(checked) =>
                    setSettings({
                      ...settings,
                      maskIpAddressesInExports: checked,
                    })
                  }
                />
                <SettingToggle
                  checked={settings.maskDomainNamesInExports}
                  description="Masks domain names."
                  label="Mask domain names in exports"
                  onChange={(checked) =>
                    setSettings({
                      ...settings,
                      maskDomainNamesInExports: checked,
                    })
                  }
                />
              </div>
            </section>

            <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-foreground text-lg font-semibold">
                    Redacted preview
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    {hasOutput
                      ? `${redactionResult.replacementCount.toLocaleString()} replacement${redactionResult.replacementCount === 1 ? "" : "s"} applied`
                      : "Redacted output appears here as you type or upload."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="border-border bg-background text-foreground hover:bg-surface-muted inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!hasOutput}
                    onClick={() => void handleCopy()}
                  >
                    {copyState === "copied"
                      ? "Copied"
                      : copyState === "error"
                        ? "Copy failed"
                        : "Copy redacted text"}
                  </button>
                  <button
                    type="button"
                    className="bg-brand text-brand-foreground inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-transform duration-150 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!hasOutput}
                    onClick={handleDownload}
                  >
                    Download .txt
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                aria-label="Redacted output preview"
                className="border-border bg-background text-foreground mt-4 min-h-72 w-full rounded-lg border px-4 py-3 font-mono text-sm leading-6 shadow-sm"
                value={redactionResult.redactedText}
              />
            </section>
          </div>
          }
        />
      </Container>
    </div>
  );
}
