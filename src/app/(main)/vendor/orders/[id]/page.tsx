"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import {
  getVendorOrderDetail,
  getVendorOrderActions,
  getVendorOrderPermissions,
  acceptVendorOrder,
  cancelVendorOrder,
  processVendorOrder,
  readyVendorOrder,
  shipVendorOrder,
  outForDeliveryVendorOrder,
  deliverVendorOrder,
  completeVendorOrder,
  respondToDispute,
  addVendorOrderNote,
} from "@/services/vendor-orders";
import { OrderActionsBar } from "@/components/vendor-orders/OrderActionBar";
import { OrderTimeline } from "@/components/vendor-orders/OrderTimeline";
import { OrderReceiptModal } from "@/components/vendor-orders/OrderReceiptModal";
import {
  SummarySection,
  CustomerSection,
  ItemsSection,
  TotalsSection,
  DeliverySection,
  StoreLine,
} from "@/components/vendor-orders/OrderDetailSections";
import {
  EscrowPanel,
  DisputePanel,
  RefundPanel,
} from "@/components/vendor-orders/OrderStatusPanels";
import { OrderNotesPanel } from "@/components/vendor-orders/OrderNotesPanel";
import type { VendorOrder, VendorOrderActionView, VendorOrderResult } from "@/types/vendor-orders";
import { getOrCreateDirectConversation } from "@/services/messages";
import { getCurrentUser } from "@/services/users";

const TRANSITIONS: Record<
  string,
  (order: VendorOrder, payload?: Record<string, string>) => VendorOrderResult
> = {
  accept: (o) => acceptVendorOrder(o.id),
  cancel: (o, p) => cancelVendorOrder(o.id, p?.reason ?? ""),
  process: (o) => processVendorOrder(o.id),
  ready_for_pickup: (o) => readyVendorOrder(o.id),
  ship: (o, p) => shipVendorOrder(o.id, { carrier: p?.carrier ?? "", trackingNumber: p?.trackingNumber ?? "" }),
  out_for_delivery: (o) => outForDeliveryVendorOrder(o.id),
  deliver: (o) => deliverVendorOrder(o.id),
  complete: (o) => completeVendorOrder(o.id),
};

export default function VendorOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [detail, setDetail] = useState(() => getVendorOrderDetail(id));
  const [permissions] = useState(() => getVendorOrderPermissions());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);

  if (!detail) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-kampmax-border"
        >
          <ArrowLeft className="h-5 w-5 text-kampmax-text" />
        </button>
        <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center">
          <p className="text-sm font-medium text-kampmax-text">Order not found</p>
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            It may belong to another store or no longer exist.
          </p>
        </div>
      </div>
    );
  }

  const { order } = detail;
  const actions = getVendorOrderActions(order, permissions);

  const runTransition = async (action: VendorOrderActionView, payload?: Record<string, string>) => {
    if (action.key === "message_customer") {
      const currentUser = getCurrentUser();
      const customerUserId = order.customer.buyerId || "user-1";
      const result = getOrCreateDirectConversation(currentUser.id, customerUserId);

      const params = new URLSearchParams();
      params.set("orderId", order.id);
      params.set("orderTotal", String(order.totals.vendorSubtotal));
      if (order.customer.displayName) params.set("customerName", order.customer.displayName);

      if (result && result.conversation) {
        router.push(`/chat/${result.conversation.id}?${params.toString()}`);
      } else {
        router.push(`/chat?${params.toString()}`);
      }
      return { ok: true, code: "ok" as const };
    }

    const transition = TRANSITIONS[action.key];
    if (!transition) return { ok: false, code: "invalid_transition" as const, error: "Unsupported action." };

    setBusy(true);
    setError("");
    try {
      const result = transition(order, payload);
      if (result.ok && result.order) {
        setDetail({ ...detail, order: result.order });
      } else if (!result.ok && result.error) {
        setError(result.error);
      }
      return result;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-kampmax-border"
          >
            <ArrowLeft className="h-5 w-5 text-kampmax-text" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-kampmax-text">{order.id}</h1>
            <StoreLine order={order} />
          </div>
        </div>

        <button
          onClick={() => setReceiptOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 shadow-sm transition-colors"
        >
          <Printer className="w-4 h-4 text-primary-600" /> Print Receipt
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-kampmax-error/30 bg-kampmax-error/5 px-3 py-2 text-xs font-medium text-kampmax-error">
          {error}
        </div>
      )}

      <SummarySection order={order} parent={detail.parent} />

      <OrderActionsBar order={order} actions={actions} busy={busy} onAction={runTransition} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <CustomerSection order={order} />
          <ItemsSection order={order} />
          <TotalsSection order={order} />
          <DeliverySection order={order} />
          <OrderTimeline events={order.timeline} />
        </div>
        <div className="space-y-4">
          <EscrowPanel order={order} />
          <DisputePanel
            order={order}
            busy={busy}
            onRespond={async (response) => {
              setBusy(true);
              setError("");
              try {
                const result = respondToDispute(order.id, response);
                if (result.ok && result.order) {
                  setDetail({ ...detail, order: result.order });
                } else if (!result.ok && result.error) {
                  setError(result.error);
                }
                return result;
              } finally {
                setBusy(false);
              }
            }}
          />
          <RefundPanel order={order} />
          <OrderNotesPanel
            order={order}
            busy={busy}
            onAdd={async (body) => {
              setBusy(true);
              setError("");
              try {
                const result = addVendorOrderNote(order.id, body);
                if (result.ok && result.order) {
                  setDetail({ ...detail, order: result.order });
                } else if (!result.ok && result.error) {
                  setError(result.error);
                }
                return result;
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
      </div>

      {/* Order Receipt / Packing Slip Modal */}
      <OrderReceiptModal
        order={order}
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
      />
    </div>
  );
}