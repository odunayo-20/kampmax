"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { useVendorOrder, useVendorOrderTransition } from "@/hooks/use-vendor-orders";
import {
  getRealVendorOrderActions,
  type VendorOrderTransitionKey,
} from "@/services/vendor-orders-api";
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
import { EscrowPanel } from "@/components/vendor-orders/OrderStatusPanels";
import type { VendorOrderActionView, VendorOrderResult } from "@/types/vendor-orders";

const TRANSITION_KEYS: ReadonlySet<string> = new Set<VendorOrderTransitionKey>([
  "accept",
  "process",
  "ship",
  "deliver",
  "cancel",
]);

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go back"
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-kampmax-border"
    >
      <ArrowLeft className="h-5 w-5 text-kampmax-text" />
    </button>
  );
}

export default function VendorOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const orderQuery = useVendorOrder(id);
  const transition = useVendorOrderTransition(id);
  const [error, setError] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);

  if (orderQuery.isPending) {
    return (
      <div className="space-y-4 max-w-4xl">
        <BackButton onClick={() => router.back()} />
        <div className="h-40 animate-pulse rounded-xl bg-neutral-100" />
        <div className="h-64 animate-pulse rounded-xl bg-neutral-100" />
      </div>
    );
  }

  const order = orderQuery.data;
  if (orderQuery.isError || !order) {
    // Only a real 404 means "not yours / doesn't exist"; anything else is a failure to load.
    const status = (orderQuery.error as { status?: number } | null)?.status;
    const missing = status === 404 || (!orderQuery.isError && !order);
    const reason =
      (orderQuery.error as { message?: string } | null)?.message ?? "";
    return (
      <div className="space-y-4">
        <BackButton onClick={() => router.back()} />
        <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center">
          <p className="text-sm font-medium text-kampmax-text">
            {missing ? "Order not found" : "Couldn't load this order"}
          </p>
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            {missing
              ? "It may belong to another store or no longer exist."
              : `Something went wrong while loading it${reason ? `: ${reason}` : "."} Try again, or sign in again if the problem continues.`}
          </p>
          <button
            type="button"
            onClick={() => orderQuery.refetch()}
            className="mt-3 text-xs font-semibold text-primary-600 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const actions = getRealVendorOrderActions(order);

  const runTransition = async (
    action: VendorOrderActionView,
    payload?: Record<string, string>
  ): Promise<VendorOrderResult> => {
    if (!TRANSITION_KEYS.has(action.key)) {
      return { ok: false, code: "invalid_transition", error: "Unsupported action." };
    }
    setError("");
    try {
      await transition.mutateAsync({
        action: action.key as VendorOrderTransitionKey,
        note: payload?.reason,
      });
      return { ok: true, code: "ok" };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't update the order.";
      setError(message);
      return { ok: false, code: "invalid_transition", error: message };
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton onClick={() => router.back()} />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-kampmax-text">{order.orderNumber ?? order.id}</h1>
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

      <SummarySection order={order} parent={null} />

      <OrderActionsBar
        order={order}
        actions={actions}
        busy={transition.isPending}
        onAction={runTransition}
      />

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
        </div>
      </div>

      <OrderReceiptModal
        order={order}
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
      />
    </div>
  );
}
