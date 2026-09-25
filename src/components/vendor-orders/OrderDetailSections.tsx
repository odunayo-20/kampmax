"use client";

import { MapPin, Package, Store, Truck, CreditCard, Download, Copy } from "lucide-react";
import { cn, formatNaira, formatDateTime } from "@/lib/utils";
import { PaymentBadge, DeliveryMethodTag, FulfillmentBadge } from "./OrderBadges";
import type { VendorOrder, VendorParentOrder } from "@/types/vendor-orders";

export function SectionShell({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-kampmax-border bg-white p-4", className)}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-kampmax-text-secondary">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <dt className="text-sm text-kampmax-text-secondary shrink-0">{label}</dt>
      <dd className={cn("text-right text-sm font-medium text-kampmax-text", mono && "font-mono text-[13px]")}>
        {value}
      </dd>
    </div>
  );
}

// ── Customer (minimum viable info) ────────────────────────────

export function CustomerSection({ order }: { order: VendorOrder }) {
  return (
    <SectionShell title="Customer" icon={<Copy className="h-3.5 w-3.5" aria-hidden />}>
      <dl className="divide-y divide-kampmax-border/60">
        <Row label="Name" value={order.customer.displayName} />
        <Row label="Campus" value={order.customer.campusLabel ?? "—"} />
        <Row label="Phone" value={order.customer.phone ?? "Not shared"} />
      </dl>
      <p className="mt-2 text-[11px] text-kampmax-text-secondary/80">
        Contact details are only provided for fulfillment when the buyer opts in during checkout.
      </p>
    </SectionShell>
  );
}

// ── Items ─────────────────────────────────────────────────────

export function ItemsSection({ order }: { order: VendorOrder }) {
  return (
    <SectionShell title="Items" icon={<Package className="h-3.5 w-3.5" aria-hidden />}>
      <ul className="space-y-2">
        {order.items.map((item) => (
          <li key={item.productId} className="flex items-start justify-between gap-3 border-b border-kampmax-border/60 pb-2 last:border-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-kampmax-text">{item.title}</p>
              <p className="text-xs text-kampmax-text-secondary">
                {item.quantity} × {formatNaira(item.unitPrice)}
                {item.sku && <span className="ml-1 font-mono text-[11px] text-kampmax-text-muted">SKU {item.sku}</span>}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-kampmax-text">
              {formatNaira(item.quantity * item.unitPrice)}
            </p>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

// ── Totals ────────────────────────────────────────────────────

export function TotalsSection({ order }: { order: VendorOrder }) {
  const t = order.totals;
  return (
    <SectionShell title="Totals" icon={<CreditCard className="h-3.5 w-3.5" aria-hidden />}>
      <dl className="divide-y divide-kampmax-border/60">
        <Row label="Items subtotal" value={formatNaira(t.itemsSubtotal)} />
        {(t.discount ?? 0) > 0 && <Row label="Promotion discount" value={`− ${formatNaira(t.discount ?? 0)}`} />}
        <Row label="Delivery fee" value={formatNaira(t.deliveryFee)} />
        <div className="flex items-start justify-between gap-3 py-2">
          <dt className="text-sm font-medium text-kampmax-text-secondary">Customer paid</dt>
          <dd className="text-right text-base font-bold tabular-nums text-kampmax-text">
            {formatNaira(t.customerTotal)}
          </dd>
        </div>
        <Row label="Platform fee (deducted from your payout)" value={`− ${formatNaira(t.platformFee)}`} />
        <Row label="You receive" value={formatNaira(t.vendorPayout ?? t.vendorSubtotal - t.platformFee)} />
      </dl>
    </SectionShell>
  );
}

// ── Fulfillment summary ───────────────────────────────────────

export function SummarySection({ order, parent }: { order: VendorOrder; parent?: VendorParentOrder | null }) {
  return (
    <div className="rounded-xl border border-kampmax-border bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <FulfillmentBadge status={order.fulfillmentStatus} />
        <PaymentBadge status={order.paymentStatus} />
        <DeliveryMethodTag method={order.deliveryMethod} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        <div>
          <dt className="text-[11px] text-kampmax-text-secondary">Parent order</dt>
          <dd className="text-sm font-medium text-kampmax-text">{order.parentOrderId}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-kampmax-text-secondary">Placed</dt>
          <dd className="text-sm font-medium text-kampmax-text">{formatDateTime(order.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-kampmax-text-secondary">Updated</dt>
          <dd className="text-sm font-medium text-kampmax-text">{formatDateTime(order.updatedAt)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-kampmax-text-secondary">Payment</dt>
          <dd className="text-sm font-medium text-kampmax-text">{order.paymentMethod}</dd>
        </div>
      </dl>
      {parent && parent.vendorSellers.length > 1 && (
        <div className="mt-3 rounded-lg bg-kampmax-muted px-3 py-2 text-xs text-kampmax-text-secondary">
          Also part of this checkout:{" "}
          {parent.vendorSellers.filter((s) => s.vendorId !== order.vendorId).map((s) => s.storeName).join(", ") || "—"}
        </div>
      )}
    </div>
  );
}

// ── Delivery / pickup / shipment ──────────────────────────────

export function DeliverySection({ order }: { order: VendorOrder }) {
  return (
    <SectionShell title="Fulfillment details" icon={<Truck className="h-3.5 w-3.5" aria-hidden />}>
      <div className="flex items-center gap-2 text-sm font-medium text-kampmax-text">
        <MapPin className="h-4 w-4 text-kampmax-blue" aria-hidden />
        {order.deliveryMethod === "delivery" ? "Home delivery" : "Campus pickup"}
      </div>

      {order.deliveryMethod === "delivery" && order.deliveryAddress && (
        <p className="mt-2 text-sm text-kampmax-text-secondary">{order.deliveryAddress}</p>
      )}

      {order.deliveryMethod === "campus_pickup" && order.pickup && (
        <div className="mt-2 space-y-1">
          <Row label="Pickup location" value={order.pickup.location} />
          {order.pickup.instructions && (
            <Row label="Instructions" value={order.pickup.instructions} />
          )}
          {order.pickup.pickupCode && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-kampmax-gold/30 bg-kampmax-gold/10 px-3 py-2">
              <span className="text-xs font-medium text-kampmax-gold-dark">Pickup code</span>
              <span className="font-mono text-sm font-bold tracking-widest text-kampmax-gold-dark">
                {order.pickup.pickupCode}
              </span>
            </div>
          )}
        </div>
      )}

      {order.shipment && (
        <div className="mt-3 border-t border-kampmax-border/60 pt-2">
          <Row label="Carrier" value={order.shipment.carrier} />
          <Row label="Tracking" mono value={order.shipment.trackingNumber} />
          <Row label="Shipped" value={formatDateTime(order.shipment.shippedAt)} />
          {order.shipment.deliveredAt && (
            <Row label="Delivered" value={formatDateTime(order.shipment.deliveredAt)} />
          )}
        </div>
      )}
    </SectionShell>
  );
}

// ── Escrow / dispute / refund summary (quick view) ────────────

export function EscrowMiniPanel({ order }: { order: VendorOrder }) {
  const e = order.escrow;
  if (e.state === "none") return null;
  return (
    <SectionShell title="Escrow" icon={<Download className="h-3.5 w-3.5" aria-hidden />}>
      <p className="text-sm font-medium text-kampmax-text">{e.state.replace(/_/g, " ")}</p>
      {e.displayAmount != null && (
        <p className="mt-1 text-xs text-kampmax-text-secondary">Working balance {formatNaira(e.displayAmount)}</p>
      )}
      {e.updatedAt && <p className="mt-0.5 text-[11px] text-kampmax-text-muted">{formatDateTime(e.updatedAt)}</p>}
      {e.note && <p className="mt-1 text-xs text-kampmax-text-secondary">{e.note}</p>}
      <p className="mt-2 text-[11px] text-kampmax-text-secondary/80">
        Escrow is managed on Kampmax's side. No action needed here.
      </p>
    </SectionShell>
  );
}

export function StoreLine({ order }: { order: VendorOrder }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-kampmax-text-secondary">
      <Store className="h-3.5 w-3.5 text-kampmax-gold-dark" aria-hidden />
      Sold by {order.storeName}
    </p>
  );
}