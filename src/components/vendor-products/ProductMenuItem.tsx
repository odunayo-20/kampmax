import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** One row of a product's actions menu (shared by the table and the card grid). */
export function ProductMenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
  disabledHint,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Why the item is greyed out, shown as a tooltip. */
  disabledHint?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium transition-colors",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : danger
          ? "text-kampmax-error hover:bg-kampmax-error/5"
          : "text-kampmax-text hover:bg-kampmax-muted"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}

/** Tooltip for a greyed-out Delete: only drafts, rejected and archived products can be deleted. */
export const DELETE_DISABLED_HINT = "Archive this product first, then you can delete it.";
