"use client";

import { AGENT_STATUS_LABELS, type AccommodationAgentStatus } from "@/types/accommodation";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<AccommodationAgentStatus, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  SUSPENDED: "bg-rose-50 text-rose-700 border-rose-200",
  REVOKED: "bg-neutral-100 text-neutral-700 border-neutral-300",
};

export function AgentStatusBadge({
  status,
  className,
}: {
  status: AccommodationAgentStatus;
  className?: string;
}) {
  const label = AGENT_STATUS_LABELS[status] ?? status;
  const style = STATUS_STYLES[status] ?? "bg-neutral-100 text-neutral-700 border-neutral-200";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        style,
        className
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", {
          "bg-emerald-500": status === "APPROVED",
          "bg-amber-500": status === "PENDING",
          "bg-red-500": status === "REJECTED" || status === "SUSPENDED" || status === "REVOKED",
        })}
        aria-hidden
      />
      {label}
    </span>
  );
}

