"use client";

import Link from "next/link";
import {
  useAccommodationPaymentReturn,
  useAccommodationPayments,
  useAccommodationSubscriptions,
  useAgentAccommodationListings,
} from "@/hooks/use-accommodation";
import { LoadError, Pill } from "@/components/accommodation/enquiry-parts";
import { Skeleton } from "@/components/ui/Skeleton";
import { BILLING_EMPTY, paymentLine, subscriptionLine, subscriptionView } from "@/lib/agent-billing";
import { formatNaira } from "@/lib/utils";

const NOTICE = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
  wait: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-800",
};

const listingHref = (id: string) => `/agent/listings?open=${encodeURIComponent(id)}`;

/**
 * What the agent has paid and what is running: subscriptions first, then every payment. Coming back from Paystack,
 * the payment is checked with the server until it has an answer. The same screen as the mobile app's agent-billing.
 */
export default function AgentBillingPage() {
  const subs = useAccommodationSubscriptions(1, true);
  const payments = useAccommodationPayments(1, true);
  const listings = useAgentAccommodationListings(1, true);
  const { notice, check } = useAccommodationPaymentReturn();
  const titleOf = (id: string) => listings.data?.items.find((l) => l.id === id)?.title ?? "Listing";

  const subItems = subs.data?.items ?? [];
  const payItems = payments.data?.items ?? [];
  const empty = subs.isSuccess && payments.isSuccess && subItems.length === 0 && payItems.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-kampmax-text">Billing</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">One subscription per published listing, and every payment you have made.</p>
      </div>

      {notice && (
        <div role={notice.tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${NOTICE[notice.tone]}`}>
          <p>{notice.text}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {notice.canRetry && notice.reference && (
              <button type="button" onClick={() => check(notice.reference as string)} className="font-semibold underline">Check again</button>
            )}
            {notice.listingId && notice.tone !== "wait" && (
              <Link href={listingHref(notice.listingId)} className="font-semibold underline">View my listing</Link>
            )}
          </div>
        </div>
      )}

      {subs.isPending || payments.isPending ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : subs.isError || payments.isError ? (
        <LoadError what="load your billing" error={subs.error ?? payments.error} onRetry={() => void Promise.all([subs.refetch(), payments.refetch()])} />
      ) : empty ? (
        <div className="rounded-2xl border border-dashed border-kampmax-border bg-white p-10 text-center">
          <h2 className="text-base font-bold text-kampmax-text">{BILLING_EMPTY.title}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-kampmax-text-secondary">{BILLING_EMPTY.text}</p>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-kampmax-border bg-white p-5">
            <h2 className="text-base font-bold text-kampmax-text">Subscriptions</h2>
            <p className="mt-0.5 text-xs text-kampmax-text-secondary">One per published listing. Open one to go to its listing.</p>
            {subItems.length === 0 && <p className="mt-3 text-sm text-kampmax-text-secondary">No subscriptions yet.</p>}
            <ul className="mt-2 divide-y divide-kampmax-border">
              {subItems.map((s) => {
                const v = subscriptionView(s);
                return (
                  <li key={s.id}>
                    <Link href={listingHref(s.listingId)} className="block py-3 hover:bg-kampmax-bg">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-kampmax-text">{titleOf(s.listingId)}</span>
                        <Pill label={v.label} tone={v.tone} />
                      </span>
                      <span className="block text-xs text-kampmax-text-secondary">{subscriptionLine(s, formatNaira)}</span>
                      {v.text && <span className="block text-xs text-kampmax-text-secondary">{v.text}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-2xl border border-kampmax-border bg-white p-5">
            <h2 className="text-base font-bold text-kampmax-text">Payments</h2>
            {payItems.length === 0 && <p className="mt-3 text-sm text-kampmax-text-secondary">No payments yet.</p>}
            <ul className="mt-2 divide-y divide-kampmax-border">
              {payItems.map((p) => {
                const line = paymentLine(p, formatNaira);
                return (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-kampmax-text">{line.title} · {titleOf(p.listingId)}</span>
                      <span className="block text-xs text-kampmax-text-secondary">{line.detail}</span>
                      {p.status === "FAILED" && p.failureReason && <span className="block text-xs text-kampmax-text-secondary">{p.failureReason}</span>}
                    </span>
                    {p.status === "PENDING" ? (
                      <button type="button" onClick={() => check(p.reference)} className="text-sm font-semibold text-kampmax-blue hover:underline">Check</button>
                    ) : (
                      <Pill label={line.pill} tone={line.tone} />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
