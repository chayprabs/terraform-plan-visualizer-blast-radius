interface PastePlanEditorProps {
  onChange: (value: string) => void;
  value: string;
}

export function PastePlanEditor({
  onChange,
  value,
}: PastePlanEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="terraform-plan-editor"
          className="text-foreground text-sm font-semibold"
        >
          Terraform plan JSON
        </label>
        <p
          id="terraform-plan-editor-hint"
          className="text-muted-foreground mt-1 text-sm leading-6"
        >
          Paste the output of <code>terraform show -json tfplan</code>.
        </p>
      </div>

      <textarea
        id="terraform-plan-editor"
        aria-describedby="terraform-plan-editor-hint"
        className="border-border bg-background text-foreground min-h-72 w-full rounded-lg border px-4 py-3 font-mono text-sm leading-6 shadow-sm outline-none transition-colors duration-150 focus:border-brand"
        onChange={(event) => onChange(event.target.value)}
        placeholder={`{\n  "format_version": "1.3",\n  "resource_changes": []\n}`}
        spellCheck={false}
        value={value}
      />
    </div>
  );
}
