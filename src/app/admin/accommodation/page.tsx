"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  CircleDollarSign,
  Flag,
  Home,
  MessageSquare,
  Percent,
  Receipt,
  Repeat,
  RotateCcw,
  UserCheck,
} from "lucide-react";
import { cn, formatNaira } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ChartCard } from "@/components/admin/ChartCard";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { StatCard } from "@/components/admin/StatCard";
import { useAccommodationDashboard } from "@/hooks/admin/use-admin-accommodation";
import type { AdminDashboard } from "@/types/accommodation";

type Preset = "7" | "30" | "90" | "custom";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
  { id: "custom", label: "Custom" },
];

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The backend reads `to` as the last day included, so "last 7 days" ends today. */
function presetRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86_400_000);
  return { from: isoDay(from), to: isoDay(to) };
}

/** Rates arrive as percentages; null means there was nothing to measure. */
function pct(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString("en-NG", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

/**
 * The backend lists only months that had payments, so a young business shows
 * one giant bar. Show the six months ending at the range end instead, with
 * zero for the months that had none.
 */
function lastSixMonths(
  revenueByMonth: { month: string; revenue: number }[],
  endIso: string
): { month: string; revenue: number }[] {
  const known = new Map(revenueByMonth.map((m) => [m.month, m.revenue]));
  const end = new Date(endIso);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (5 - i), 1));
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return { month, revenue: known.get(month) ?? 0 };
  });
}

interface Attention {
  label: string;
  count: number;
  href: string;
  hint: string;
}

/** Work that is waiting on a person, most urgent first. */
function attentionItems(d: AdminDashboard): Attention[] {
  return [
    {
      label: "Agent applications to review",
      count: d.agents.pending,
      href: "/admin/accommodation/agents",
      hint: "Agents can't list until approved",
    },
    {
      label: "Listings waiting for approval",
      count: d.listings.pendingApproval,
      href: "/admin/accommodation/listings",
      hint: "Paid, and waiting to go live",
    },
    {
      label: "Refunds to send",
      count: d.payments.refundsPending.count,
      href: "/admin/accommodation/payments",
      hint: `${formatNaira(d.payments.refundsPending.amount)} owed back`,
    },
    {
      label: "Open reports",
      count: d.reports.open,
      href: "/admin/accommodation/reports",
      hint: "Listings people have flagged",
    },
    {
      label: "Renewals past due",
      count: d.subscriptions.pastDue,
      href: "/admin/accommodation/subscriptions",
      hint: "A renewal failed; being retried",
    },
  ].filter((item) => item.count > 0);
}

export default function AdminAccommodationOverviewPage() {
  const [preset, setPreset] = useState<Preset>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const customInvalid = Boolean(customFrom && customTo && customFrom > customTo);
  const range =
    preset === "custom"
      ? { from: customFrom || undefined, to: customTo || undefined }
      : presetRange(Number(preset));

  const dashboard = useAccommodationDashboard(customInvalid ? {} : range);
  const d = dashboard.data;
  const attention = d ? attentionItems(d) : [];

  return (
    <>
      <AdminPageHeader
        title="Accommodation overview"
        description="How the accommodation business is doing, and what is waiting on you."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div role="group" aria-label="Date range" className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={preset === p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                "h-8 rounded-md border px-3 text-xs font-medium transition-colors",
                preset === p.id
                  ? "border-kampmax-blue bg-kampmax-blue/10 text-kampmax-blue"
                  : "border-kampmax-border bg-white text-kampmax-text hover:bg-kampmax-muted/60"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="overview-from" className="mb-0.5 block text-[11px] font-medium text-kampmax-text-secondary">
                From
              </label>
              <input
                id="overview-from"
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 rounded-md border border-kampmax-border bg-white px-2 text-sm text-kampmax-text"
              />
            </div>
            <div>
              <label htmlFor="overview-to" className="mb-0.5 block text-[11px] font-medium text-kampmax-text-secondary">
                To (included)
              </label>
              <input
                id="overview-to"
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 rounded-md border border-kampmax-border bg-white px-2 text-sm text-kampmax-text"
              />
            </div>
          </div>
        )}
      </div>
      {customInvalid && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          The start date must be before the end date.
        </p>
      )}

      {dashboard.isPending ? (
        <LoadingSkeleton variant="table" rows={6} />
      ) : dashboard.isError ? (
        <ErrorState onRetry={() => void dashboard.refetch()} />
      ) : (
        d && (
          <>
            <section aria-label="Needs attention" className="mb-4 rounded-lg border border-kampmax-border bg-white">
              <h2 className="flex items-center gap-2 border-b border-kampmax-border px-4 py-3 text-sm font-semibold text-kampmax-text">
                <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
                Needs attention
              </h2>
              {attention.length === 0 ? (
                <p className="px-4 py-4 text-sm text-kampmax-text-secondary">Nothing is waiting on you.</p>
              ) : (
                <ul className="divide-y divide-kampmax-border">
                  {attention.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-kampmax-muted/50"
                      >
                        <span>
                          <span className="block font-medium text-kampmax-text">{item.label}</span>
                          <span className="block text-[11px] text-kampmax-text-secondary">{item.hint}</span>
                        </span>
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-700">
                          {item.count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-label="Money" className="mb-4">
              <h2 className="mb-2 text-sm font-semibold text-kampmax-text">Money</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Monthly recurring revenue"
                  value={formatNaira(d.subscriptions.monthlyRecurringRevenue)}
                  icon={Repeat}
                  tone="blue"
                  hint="Running subscriptions, per 30 days"
                />
                <StatCard
                  label="Revenue in range"
                  value={formatNaira(d.payments.revenueInRange)}
                  icon={CircleDollarSign}
                  tone="success"
                  hint={`${d.payments.paidInRange} paid, after refunds`}
                />
                <StatCard
                  label="Revenue per active listing"
                  value={
                    d.subscriptions.averageRevenuePerActiveListing === null
                      ? "—"
                      : formatNaira(d.subscriptions.averageRevenuePerActiveListing)
                  }
                  icon={Home}
                  hint="Average, per month"
                />
                <StatCard
                  label="Failed payments"
                  value={pct(d.payments.failedPaymentRate)}
                  icon={Receipt}
                  tone={d.payments.failedInRange > 0 ? "warning" : "default"}
                  hint={`${d.payments.failedInRange} failed in range`}
                />
                <StatCard
                  label="Renewals that worked"
                  value={pct(d.payments.renewalSuccessRate)}
                  icon={Repeat}
                  hint="Of renewal charges tried"
                />
                <StatCard
                  label="Cancellations"
                  value={pct(d.subscriptions.cancellationRate)}
                  icon={Percent}
                  hint="Renewals turned off in range"
                />
                <StatCard
                  label="Refunds owed"
                  value={formatNaira(d.payments.refundsPending.amount)}
                  icon={RotateCcw}
                  tone={d.payments.refundsPending.count > 0 ? "warning" : "default"}
                  hint={`${d.payments.refundsPending.count} to send`}
                />
                <StatCard
                  label="Past due or suspended"
                  value={String(d.subscriptions.pastDue + d.subscriptions.suspended)}
                  icon={AlertTriangle}
                  tone={d.subscriptions.pastDue + d.subscriptions.suspended > 0 ? "error" : "default"}
                  hint={`${d.subscriptions.active} active`}
                />
              </div>
            </section>

            <div className="mb-4">
              {d.payments.revenueByMonth.length === 0 ? (
                <section
                  aria-label="Revenue by month"
                  className="rounded-lg border border-kampmax-border bg-white px-4 py-6 text-center text-sm text-kampmax-text-secondary"
                >
                  No payments yet in this range.
                </section>
              ) : (
                <ChartCard
                  title="Revenue by month"
                  subtitle="Paid, after refunds"
                  type="bar"
                  accent="blue"
                  data={lastSixMonths(d.payments.revenueByMonth, d.range.to).map((m) => ({
                    label: monthLabel(m.month),
                    value: m.revenue,
                  }))}
                  formatValue={formatNaira}
                />
              )}
            </div>

            <section aria-label="Listings and agents" className="mb-4">
              <h2 className="mb-2 text-sm font-semibold text-kampmax-text">Listings and agents</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Live listings"
                  value={String(d.listings.active)}
                  icon={Home}
                  tone="success"
                  hint={`${d.listings.total} in all, ${d.properties} properties`}
                />
                <StatCard
                  label="Waiting for approval"
                  value={String(d.listings.pendingApproval)}
                  icon={CalendarCheck}
                  tone={d.listings.pendingApproval > 0 ? "warning" : "default"}
                />
                <StatCard
                  label="Expired or suspended"
                  value={String(d.listings.expired + d.listings.suspended)}
                  icon={AlertTriangle}
                  hint={`${d.listings.expired} expired, ${d.listings.suspended} suspended`}
                />
                <StatCard
                  label="Verified agents"
                  value={String(d.agents.verified)}
                  icon={UserCheck}
                  hint={`${d.agents.newInRange} new in range, ${d.agents.pending} pending`}
                />
              </div>
            </section>

            <section aria-label="Demand" className="mb-4">
              <h2 className="mb-2 text-sm font-semibold text-kampmax-text">Demand</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Enquiries"
                  value={String(d.enquiries.inRange)}
                  icon={MessageSquare}
                  hint={`${d.enquiries.answered} answered`}
                />
                <StatCard
                  label="Average reply time"
                  value={
                    d.enquiries.averageResponseHours === null ? "—" : `${d.enquiries.averageResponseHours} h`
                  }
                  icon={MessageSquare}
                  hint="Agent's first answer"
                />
                <StatCard
                  label="Inspections requested"
                  value={String(d.inspections.requestedInRange)}
                  icon={CalendarCheck}
                  hint={`${pct(d.inspections.enquiryToInspectionRate)} of enquiries`}
                />
                <StatCard
                  label="Inspections completed"
                  value={String(d.inspections.completedInRange)}
                  icon={CalendarCheck}
                  hint={`${pct(d.inspections.completionRate)} of requests`}
                />
                <StatCard
                  label="Open reports"
                  value={String(d.reports.open)}
                  icon={Flag}
                  tone={d.reports.open > 0 ? "warning" : "default"}
                  hint={`${d.reports.newInRange} new in range`}
                />
              </div>
            </section>
          </>
        )
      )}
    </>
  );
}
