"use client";

import Link from "next/link";
import { AlertTriangle, Landmark, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";
import { cn, formatNaira, formatDateTime, timeAgo } from "@/lib/utils";
import type {
  VendorOrder,
  VendorOrderResult,
} from "@/types/vendor-orders";

// ── Escrow panel ──────────────────────────────────────────────

export function EscrowPanel({ order }: { order: VendorOrder }) {
  const e = order.escrow;
  if (e.state === "none") return null;

  const states: Record<string, { label: string; className: string }> = {
    funds_held: { label: "Funds held", className: "bg-kampmax-gold/10 text-kampmax-gold-dark" },
    awaiting_fulfillment: { label: "Awaiting fulfillment", className: "bg-kampmax-blue/10 text-kampmax-blue" },
    release_eligible: { label: "Ready to release", className: "bg-kampmax-info/10 text-kampmax-info" },
    released: { label: "Released", className: "bg-kampmax-success/10 text-kampmax-success" },
    refunded: { label: "Refunded", className: "bg-kampmax-error/10 text-kampmax-error" },
  };
  const s = states[e.state] ?? { label: e.state.replace(/_/g, " "), className: "bg-kampmax-muted text-kampmax-text-secondary" };

  return (
    <div className="rounded-xl border border-kampmax-border bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-kampmax-text-secondary">
        <Landmark className="h-3.5 w-3.5" aria-hidden />
        Escrow
      </h3>
      <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", s.className)}>
        {s.label}
      </span>
      {e.displayAmount != null && (
        <p className="mt-2 text-sm text-kampmax-text">
          Working balance <span className="font-semibold tabular-nums">{formatNaira(e.displayAmount)}</span>
        </p>
      )}
      {e.updatedAt && (
        <p className="mt-0.5 text-[11px] text-kampmax-text-muted">Updated {formatDateTime(e.updatedAt)}</p>
      )}
      {e.note && <p className="mt-2 text-xs text-kampmax-text-secondary">{e.note}</p>}
      <p className="mt-3 text-[11px] text-kampmax-text-secondary/80">
        Escrow and payouts are handled on Kampmax's side. Funds move automatically once the buyer
        confirms delivery and the dispute window passes.
      </p>
    </div>
  );
}

// ── Dispute panel ─────────────────────────────────────────────

/**
 * What a vendor sees when the customer (or Kampmax) has reported a problem with an
 * order. Read-only on purpose: the decision belongs to Kampmax Trust & Safety, and
 * there is no vendor "approve refund" or "reject" action on the server, so this
 * panel never offers one. It says what is true: the payout is on hold, who decides,
 * and where to send evidence. The customer's written statement is never shown here,
 * only the one-line reason.
 */
export function DisputePanel({ order }: { order: VendorOrder }) {
  const d = order.dispute;
  if (d.status === "none") return null;

  const isOpen = d.status !== "resolved" && d.status !== "closed";
  const reference = order.orderNumber ?? order.id;

  return (
    <section
      aria-labelledby="vendor-dispute-title"
      role="status"
      className={cn("rounded-xl border bg-white p-4", isOpen ? "border-kampmax-error/40" : "border-kampmax-border")}
    >
      <h3
        id="vendor-dispute-title"
        className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-kampmax-text-secondary"
      >
        <AlertTriangle className="h-3.5 w-3.5 text-kampmax-error" aria-hidden />
        {isOpen ? "Problem reported: payout on hold" : "Problem reviewed"}
      </h3>

      {d.openedAt && <p className="text-[11px] text-kampmax-text-muted">Reported {formatDateTime(d.openedAt)}</p>}
      {d.reason && (
        <p className="mt-2 text-sm text-kampmax-text">
          <span className="font-semibold">Reason given:</span> {d.reason}
        </p>
      )}

      {d.timeline.length > 0 && (
        <ul className="mt-3 space-y-2">
          {d.timeline.map((evt) => (
            <li key={evt.id} className="border-l-2 border-kampmax-border pl-3">
              <p className="text-xs font-medium text-kampmax-text">{evt.title}</p>
              {evt.detail && <p className="mt-0.5 text-xs text-kampmax-text-secondary">{evt.detail}</p>}
              <p className="mt-0.5 text-[11px] text-kampmax-text-muted">{timeAgo(evt.at)}</p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-kampmax-text-secondary">
        {isOpen
          ? "Kampmax Trust & Safety is reviewing this. Your payout for this order stays on hold until they decide, and you will be notified of the outcome. You don't need to do anything yet."
          : "Kampmax Trust & Safety has reviewed this order. Any payout or refund has been applied."}
      </p>
      {isOpen && (
        <p className="mt-2 text-xs text-kampmax-text-secondary">
          Have proof the order was fine (photos, delivery details, messages)?{" "}
          <Link
            href="/vendor/support"
            className="font-semibold text-primary-600 hover:underline"
          >
            Send it to support
          </Link>{" "}
          and quote order {reference}.
        </p>
      )}
    </section>
  );
}

// ── Refund panel ──────────────────────────────────────────────

export function RefundPanel({ order }: { order: VendorOrder }) {
  const r = order.refund;
  if (r.status === "none") return null;

  return (
    <div className="rounded-xl border border-kampmax-border bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-kampmax-text-secondary">
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        Refund
      </h3>
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
          r.status === "refunded"
            ? "bg-kampmax-success/10 text-kampmax-success"
            : r.status === "rejected"
              ? "bg-kampmax-error/10 text-kampmax-error"
              : "bg-kampmax-gold/10 text-kampmax-gold-dark"
        )}
      >
        {r.status.replace(/_/g, " ")}
      </span>
      {r.amount != null && (
        <p className="mt-2 text-sm text-kampmax-text">
          Amount <span className="font-semibold tabular-nums">{formatNaira(r.amount)}</span>
        </p>
      )}
      {r.reason && <p className="mt-1 text-xs text-kampmax-text-secondary">{r.reason}</p>}
      {r.requestedAt && (
        <p className="mt-1 text-[11px] text-kampmax-text-muted">Requested {formatDateTime(r.requestedAt)}</p>
      )}
      {r.status !== "refunded" && r.status !== "rejected" && (
        <p className="mt-3 text-[11px] text-kampmax-text-secondary/80">
          Refunds are processed by Kampmax back to the buyer's original payment method.
        </p>
      )}
    </div>
  );
}