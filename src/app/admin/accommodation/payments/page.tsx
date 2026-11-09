"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Download, Landmark, Receipt, RotateCcw } from "lucide-react";
import { cn, formatDateTime, formatNaira, timeAgo } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PaymentStatusBadge } from "@/components/admin/accommodation/status-badges";
import { saveFile } from "@/components/admin/accommodation/save-file";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import { StatCard } from "@/components/admin/StatCard";
import {
  useAdminPayments,
  useFlagPaymentForRefund,
  usePaymentReconciliation,
  useRefundPayment,
} from "@/hooks/admin/use-admin-accommodation";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { canAdminPerform } from "@/lib/admin/permissions";
import { accommodationService } from "@/services/admin";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
  isRefundable,
  type AdminPayment,
  type ListingPaymentStatus,
} from "@/types/accommodation";

const PAGE_SIZE = 15;

/** What needs a person comes first: refunds owed. */
const TABS: ListingPaymentStatus[] = ["REFUND_PENDING", "SUCCESS", "PENDING", "FAILED", "REFUNDED"];

const EMPTY_COPY: Record<ListingPaymentStatus, { title: string; message: string }> = {
  REFUND_PENDING: {
    title: "No refunds owed",
    message: "When a paid listing is rejected, or you mark a payment as owed back, it appears here to be refunded.",
  },
  SUCCESS: { title: "No paid payments yet", message: "Listing payments that went through are listed here." },
  PENDING: { title: "Nothing waiting", message: "Payments the gateway has not answered yet are listed here." },
  FAILED: { title: "No failed payments", message: "Charges that did not go through are listed here." },
  REFUNDED: { title: "Nothing refunded yet", message: "Refunds you have sent are listed here." },
};

const buttonClass =
  "inline-flex h-7 items-center rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-50";

type Pending = { kind: "refund" | "flag"; payment: AdminPayment };

export default function AdminAccommodationPaymentsPage() {
  const { admin } = useAdminSession();
  const canManage = admin ? canAdminPerform(admin, "accommodation", "managePayments") : false;

  const [tab, setTab] = useState<ListingPaymentStatus>("REFUND_PENDING");
  const [page, setPage] = useState(1);
  const payments = useAdminPayments({ status: tab, page, pageSize: PAGE_SIZE }, canManage);
  const reconciliation = usePaymentReconciliation(canManage);

  const refund = useRefundPayment();
  const flag = useFlagPaymentForRefund();
  const busy = refund.isPending || flag.isPending;

  const [pending, setPending] = useState<Pending | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  }

  async function exportCsv() {
    setExporting(true);
    await run(async () => {
      const file = await accommodationService.exportPayments({ from: from || undefined, to: to || undefined });
      saveFile(file, "accommodation-payments.csv");
    });
    setExporting(false);
  }

  if (!canManage) {
    return (
      <>
        <AdminPageHeader title="Accommodation payments" />
        <section className="rounded-lg border border-kampmax-border bg-white">
          <EmptyState
            icon={Landmark}
            title="You don't have access to payments"
            message="Payments and refunds need the accommodation payments permission. Ask a Super Admin if you need it."
          />
        </section>
      </>
    );
  }

  const rec = reconciliation.data;
  const stuckRenewals = rec ? rec.subscriptions.renewalsStuckOverAnHour + rec.subscriptions.renewalsOverdueOverAnHour : 0;
  const dateRangeInvalid = Boolean(from && to && from > to);

  return (
    <>
      <AdminPageHeader
        title="Accommodation payments"
        description="Every listing payment, and the refunds owed. A rejected paid listing lands in Needs refund; send the money back from there."
      />

      <section aria-label="Reconciliation" className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Needs refund"
            value={rec ? String(rec.payments.refundsOwed.count) : "—"}
            icon={RotateCcw}
            tone={rec && rec.payments.refundsOwed.count > 0 ? "warning" : "default"}
            hint={rec ? `${formatNaira(rec.payments.refundsOwed.amount)} owed back` : undefined}
            onClick={() => {
              setTab("REFUND_PENDING");
              setPage(1);
            }}
          />
          <StatCard
            label="Waiting over 10 minutes"
            value={rec ? String(rec.payments.pendingOverTenMinutes) : "—"}
            icon={Clock}
            tone={rec && rec.payments.pendingOverTenMinutes > 0 ? "warning" : "default"}
            hint={
              rec?.payments.oldestPendingSince
                ? `Oldest since ${timeAgo(rec.payments.oldestPendingSince)}`
                : "Nothing is stuck"
            }
          />
          <StatCard
            label="Renewals stuck or late"
            value={rec ? String(stuckRenewals) : "—"}
            icon={AlertTriangle}
            tone={stuckRenewals > 0 ? "error" : "default"}
            hint="Charging for over an hour, or overdue"
          />
          <StatCard
            label="Past due"
            value={rec ? String(rec.subscriptions.pastDue) : "—"}
            icon={Receipt}
            tone={rec && rec.subscriptions.pastDue > 0 ? "warning" : "default"}
            hint="A renewal failed; being retried"
          />
        </div>
        {reconciliation.isError && (
          <p className="mt-2 text-xs text-kampmax-text-secondary">The reconciliation summary could not be loaded.</p>
        )}
      </section>

      {actionError && (
        <p role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div role="tablist" aria-label="Payment status" className="flex flex-wrap gap-1 border-b border-kampmax-border">
          {TABS.map((status) => {
            const active = tab === status;
            const count = payments.data?.counts[status];
            return (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(status);
                  setPage(1);
                }}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "border-kampmax-blue text-kampmax-blue"
                    : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
                )}
              >
                {PAYMENT_STATUS_LABELS[status]}
                {count !== undefined && (
                  <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-kampmax-text-secondary">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <form
          aria-label="Export payments"
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!dateRangeInvalid) void exportCsv();
          }}
        >
          <div>
            <label htmlFor="export-from" className="mb-0.5 block text-[11px] font-medium text-kampmax-text-secondary">
              From
            </label>
            <input
              id="export-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 rounded-md border border-kampmax-border bg-white px-2 text-sm text-kampmax-text"
            />
          </div>
          <div>
            <label htmlFor="export-to" className="mb-0.5 block text-[11px] font-medium text-kampmax-text-secondary">
              To (included)
            </label>
            <input
              id="export-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 rounded-md border border-kampmax-border bg-white px-2 text-sm text-kampmax-text"
            />
          </div>
          <button
            type="submit"
            disabled={exporting || dateRangeInvalid}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text hover:bg-kampmax-muted/60 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            {exporting ? "Preparing…" : "Download CSV"}
          </button>
        </form>
      </div>
      {!from && !to && (
        <p className="-mt-2 mb-3 text-right text-[11px] text-kampmax-text-secondary">
          With no dates, the CSV covers the last 30 days.
        </p>
      )}

      <section aria-label="Payments" className="rounded-lg border border-kampmax-border bg-white">
        {payments.isPending ? (
          <div className="p-4">
            <LoadingSkeleton variant="table" rows={5} />
          </div>
        ) : payments.isError ? (
          <ErrorState onRetry={() => void payments.refetch()} />
        ) : payments.data.items.length === 0 ? (
          <EmptyState icon={Receipt} title={EMPTY_COPY[tab].title} message={EMPTY_COPY[tab].message} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-kampmax-border text-xs text-kampmax-text-secondary">
                    <th scope="col" className="px-4 py-2 font-medium">Payment</th>
                    <th scope="col" className="px-4 py-2 font-medium">Listing and agent</th>
                    <th scope="col" className="px-4 py-2 font-medium">For</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">Amount</th>
                    <th scope="col" className="px-4 py-2 font-medium">Status</th>
                    <th scope="col" className="px-4 py-2 font-medium">When</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kampmax-border">
                  {payments.data.items.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5">
                        <span className="block font-mono text-xs text-kampmax-text">{p.reference}</span>
                        {p.gatewayReference && p.gatewayReference !== "FREE" && (
                          <span className="block text-[11px] text-kampmax-text-secondary">
                            Gateway {p.gatewayReference}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/admin/accommodation/listings/${p.listingId}`}
                          className="block font-medium text-kampmax-text hover:text-kampmax-blue hover:underline"
                        >
                          {p.listingTitle ?? "Listing"}
                        </Link>
                        <Link
                          href={`/admin/accommodation/agents/${p.agentId}`}
                          className="block text-[11px] text-kampmax-text-secondary hover:text-kampmax-blue hover:underline"
                        >
                          {p.agentName ?? "Agent"}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-kampmax-text-secondary">
                        <span className="block">{PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType}</span>
                        <span className="block text-[11px]">Month {p.billingCycle}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-kampmax-text">
                        {p.amount > 0 ? formatNaira(p.amount) : "Free"}
                      </td>
                      <td className="px-4 py-2.5">
                        <PaymentStatusBadge status={p.status} />
                        {p.status === "REFUND_PENDING" && p.refundReason && (
                          <span className="mt-1 block max-w-[16rem] text-[11px] text-orange-700">{p.refundReason}</span>
                        )}
                        {p.status === "FAILED" && p.failureReason && (
                          <span className="mt-1 block max-w-[16rem] text-[11px] text-red-700">{p.failureReason}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-kampmax-text-secondary">
                        {formatDateTime(p.status === "REFUNDED" && p.refundedAt ? p.refundedAt : (p.paidAt ?? p.createdAt))}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {p.status === "REFUND_PENDING" &&
                          (isRefundable(p) ? (
                            <button
                              type="button"
                              disabled={busy}
                              aria-label={`Refund ${p.reference}`}
                              className={cn(buttonClass, "border-kampmax-blue text-kampmax-blue")}
                              onClick={() => setPending({ kind: "refund", payment: p })}
                            >
                              Refund
                            </button>
                          ) : (
                            <span className="text-[11px] text-kampmax-text-secondary">Nothing was charged</span>
                          ))}
                        {p.status === "SUCCESS" && p.amount > 0 && (
                          <button
                            type="button"
                            disabled={busy}
                            aria-label={`Mark ${p.reference} for refund`}
                            className={buttonClass}
                            onClick={() => setPending({ kind: "flag", payment: p })}
                          >
                            Mark for refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={payments.data.page}
              pageSize={payments.data.pageSize}
              total={payments.data.total}
              totalPages={payments.data.totalPages}
              onPageChange={setPage}
              unitLabel="payments"
            />
          </>
        )}
      </section>

      <ConfirmDialog
        open={pending?.kind === "refund"}
        title={`Refund ${pending ? formatNaira(pending.payment.amount) : ""}?`}
        message="The money goes back to the agent's card through the payment gateway. It can take a few days to arrive and cannot be undone. If the gateway refuses, the payment stays in Needs refund so you can try again."
        confirmLabel="Send refund"
        tone="warning"
        loading={refund.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const target = pending;
          if (!target) return;
          void run(async () => {
            await refund.mutateAsync(target.payment.id);
            setPending(null);
          });
        }}
      />

      <ConfirmDialog
        open={pending?.kind === "flag"}
        title="Mark this payment as owed back?"
        message="Use this for a mistake or a complaint. It also turns off automatic renewal for this listing, so nothing more is charged. You then send the refund from the Needs refund tab."
        confirmLabel="Mark for refund"
        tone="warning"
        reasonLabel="Why is it owed back? (kept on the payment)"
        loading={flag.isPending}
        onCancel={() => setPending(null)}
        onConfirm={(reason) => {
          const target = pending;
          if (!target) return;
          void run(async () => {
            await flag.mutateAsync({ id: target.payment.id, reason });
            setPending(null);
          });
        }}
      />
    </>
  );
}
