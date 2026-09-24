"use client";

import { useState } from "react";
import { X, Truck } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { VendorOrder, VendorOrderActionView, VendorOrderResult } from "@/types/vendor-orders";

interface OrderActionsProps {
  order: VendorOrder;
  actions: VendorOrderActionView[];
  busy?: boolean;
  onAction: (action: VendorOrderActionView, payload?: Record<string, string>) => Promise<VendorOrderResult> | VendorOrderResult;
}

export function OrderActionsBar({ order, actions, busy, onAction }: OrderActionsProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmShip, setConfirmShip] = useState(false);

  if (actions.length === 0) return null;

  const handleClick = (action: VendorOrderActionView) => {
    if (action.key === "cancel") setConfirmCancel(true);
    else if (action.key === "ship" && action.requiresPayload) setConfirmShip(true);
    else onAction(action);
  };

  return (
    <>
      <div className="rounded-xl border border-kampmax-border bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-kampmax-text-secondary">
          Actions
        </h3>
        <div className="flex flex-wrap items-stretch gap-2">
          {actions.map((action) => (
            <Button
              key={action.key}
              variant={action.variant}
              size="sm"
              disabled={busy}
              onClick={() => handleClick(action)}
              className="gap-1.5"
              title={action.description}
            >
              {action.key === "ship" && <Truck className="h-3.5 w-3.5" aria-hidden />}
              {action.label}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-kampmax-text-secondary/80">
          Order {order.orderNumber ?? order.id} · escrow disposition shown on this page.
        </p>
      </div>

      {confirmCancel && (
        <CancelDialog
          order={order}
          busy={busy}
          onCancel={() => setConfirmCancel(false)}
          onConfirm={async (reason) => {
            await onAction(actions.find((a) => a.key === "cancel")!, { reason });
            setConfirmCancel(false);
          }}
        />
      )}
      {confirmShip && (
        <ShipDialog
          order={order}
          busy={busy}
          onCancel={() => setConfirmShip(false)}
          onConfirm={async (payload) => {
            await onAction(actions.find((a) => a.key === "ship")!, payload);
            setConfirmShip(false);
          }}
        />
      )}
    </>
  );
}

function DialogShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center bg-kampmax-navy/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-kampmax-border bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-kampmax-text">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-kampmax-text-secondary">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1 text-kampmax-text-secondary hover:bg-kampmax-muted"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const CANCEL_REASONS = [
  "Out of stock",
  "Unable to fulfill",
  "Store closed",
  "Duplicate order",
  "Other",
] as const;

function CancelDialog({
  order,
  busy,
  onCancel,
  onConfirm,
}: {
  order: VendorOrder;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}) {
  const [reason, setReason] = useState<string>("");
  const [custom, setCustom] = useState("");
  const finalReason = reason === "Other" ? custom.trim() : reason;

  return (
    <DialogShell
      title="Cancel order"
      subtitle={`Cancelling ${order.orderNumber ?? order.id} triggers a refund back to the buyer.`}
      onClose={onCancel}
    >
      <p className="mb-2 text-xs font-medium text-kampmax-text-secondary">Reason</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cancellation reason">
        {CANCEL_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={reason === r}
            onClick={() => setReason(r)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              reason === r
                ? "border-kampmax-error bg-kampmax-error/5 text-kampmax-error"
                : "border-kampmax-border text-kampmax-text-secondary hover:bg-kampmax-muted"
            )}
          >
            {r}
          </button>
        ))}
      </div>
      {reason === "Other" && (
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Describe the reason…"
          className="mt-2 h-10 w-full rounded-lg border border-kampmax-border bg-white px-3 text-sm focus:outline-none focus:border-kampmax-error"
        />
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Keep order
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={busy || !finalReason}
          onClick={() => onConfirm(finalReason)}
          className="gap-1.5"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Cancel &amp; refund
        </Button>
      </div>
    </DialogShell>
  );
}

function ShipDialog({
  order,
  busy,
  onCancel,
  onConfirm,
}: {
  order: VendorOrder;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (payload: { carrier: string; trackingNumber: string }) => Promise<void> | void;
}) {
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");

  return (
    <DialogShell
      title="Mark as shipped"
      subtitle={`Record the shipment for ${order.orderNumber ?? order.id}. The buyer will see the tracking ID.`}
      onClose={onCancel}
    >
      <label className="mb-1 block text-xs font-medium text-kampmax-text-secondary" htmlFor="ship-carrier">
        Carrier
      </label>
      <input
        id="ship-carrier"
        type="text"
        value={carrier}
        onChange={(e) => setCarrier(e.target.value)}
        placeholder="e.g. GIG Logistics"
        className="mb-3 h-10 w-full rounded-lg border border-kampmax-border bg-white px-3 text-sm focus:outline-none focus:border-kampmax-blue"
      />
      <label className="mb-1 block text-xs font-medium text-kampmax-text-secondary" htmlFor="ship-tracking">
        Tracking number
      </label>
      <input
        id="ship-tracking"
        type="text"
        value={tracking}
        onChange={(e) => setTracking(e.target.value)}
        placeholder="e.g. GIG-882-1044-71"
        className="h-10 w-full rounded-lg border border-kampmax-border bg-white px-3 text-sm focus:outline-none focus:border-kampmax-blue"
      />
      <p className="mt-2 text-[11px] text-kampmax-text-secondary/80">
        Only the carrier and tracking number are shared with the buyer.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={busy || !carrier.trim() || !tracking.trim()}
          onClick={() => onConfirm({ carrier: carrier.trim(), trackingNumber: tracking.trim() })}
          className="gap-1.5"
        >
          <Truck className="h-3.5 w-3.5" aria-hidden />
          Ship order
        </Button>
      </div>
    </DialogShell>
  );
}