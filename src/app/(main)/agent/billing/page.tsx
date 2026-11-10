"use client";

import { Wallet, CheckCircle, Clock, CreditCard } from "lucide-react";
import {
  useAccommodationSubscriptions,
  useAccommodationPayments,
} from "@/hooks/use-accommodation";
import { Skeleton } from "@/components/ui/Skeleton";

function money(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AgentBillingPage() {
  const subscriptionsQuery = useAccommodationSubscriptions(1, true);
  const paymentsQuery = useAccommodationPayments(1, true);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-kampmax-blue" />
          <h1 className="text-2xl font-bold tracking-tight text-kampmax-text">
            Subscriptions & Billing
          </h1>
        </div>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Track your listing promotion packages, renewal settings, and payment transaction receipts.
        </p>
      </div>

      {/* Active Subscriptions Section */}
      <section className="rounded-2xl border border-kampmax-border bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-kampmax-text">Active Listing Subscriptions</h2>
        <p className="mt-0.5 text-xs text-kampmax-text-secondary">
          Packages currently active for your published room listings.
        </p>

        <div className="mt-4">
          {subscriptionsQuery.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : subscriptionsQuery.isError ? (
            <p className="text-xs text-red-600">Could not load subscriptions.</p>
          ) : subscriptionsQuery.data.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-kampmax-border p-8 text-center text-xs text-kampmax-text-secondary">
              No active subscriptions yet. Publish a draft listing from your listings manager to activate a package.
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptionsQuery.data.items.map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-kampmax-border bg-neutral-50/70 p-4 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-kampmax-text">Listing Subscription</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          sub.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-neutral-200 text-neutral-700"
                        }`}
                      >
                        {sub.status.toLowerCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-kampmax-text-secondary">
                      Duration: {sub.durationDays} days · Auto-renewal:{" "}
                      <strong className="text-kampmax-text">
                        {sub.autoRenew ? "Enabled" : "Disabled"}
                      </strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-kampmax-text">
                      {money(sub.amount, sub.currency)}
                    </p>
                    <p className="text-[11px] text-kampmax-text-secondary">Per cycle</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Payment History Section */}
      <section className="rounded-2xl border border-kampmax-border bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-kampmax-text">Payment Transaction History</h2>
        <p className="mt-0.5 text-xs text-kampmax-text-secondary">
          Receipts for listing package purchases and subscription payments.
        </p>

        <div className="mt-4">
          {paymentsQuery.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : paymentsQuery.isError ? (
            <p className="text-xs text-red-600">Could not load payment history.</p>
          ) : paymentsQuery.data.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-kampmax-border p-8 text-center text-xs text-kampmax-text-secondary">
              No payments recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-kampmax-border overflow-x-auto">
              {paymentsQuery.data.items.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-3.5 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-kampmax-blue/10 text-kampmax-blue">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-kampmax-text">
                        {payment.paymentType.replaceAll("_", " ")}
                      </p>
                      <p className="text-[11px] text-kampmax-text-secondary">
                        {new Date(payment.createdAt).toLocaleDateString()} · Status:{" "}
                        <span className="font-medium text-emerald-600">
                          {payment.status.toLowerCase()}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-kampmax-text">
                      {money(payment.amount, payment.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

