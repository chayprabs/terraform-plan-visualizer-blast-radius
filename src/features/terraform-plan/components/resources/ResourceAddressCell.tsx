interface ResourceAddressCellProps {
  address: string;
  copyState: "copied" | "error" | "idle";
  name: string;
  onCopy: () => void;
  previousAddress?: string | null;
}

export function ResourceAddressCell({
  address,
  copyState,
  name,
  onCopy,
  previousAddress,
}: ResourceAddressCellProps) {
  return (
    <div className="min-w-[16rem]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-foreground break-all text-sm font-medium">{address}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Name: {name}
          </p>
          {previousAddress ? (
            <p className="text-muted-foreground mt-1 break-all text-xs leading-5">
              Previous address: {previousAddress}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          className="border-border bg-background text-foreground hover:bg-surface-muted shrink-0 rounded-md border px-2 py-1 text-xs font-medium transition-colors"
          onClick={(event) => {
            event.stopPropagation();
            onCopy();
          }}
          aria-label={`Copy resource address ${address}`}
        >
          {copyState === "copied"
            ? "Copied"
            : copyState === "error"
              ? "Retry"
              : "Copy"}
        </button>
      </div>
    </div>
  );
}
