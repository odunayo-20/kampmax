"use client";

import {
  Clock,
  CheckCircle2,
  Loader2,
  XCircle,
  AlertTriangle,
  Eye,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONTRACT_STATUS_META,
  MILESTONE_STATUS_META,
  DELIVERABLE_STATUS_META,
} from "@/config/contract";
import type { ContractStatus, MilestoneStatus, DeliverableStatus } from "@/types/contract";

// Contract status badge — uses a colour PLUS an icon so it's never colour-only.
const CONTRACT_STYLES: Record<ContractStatus, string> = {
  PENDING_ACCEPTANCE: "bg-accent-50 text-accent-700 border border-accent-100",
  AWAITING_FUNDING: "bg-accent-50 text-accent-700 border border-accent-100",
  ACTIVE: "bg-primary-50 text-primary-700 border border-primary-100",
  PAUSED: "bg-neutral-100 text-neutral-600 border border-neutral-200",
  AWAITING_CLIENT_REVIEW: "bg-info-50 text-info-700 border border-info-100",
  REVISION_REQUESTED: "bg-accent-50 text-accent-700 border border-accent-100",
  COMPLETED: "bg-success-50 text-success-700 border border-success-100",
  CANCELLED: "bg-error-50 text-error-700 border border-error-100",
  DISPUTED: "bg-error-50 text-error-700 border border-error-100",
};

const CONTRACT_ICONS: Record<ContractStatus, LucideIcon> = {
  PENDING_ACCEPTANCE: Clock,
  AWAITING_FUNDING: Clock,
  ACTIVE: Loader2,
  PAUSED: Clock,
  AWAITING_CLIENT_REVIEW: Eye,
  REVISION_REQUESTED: RotateCcw,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
  DISPUTED: AlertTriangle,
};

export function ContractStatusBadge({
  status,
  className,
}: {
  status: ContractStatus;
  className?: string;
}) {
  const Icon = CONTRACT_ICONS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        CONTRACT_STYLES[status],
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {CONTRACT_STATUS_META[status].label}
    </span>
  );
}

// Milestone status badge.
const MILESTONE_STYLES: Record<MilestoneStatus, string> = {
  PENDING: "bg-neutral-100 text-neutral-600 border border-neutral-200",
  ACTIVE: "bg-primary-50 text-primary-700 border border-primary-100",
  SUBMITTED: "bg-info-50 text-info-700 border border-info-100",
  UNDER_REVIEW: "bg-info-50 text-info-700 border border-info-100",
  REVISION_REQUESTED: "bg-accent-50 text-accent-700 border border-accent-100",
  COMPLETED: "bg-success-50 text-success-700 border border-success-100",
  CANCELLED: "bg-error-50 text-error-700 border border-error-100",
};

const MILESTONE_ICONS: Record<MilestoneStatus, LucideIcon> = {
  PENDING: Clock,
  ACTIVE: Loader2,
  SUBMITTED: Eye,
  UNDER_REVIEW: Eye,
  REVISION_REQUESTED: RotateCcw,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
};

export function MilestoneStatusBadge({
  status,
  className,
}: {
  status: MilestoneStatus;
  className?: string;
}) {
  const Icon = MILESTONE_ICONS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        MILESTONE_STYLES[status],
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {MILESTONE_STATUS_META[status].label}
    </span>
  );
}

// Deliverable status badge (compact).
const DELIVERABLE_STYLES: Record<DeliverableStatus, string> = {
  DRAFT: "bg-neutral-100 text-neutral-600 border border-neutral-200",
  SUBMITTED: "bg-info-50 text-info-700 border border-info-100",
  UNDER_REVIEW: "bg-info-50 text-info-700 border border-info-100",
  REVISION_REQUESTED: "bg-accent-50 text-accent-700 border border-accent-100",
  APPROVED: "bg-success-50 text-success-700 border border-success-100",
  REJECTED: "bg-error-50 text-error-700 border border-error-100",
  COMPLETED: "bg-success-50 text-success-700 border border-success-100",
};

const DELIVERABLE_ICONS: Record<DeliverableStatus, LucideIcon> = {
  DRAFT: Clock,
  SUBMITTED: Eye,
  UNDER_REVIEW: Eye,
  REVISION_REQUESTED: RotateCcw,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  COMPLETED: CheckCircle2,
};

export function DeliverableStatusBadge({
  status,
  className,
}: {
  status: DeliverableStatus;
  className?: string;
}) {
  const Icon = DELIVERABLE_ICONS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        DELIVERABLE_STYLES[status],
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {DELIVERABLE_STATUS_META[status].label}
    </span>
  );
}
