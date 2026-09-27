"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bike,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  MapPin,
  PackageCheck,
  ReceiptText,
  Store,
  User,
  XCircle,
} from "lucide-react";
import { cn, formatDateTime, formatNaira, formatNairaCompact, timeAgo } from "@/lib/utils";
import { ErrorState } from "@/components/admin/ErrorState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CampusLink } from "@/components/admin/campuses/CampusLink";
import {
  ORDER_STATUS_LABELS,
  managedOrderStatusVariant,
  paymentMethodLabel,
} from "@/components/admin/orders/orders-meta";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/orders/OrderBadges";
import { orderManagementService } from "@/services/admin";
import type { AdvanceOrderStatus } from "@/services/admin/order-management.service";
import type {
  ManagedOrderDetail,
  ManagedOrderTimelineEvent,
} from "@/types/admin";

const NEXT_STEP: Partial<
  Record<string, { status: AdvanceOrderStatus; label: string }>
> = {
  pending: { status: "confirmed", label: "Confirm order" },
  confirmed: { status: "preparing", label: "Start preparing" },
  preparing: { status: "out_for_delivery", label: "Mark out for delivery" },
  out_for_delivery: { status: "delivered", label: "Mark delivered" },
};

const CANCELLABLE = new Set(["pending", "confirmed", "preparing", "out_for_delivery"]);

const TIMELINE_STYLES: Record<
  ManagedOrderTimelineEvent["kind"],
  { icon: typeof Clock; className: string }
> = {
  placed: { icon: ReceiptText, className: "bg-kampmax-blue/10 text-kampmax-blue" },
  payment: { icon: CreditCard, className: "bg-kampmax-warning/15 text-amber-600" },
  confirmation: { icon: CheckCircle2, className: "bg-sky-100 text-sky-700" },
  preparation: { icon: Clock, className: "bg-violet-100 text-violet-700" },
  ready: { icon: PackageCheck, className: "bg-indigo-100 text-indigo-700" },
  dispatch: { icon: Bike, className: "bg-amber-100 text-amber-700" },
  delivery: { icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700" },
  cancellation: { icon: XCircle, className: "bg-kampmax-muted text-kampmax-text-secondary" },
  dispute: { icon: AlertTriangle, className: "bg-kampmax-error/10 text-red-600" },
};

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [detail, setDetail] = useState<ManagedOrderDetail | null>(null);
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const { id } = await params;
      setOrderId(id);
      const result = await orderManagementService.getById(id);
      setDetail(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(action: () => Promise<ManagedOrderDetail>) {
    setActing(true);
    setActionError(null);
    try {
      setDetail(await action());
      setCancelOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "The action failed. Try again.");
      setCancelOpen(false);
    } finally {
      setActing(false);
    }
  }

  if (loading) return <LoadingSkeleton variant="cards" rows={5} />;
  if (error || !detail)
    return (
      <ErrorState
        onRetry={() => void load()}
        message={
          !error && !detail
            ? `No order found for "${orderId}". It may belong to a different environment.`
            : undefined
        }
      />
    );

  const order = detail.order;
  const next = NEXT_STEP[order.status];
  const canCancel = CANCELLABLE.has(order.status);
  const isPaid = order.paymentStatus === "paid";

  function SumRow({
    label,
    value,
    emphasis = false,
    muted = false,
    hint,
  }: {
    label: string;
    value: React.ReactNode;
    emphasis?: boolean;
    muted?: boolean;
    hint?: string;
  }) {
    return (
      <div className="flex items-center justify-between gap-4 py-1.5">
        <span
          className={cn(
            "text-sm",
            muted ? "text-kampmax-text-secondary" : "text-kampmax-text",
            emphasis && "font-medium"
          )}
        >
          {label}
          {hint && <span className="ml-1 text-xs text-kampmax-text-secondary">{hint}</span>}
        </span>
        <span
          className={cn(
            "shrink-0 tabular-nums",
            emphasis ? "text-base font-semibold text-kampmax-text" : "text-sm text-kampmax-text"
          )}
        >
          {value}
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <Link
        href="/admin/orders"
        className="mb-3 inline-flex items-center gap-1 text-sm text-kampmax-text-secondary transition-colors hover:text-kampmax-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-xl font-bold tracking-tight text-kampmax-text sm:text-2xl">
            {order.id}
          </h1>
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} dot={false} />
        </div>
        <time
          dateTime={order.createdAt}
          title={formatDateTime(order.createdAt)}
          className="inline-flex items-center gap-1 text-xs text-kampmax-text-secondary"
        >
          <CalendarClock className="h-3.5 w-3.5 opacity-60" />
          Placed {timeAgo(order.createdAt)}
        </time>
      </div>

      {(next || canCancel) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {next && (
            <button
              type="button"
              disabled={acting || (next.status === "delivered" && !isPaid)}
              title={
                next.status === "delivered" && !isPaid
                  ? "An unpaid order can't be marked delivered"
                  : undefined
              }
              onClick={() => void run(() => orderManagementService.advance(order.id, next.status))}
              className="inline-flex h-9 items-center rounded-md bg-kampmax-blue px-3.5 text-sm font-medium text-white transition-colors hover:bg-kampmax-blue/90 disabled:opacity-60"
            >
              {next.label}
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={acting}
              onClick={() => setCancelOpen(true)}
              className="inline-flex h-9 items-center rounded-md border border-kampmax-error/40 bg-white px-3.5 text-sm font-medium text-kampmax-error transition-colors hover:bg-kampmax-error/5 disabled:opacity-60"
            >
              Cancel order
            </button>
          )}
        </div>
      )}
      {actionError && (
        <div role="alert" className="mt-3 rounded-lg border border-kampmax-error/30 bg-kampmax-error/10 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {order.status === "disputed" && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-kampmax-error/30 bg-kampmax-error/10 px-4 py-3 text-sm text-red-700"
        >
          Dispute open - review evidence from both sides before ruling. Refunds are issued from
          the Payments console.
        </div>
      )}

      {order.status === "cancelled" && (
        <div className="mt-3 rounded-lg border border-kampmax-border bg-kampmax-muted/50 px-4 py-3 text-sm text-kampmax-text-secondary">
          This order was cancelled. A paid order is refunded to the customer's Kampmax wallet.
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left column */}
        <div className="space-y-4">
          {/* Items */}
          <section className="rounded-lg border border-kampmax-border bg-white p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-kampmax-text">
              <PackageCheck className="h-4 w-4 opacity-60" />
              Items ({detail.items.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="border-b border-kampmax-border text-[11px] uppercase tracking-wide text-kampmax-text-secondary">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-medium">Item</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">Unit</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">Qty</th>
                    <th scope="col" className="py-2 pl-4 text-right font-medium">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kampmax-border/70">
                  {detail.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-4">
                        <span className="font-medium text-kampmax-text">{item.name}</span>
                        {item.productId && (
                          <span className="block font-mono text-[11px] text-kampmax-text-secondary">
                            {item.productId}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-kampmax-text-secondary">
                        {formatNairaCompact(item.unitPrice)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">×{item.quantity}</td>
                      <td className="whitespace-nowrap py-2.5 pl-4 text-right font-medium tabular-nums text-kampmax-text">
                        {formatNaira(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 border-t border-dashed border-kampmax-border pt-2">
              <SumRow label="Subtotal" value={formatNaira(order.subtotal)} />
              <SumRow
                label="Delivery fee"
                value={order.deliveryFee > 0 ? formatNaira(order.deliveryFee) : "Free"}
                muted
              />
              <SumRow label="Total" value={formatNaira(order.total)} emphasis />
              {detail.payment.refundedAmount > 0 && (
                <SumRow
                  label={
                    order.paymentStatus === "partially_refunded"
                      ? "Refunded (partial)"
                      : "Refunded"
                  }
                  value={`− ${formatNaira(detail.payment.refundedAmount)}`}
                  muted
                />
              )}
            </div>
          </section>

          {/* Lifecycle timeline */}
          <section className="rounded-lg border border-kampmax-border bg-white p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-kampmax-text">
              <CalendarClock className="h-4 w-4 opacity-60" />
              Lifecycle
            </h2>
            <ol className="relative ml-3 space-y-0 border-l border-kampmax-border pl-6">
              {detail.timeline.map((event) => {
                const style = TIMELINE_STYLES[event.kind];
                const Icon = style.icon;
                return (
                  <li key={event.id} className="relative pb-5 last:pb-0">
                    <span
                      className={cn(
                        "absolute -left-[37px] flex h-6 w-6 items-center justify-center rounded-full",
                        style.className
                      )}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <p className="text-sm font-medium text-kampmax-text">{event.label}</p>
                    {event.detail && (
                      <p className="text-xs text-kampmax-text-secondary">{event.detail}</p>
                    )}
                    <time
                      dateTime={event.at}
                      title={formatDateTime(event.at)}
                      className="mt-0.5 block font-mono text-[11px] text-kampmax-text-secondary"
                    >
                      {formatDateTime(event.at)} · {timeAgo(event.at)}
                    </time>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Payment */}
          <section className="rounded-lg border border-kampmax-border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-kampmax-text">Payment</h2>
            <dl className="space-y-2.5 text-sm">
              <InfoRow label="Method" value={paymentMethodLabel(detail.payment.method)} />
              <InfoRow
                label="Status"
                value={<PaymentStatusBadge status={detail.payment.status} dot={false} />}
              />
              <InfoRow
                label="Transaction"
                value={
                  <Link
                    href={`/admin/payments/${detail.payment.transactionId}`}
                    className="font-mono text-[13px] text-kampmax-blue hover:underline"
                  >
                    {detail.payment.transactionId}
                    <ChevronRight className="ml-0.5 inline h-3 w-3" />
                  </Link>
                }
              />
              <InfoRow
                label="Paid at"
                value={detail.payment.paidAt ? formatDateTime(detail.payment.paidAt) : "—"}
              />
            </dl>
          </section>

          {/* Customer */}
          <section className="rounded-lg border border-kampmax-border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-kampmax-text">Customer</h2>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex min-w-0 items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-kampmax-text-secondary" />
                <span className="truncate text-sm font-medium text-kampmax-text">
                  {order.customerName}
                </span>
              </span>
              <Link
                href={`/admin/users?q=${order.customerId}`}
                className="shrink-0 text-xs font-medium text-kampmax-blue hover:underline"
              >
                View user
              </Link>
            </div>
            <p className="mt-1 pl-6 text-xs text-kampmax-text-secondary">
              {order.customerPhone ?? "No phone on file"}
            </p>
          </section>

          {/* Vendor + campus */}
          <section className="rounded-lg border border-kampmax-border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-kampmax-text">Vendor</h2>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex min-w-0 items-center gap-2">
                <Store className="h-4 w-4 shrink-0 text-kampmax-text-secondary" />
                <span className="truncate text-sm font-medium text-kampmax-text">
                  {order.vendorName}
                </span>
              </span>
              <Link
                href={`/admin/vendors/${order.vendorId}`}
                className="shrink-0 text-xs font-medium text-kampmax-blue hover:underline"
              >
                View store
              </Link>
            </div>
            <div className="mt-1 pl-6">
              <CampusLink campusId={order.campusId} />
            </div>
          </section>

          {/* Delivery & pickup */}
          <section className="rounded-lg border border-kampmax-border bg-white p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-kampmax-text">
              <MapPin className="h-4 w-4 opacity-60" />
              Delivery &amp; pickup
            </h2>
            <dl className="space-y-2.5 text-sm">
              {detail.delivery.method === "delivery" && (
                <>
                  <InfoRow label="Address" value={detail.delivery.address ?? "—"} />
                  <InfoRow
                    label="Rider"
                    value={`${detail.delivery.riderName ?? "Unassigned"}${
                      detail.delivery.riderPhone ? ` · ${detail.delivery.riderPhone}` : ""
                    }`}
                  />
                </>
              )}
              {detail.delivery.method === "meetup" && (
                <InfoRow label="Meetup spot" value={detail.delivery.meetupSpot ?? "—"} />
              )}
              {detail.delivery.method === "campus_pickup" && (
                <InfoRow label="Pickup point" value={detail.delivery.pickupPoint ?? "—"} />
              )}
            </dl>
          </section>

          {/* Notes */}
          <section className="rounded-lg border border-kampmax-border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-kampmax-text">Order notes</h2>
            <ul className="space-y-3">
              {detail.notes.map((note) => (
                <li key={note.id} className="rounded-md bg-kampmax-muted/50 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        note.authorRole === "customer" && "bg-sky-100 text-sky-700",
                        note.authorRole === "vendor" && "bg-violet-100 text-violet-700",
                        note.authorRole === "admin" && "bg-amber-100 text-amber-700"
                      )}
                    >
                      {note.authorRole}
                    </span>
                    <time
                      dateTime={note.createdAt}
                      className="text-[11px] text-kampmax-text-secondary"
                      title={formatDateTime(note.createdAt)}
                    >
                      {timeAgo(note.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-kampmax-text">
                    {note.body}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title={`Cancel order ${order.id}?`}
        message={
          isPaid
            ? "Stock is returned to the vendor and the customer is refunded to their Kampmax wallet as store credit."
            : "Stock is returned to the vendor and the customer is notified."
        }
        confirmLabel="Cancel order"
        tone="danger"
        loading={acting}
        reasonLabel="Reason (shown to the customer)"
        onConfirm={(reason) => void run(() => orderManagementService.cancel(order.id, reason))}
        onCancel={() => setCancelOpen(false)}
      />
    </>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-xs uppercase tracking-wide text-kampmax-text-secondary">
        {label}
      </dt>
      <dd className="break-all text-right text-sm text-kampmax-text">{value}</dd>
    </div>
  );
}
