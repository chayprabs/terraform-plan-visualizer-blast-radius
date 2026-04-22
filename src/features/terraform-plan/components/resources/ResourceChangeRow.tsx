import type { ResourceTableItem } from "@/features/terraform-plan/components/resources/resourceTableModel";
import { getResourceGroupLabel } from "@/features/terraform-plan/components/resources/resourceTableModel";
import { ResourceActionBadge } from "@/features/terraform-plan/components/resources/ResourceActionBadge";
import { ResourceAddressCell } from "@/features/terraform-plan/components/resources/ResourceAddressCell";
import { ResourceRiskBadge } from "@/features/terraform-plan/components/resources/ResourceRiskBadge";
import { cn } from "@/lib/utils";

interface ResourceChangeRowProps {
  copyState: "copied" | "error" | "idle";
  isSelected: boolean;
  item: ResourceTableItem;
  onCopyAddress: () => void;
  onOpenDetails: () => void;
}

function formatChangedAttributes(value: number | null): string {
  return value === null ? "—" : value.toLocaleString();
}

export function ResourceChangeRow({
  copyState,
  isSelected,
  item,
  onCopyAddress,
  onOpenDetails,
}: ResourceChangeRowProps) {
  return (
    <tr
      className={cn(
        "hover:bg-surface-muted cursor-pointer border-b border-border/80 align-top transition-colors",
        isSelected && "bg-surface-muted",
      )}
      onClick={onOpenDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetails();
        }
      }}
      tabIndex={0}
      aria-label={`Open details for ${item.address}`}
    >
      <td className="px-3 py-3">
        <ResourceActionBadge action={item.action} />
      </td>
      <td className="px-3 py-3">
        <ResourceRiskBadge
          findingCount={item.riskFindingCount}
          severity={item.riskSeverity}
        />
      </td>
      <td className="px-3 py-3">
        <ResourceAddressCell
          address={item.address}
          copyState={copyState}
          name={item.name}
          onCopy={onCopyAddress}
          previousAddress={item.resource.previousAddress}
        />
      </td>
      <td className="text-foreground px-3 py-3 text-sm">{item.type}</td>
      <td className="text-foreground px-3 py-3 text-sm">{item.providerLabel}</td>
      <td className="text-foreground px-3 py-3 text-sm">{item.moduleLabel}</td>
      <td className="text-foreground px-3 py-3 text-sm">
        {getResourceGroupLabel(item.resourceGroup)}
      </td>
      <td className="text-foreground px-3 py-3 text-sm">
        {item.replacePathsCount.toLocaleString()}
      </td>
      <td className="px-3 py-3 text-sm">
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
            item.hasSensitiveChange
              ? "border-warning bg-warning-soft text-warning"
              : "border-border bg-background text-muted-foreground",
          )}
          title={
            item.hasSensitiveChange
              ? "Terraform marked one or more changed attributes as sensitive."
              : "Terraform did not flag this resource change as sensitive."
          }
        >
          {item.hasSensitiveChange ? "Sensitive" : "No"}
        </span>
      </td>
      <td className="text-foreground px-3 py-3 text-sm">
        {formatChangedAttributes(item.changedAttributesCount)}
      </td>
    </tr>
  );
}
