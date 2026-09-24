"use client";

import { cn } from "@/lib/utils";
import { fulfillmentStatusLabel } from "./orders-meta";
import type { VendorFulfillmentStatus, VendorOrderCounts } from "@/types/vendor-orders";

interface OrdersFiltersProps {
  fulfillmentStatus: VendorFulfillmentStatus | "all";
  onFulfillmentChange: (value: VendorFulfillmentStatus | "all") => void;
  counts: VendorOrderCounts;
}

const FULFILLMENT_TABS: { value: VendorFulfillmentStatus; dot: string }[] = [
  { value: "pending", dot: "bg-kampmax-warning" },
  { value: "accepted", dot: "bg-kampmax-info" },
  { value: "processing", dot: "bg-kampmax-info" },
  { value: "shipped", dot: "bg-kampmax-blue" },
  { value: "delivered", dot: "bg-kampmax-success" },
  { value: "cancelled", dot: "bg-kampmax-error" },
];

function countFor(
  counts: VendorOrderCounts,
  value: VendorFulfillmentStatus
): number {
  switch (value) {
    case "pending": return counts.pending;
    case "accepted": return counts.accepted;
    case "processing": return counts.processing;
    case "ready_for_pickup": return counts.readyForPickup;
    case "shipped": return counts.shipped;
    case "out_for_delivery": return counts.outForDelivery;
    case "delivered": return counts.delivered;
    case "completed": return counts.completed;
    case "cancelled": return counts.cancelled;
  }
}

function Tab({
  active,
  label,
  count,
  dotClass,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  dotClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-kampmax-navy text-white"
          : "text-kampmax-text-secondary hover:bg-kampmax-muted hover:text-kampmax-text"
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dotClass ?? "bg-kampmax-blue")} />
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
          active ? "bg-white/20 text-white" : "bg-kampmax-muted text-kampmax-text-secondary"
        )}
      >
        {count.toLocaleString("en-NG")}
      </span>
    </button>
  );
}

export function OrdersFilters({ fulfillmentStatus, onFulfillmentChange, counts }: OrdersFiltersProps) {
  return (
    <div className="rounded-lg border border-kampmax-border bg-white mb-4">
      <div
        role="tablist"
        aria-label="Filter orders by fulfillment status"
        className="flex gap-1 overflow-x-auto border-b border-kampmax-border px-3 py-2 no-scrollbar"
      >
        <Tab
          active={fulfillmentStatus === "all"}
          count={counts.all}
          label="All"
          onClick={() => onFulfillmentChange("all")}
        />
        {FULFILLMENT_TABS.map((t) => (
          <Tab
            key={t.value}
            active={fulfillmentStatus === t.value}
            count={countFor(counts, t.value)}
            label={fulfillmentStatusLabel(t.value)}
            dotClass={t.dot}
            onClick={() => onFulfillmentChange(t.value)}
          />
        ))}
      </div>

    </div>
  );
}