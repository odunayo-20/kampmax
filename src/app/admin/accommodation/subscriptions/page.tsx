"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Repeat } from "lucide-react";
import { cn, formatDate, formatDateTime, formatNaira } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PaymentStatusBadge } from "@/components/admin/accommodation/status-badges";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import { useAdminSubscriptions, useSubscriptionPayments } from "@/hooks/admin/use-admin-accommodation";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { canAdminPerform } from "@/lib/admin/permissions";
import {
  PAYMENT_TYPE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  type AdminSubscription,
  type SubscriptionStatus,
} from "@/types/accommodation";

const PAGE_SIZE = 15;

/** Trouble first, then what is running. */
const TABS: SubscriptionStatus[] = ["PAST_DUE", "ACTIVE", "SUSPENDED", "PENDING", "EXPIRED", "CANCELLED"];

const EMPTY_COPY: Record<SubscriptionStatus, { title: string; message: string }> = {
  PAST_DUE: { title: "Nothing past due", message: "Renewals that failed and are being retried appear here." },
  ACTIVE: { title: "No active subscriptions", message: "Listings with a running paid period appear here." },
  SUSPENDED: {
    title: "Nothing suspended",
    message: "A listing whose renewal failed three times, or that the team suspended, appears here.",
  },
  PENDING: { title: "Nothing waiting", message: "Subscriptions paid for but waiting for the listing to be approved." },
  EXPIRED: { title: "Nothing expired", message: "Periods that ended without a renewal appear here." },
  CANCELLED: { title: "Nothing cancelled", message: "Subscriptions an agent or the team cancelled appear here." },
};

const STATUS_STYLE: Record<SubscriptionStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PAST_DUE: "bg-orange-50 text-orange-700",
  SUSPENDED: "bg-red-50 text-red-700",
  EXPIRED: "bg-kampmax-muted text-kampmax-text-secondary",
  CANCELLED: "bg-kampmax-muted text-kampmax-text-secondary",
};

function BillingHistory({ subscriptionId }: { subscriptionId: string }) {
  const history = useSubscriptionPayments(subscriptionId, true);

  if (history.isPending) return <p className="text-xs text-kampmax-text-secondary">Loading billing history…</p>;
  if (history.isError) {
    return (
      <p role="alert" className="text-xs text-red-700">
        The billing history could not be loaded.{" "}
        <button type="button" className="underline" onClick={() => void history.refetch()}>
          Try again
        </button>
      </p>
    );
  }
  if (history.data.length === 0) {
    return <p className="text-xs text-kampmax-text-secondary">No charges yet.</p>;
  }
  return (
    <table className="w-full text-left text-xs" aria-label="Billing history">
      <thead>
        <tr className="text-kampmax-text-secondary">
          <th scope="col" className="py-1 pr-3 font-medium">Month</th>
          <th scope="col" className="py-1 pr-3 font-medium">For</th>
          <th scope="col" className="py-1 pr-3 font-medium">Reference</th>
          <th scope="col" className="py-1 pr-3 text-right font-medium">Amount</th>
          <th scope="col" className="py-1 pr-3 font-medium">Status</th>
          <th scope="col" className="py-1 font-medium">When</th>
        </tr>
      </thead>
      <tbody>
        {history.data.map((p) => (
          <tr key={p.id} className="border-t border-kampmax-border">
            <td className="py-1.5 pr-3 tabular-nums">{p.billingCycle}</td>
            <td className="py-1.5 pr-3">{PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType}</td>
            <td className="py-1.5 pr-3 font-mono">{p.reference}</td>
            <td className="py-1.5 pr-3 text-right tabular-nums">{p.amount > 0 ? formatNaira(p.amount) : "Free"}</td>
            <td className="py-1.5 pr-3">
              <PaymentStatusBadge status={p.status} />
              {p.status === "FAILED" && p.failureReason && (
                <span className="mt-0.5 block text-red-700">{p.failureReason}</span>
              )}
            </td>
            <td className="whitespace-nowrap py-1.5 text-kampmax-text-secondary">
              {formatDateTime(p.paidAt ?? p.createdAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** How the renewal is going, in a few words. */
function renewalNote(s: AdminSubscription): string {
  if (s.status === "PAST_DUE") {
    const next = s.nextRetryAt ? `, next try ${formatDateTime(s.nextRetryAt)}` : "";
    return `${s.retryCount} failed ${s.retryCount === 1 ? "try" : "tries"} of 3${next}`;
  }
  if (s.status === "SUSPENDED" && s.retryCount > 0) return `Suspended after ${s.retryCount} failed tries`;
  if (s.status === "ACTIVE") {
    if (!s.autoRenew) return "Will not renew";
    return s.nextBillingAt ? `Renews ${formatDate(s.nextBillingAt)}` : "Renews automatically";
  }
  return "";
}

export default function AdminAccommodationSubscriptionsPage() {
  const { admin } = useAdminSession();
  const canSee = admin ? canAdminPerform(admin, "accommodation", "managePayments") : false;

  const [tab, setTab] = useState<SubscriptionStatus>("PAST_DUE");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const subscriptions = useAdminSubscriptions({ status: tab, page, pageSize: PAGE_SIZE }, canSee);

  if (!canSee) {
    return (
      <>
        <AdminPageHeader title="Accommodation subscriptions" />
        <section className="rounded-lg border border-kampmax-border bg-white">
          <EmptyState
            icon={Repeat}
            title="You don't have access to subscriptions"
            message="Subscriptions and billing history need the accommodation payments permission. Ask a Super Admin if you need it."
          />
        </section>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Accommodation subscriptions"
        description="Each listing's paid period and how its renewal is going. This is a view only: refunds and payment fixes happen on the Payments page."
      />

      <div
        role="tablist"
        aria-label="Subscription status"
        className="mb-4 flex flex-wrap gap-1 border-b border-kampmax-border"
      >
        {TABS.map((status) => {
          const active = tab === status;
          const count = subscriptions.data?.counts[status];
          return (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setTab(status);
                setPage(1);
                setOpen(null);
              }}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "border-kampmax-blue text-kampmax-blue"
                  : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
              )}
            >
              {SUBSCRIPTION_STATUS_LABELS[status]}
              {count !== undefined && (
                <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-kampmax-text-secondary">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section aria-label="Subscriptions" className="rounded-lg border border-kampmax-border bg-white">
        {subscriptions.isPending ? (
          <div className="p-4">
            <LoadingSkeleton variant="table" rows={5} />
          </div>
        ) : subscriptions.isError ? (
          <ErrorState onRetry={() => void subscriptions.refetch()} />
        ) : subscriptions.data.items.length === 0 ? (
          <EmptyState icon={Repeat} title={EMPTY_COPY[tab].title} message={EMPTY_COPY[tab].message} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-kampmax-border text-xs text-kampmax-text-secondary">
                    <th scope="col" className="w-8 px-2 py-2">
                      <span className="sr-only">Billing history</span>
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">Listing and agent</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">Price</th>
                    <th scope="col" className="px-4 py-2 font-medium">Period</th>
                    <th scope="col" className="px-4 py-2 font-medium">Month</th>
                    <th scope="col" className="px-4 py-2 font-medium">Status</th>
                    <th scope="col" className="px-4 py-2 font-medium">Renewal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kampmax-border">
                  {subscriptions.data.items.map((s) => {
                    const expanded = open === s.id;
                    const title = s.listingTitle ?? "Listing";
                    return (
                      <Fragment key={s.id}>
                        <tr>
                          <td className="px-2 py-2.5">
                            <button
                              type="button"
                              aria-expanded={expanded}
                              aria-label={`Billing history for ${title}`}
                              onClick={() => setOpen(expanded ? null : s.id)}
                              className="rounded p-1 text-kampmax-text-secondary hover:bg-kampmax-muted/60"
                            >
                              {expanded ? (
                                <ChevronDown className="h-4 w-4" aria-hidden />
                              ) : (
                                <ChevronRight className="h-4 w-4" aria-hidden />
                              )}
                            </button>
                          </td>
                          <td className="px-2 py-2.5">
                            <Link
                              href={`/admin/accommodation/listings/${s.listingId}`}
                              className="block font-medium text-kampmax-text hover:text-kampmax-blue hover:underline"
                            >
                              {title}
                            </Link>
                            <Link
                              href={`/admin/accommodation/agents/${s.agentId}`}
                              className="block text-[11px] text-kampmax-text-secondary hover:text-kampmax-blue hover:underline"
                            >
                              {s.agentName ?? "Agent"}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-kampmax-text">
                            {s.amount > 0 ? formatNaira(s.amount) : "Free"}
                            <span className="block text-[11px] text-kampmax-text-secondary">
                              per {s.durationDays} days
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-kampmax-text-secondary">
                            {s.startsAt && s.endsAt ? (
                              <>
                                {formatDate(s.startsAt)}
                                <span className="block text-[11px]">to {formatDate(s.endsAt)}</span>
                              </>
                            ) : (
                              "Not started"
                            )}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums text-kampmax-text-secondary">{s.billingCycle}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                                STATUS_STYLE[s.status]
                              )}
                            >
                              {SUBSCRIPTION_STATUS_LABELS[s.status]}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-kampmax-text-secondary">
                            {renewalNote(s) || "—"}
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td />
                            <td colSpan={6} className="bg-kampmax-muted/30 px-2 py-3">
                              <BillingHistory subscriptionId={s.id} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={subscriptions.data.page}
              pageSize={subscriptions.data.pageSize}
              total={subscriptions.data.total}
              totalPages={subscriptions.data.totalPages}
              onPageChange={(p) => {
                setPage(p);
                setOpen(null);
              }}
              unitLabel="subscriptions"
            />
          </>
        )}
      </section>
    </>
  );
}
