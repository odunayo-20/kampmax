"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Flag,
  LogIn,
  Package,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Star,
  UserCog,
  Wallet,
} from "lucide-react";
import {
  cn,
  formatDate,
  formatNaira,
  formatNairaCompact,
  getPaymentLabel,
  timeAgo,
} from "@/lib/utils";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge, orderStatusVariant, paymentStatusVariant, priorityVariant, reportStatusVariant, withdrawalStatusVariant } from "@/components/admin/StatusBadge";
import type {
  UserActivityEvent,
  UserOrderSummary,
  UserProfileReport,
  UserWalletSummary,
} from "@/types/admin";

// ------------------------------------------------------------
// ORDERS LIST
// ------------------------------------------------------------

export function DrawerOrdersList({ orders }: { orders: UserOrderSummary[] }) {
  if (orders.length === 0) {
    return (
      <EmptyState
        compact
        icon={ShoppingBag}
        title="No orders yet"
        message="This account hasn't placed any orders."
        className="border-solid"
      />
    );
  }

  return (
    <ul className="divide-y divide-kampmax-border/70">
      {orders.map((o) => (
        <li key={o.id} className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs font-semibold text-kampmax-blue">{o.id}</span>
            <span className="shrink-0 text-xs tabular-nums text-kampmax-text-secondary">
              {timeAgo(o.createdAt)}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-kampmax-text">{o.itemsSummary}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge variant={orderStatusVariant(o.status)} label={o.status.replace(/_/g, " ")} />
            {o.paymentMethod && (
              <>
                <span className="text-xs text-kampmax-text-secondary">via</span>
                <span className="text-xs font-medium text-kampmax-text">{getPaymentLabel(o.paymentMethod)}</span>
              </>
            )}
            {o.paymentStatus && (
              <StatusBadge dot={false} variant={paymentStatusVariant(o.paymentStatus)} label={o.paymentStatus} />
            )}
          </div>
          <p className="mt-1.5 text-sm font-semibold tabular-nums text-kampmax-text">
            {formatNaira(o.total)}
          </p>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------
// ACTIVITY TIMELINE
// ------------------------------------------------------------

const ACTIVITY_ICONS = {
  order: ShoppingBag,
  auth: LogIn,
  wallet: Wallet,
  listing: Package,
  moderation: Flag,
  profile: UserCog,
  admin: ShieldCheck,
} as const;

const ACTIVITY_ICON_STYLES: Record<keyof typeof ACTIVITY_ICONS, string> = {
  order: "bg-kampmax-blue/10 text-kampmax-blue",
  auth: "bg-violet-100 text-violet-600",
  wallet: "bg-kampmax-success/10 text-kampmax-success",
  listing: "bg-kampmax-gold/15 text-kampmax-gold-dark",
  moderation: "bg-kampmax-error/10 text-kampmax-error",
  profile: "bg-kampmax-muted text-kampmax-text-secondary",
  admin: "bg-kampmax-navy/10 text-kampmax-navy",
};

export function ActivityTimeline({ events }: { events: UserActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        compact
        icon={Scale}
        title="No activity recorded"
        className="border-solid"
      />
    );
  }

  return (
    <ol className="relative space-y-0 px-4 py-1">
      {events.map((event, i) => {
        const Icon = ACTIVITY_ICONS[event.kind];
        return (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-2">
            {/* connector */}
            {i < events.length - 1 && (
              <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-kampmax-border" />
            )}
            <span className={cn("z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", ACTIVITY_ICON_STYLES[event.kind])}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm leading-snug text-kampmax-text">{event.message}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-kampmax-text-secondary">
                <span>{event.meta}</span>·<span>{timeAgo(event.at)}</span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ------------------------------------------------------------
// REPORTS LIST
// ------------------------------------------------------------

const REASON_LABELS: Record<UserProfileReport["reason"], string> = {
  spam: "Spam",
  inappropriate: "Inappropriate",
  scam: "Scam",
  harassment: "Harassment",
  counterfeit: "Counterfeit",
  other: "Other",
};

export function ReportList({ reports }: { reports: UserProfileReport[] }) {
  if (reports.length === 0) {
    return (
      <EmptyState
        compact
        icon={ShieldCheck}
        title="No reports"
        message="No abuse reports have been filed against this account."
        className="border-solid"
      />
    );
  }

  return (
    <ul className="space-y-2 p-3">
      {reports.map((r) => (
        <li key={r.id} className="rounded-lg border border-kampmax-border bg-white p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-kampmax-error/10 px-2 py-0.5 text-xs font-medium capitalize text-kampmax-error">
              <Flag className="h-3 w-3" />
              {REASON_LABELS[r.reason]}
            </span>
            <StatusBadge variant={priorityVariant(r.priority)} label={`${r.priority} priority`} />
            <StatusBadge variant={reportStatusVariant(r.status)} label={r.status} />
            <span className="ml-auto shrink-0 text-xs tabular-nums text-kampmax-text-secondary">
              {formatDate(r.createdAt)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-snug text-kampmax-text">{r.detail}</p>
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            Reported by <span className="font-medium text-kampmax-text">{r.reporterName}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------
// WALLET SUMMARY CARD BODY
// ------------------------------------------------------------

export function WalletTxns({ txns }: { txns: UserWalletSummary["recentTransactions"] }) {
  return (
    <ul className="divide-y divide-kampmax-border/70">
      {txns.slice(0, 4).map((t) => {
        const credit = t.direction === "credit";
        const Icon = credit ? ArrowDownLeft : ArrowUpRight;
        return (
          <li key={t.id} className="flex items-center gap-2.5 py-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                credit ? "bg-kampmax-success/10 text-kampmax-success" : "bg-kampmax-error/10 text-kampmax-error"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium capitalize text-kampmax-text">
                {t.type.replace(/_/g, " ")}
              </p>
              <p className="truncate font-mono text-[11px] text-kampmax-text-secondary">
                {t.reference} · {timeAgo(t.createdAt)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={cn("text-xs font-semibold tabular-nums", credit ? "text-kampmax-success" : "text-kampmax-error")}>
                {credit ? "+" : "\u2212"}
                {formatNairaCompact(t.amount)}
              </p>
              <StatusBadge
                dot={false}
                variant={withdrawalStatusVariant(t.status)}
                label={t.status}
                className="mt-0.5 scale-90"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-kampmax-text">
      <Star className="h-3.5 w-3.5 fill-kampmax-gold text-kampmax-gold" />
      <span className="tabular-nums">{rating.toFixed(1)}</span>
    </span>
  );
}
