"use client";

import { use, useState } from "react";
import Link from "next/link";
import { CheckCircle, Loader2, Minus, Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs, BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { BuyerOrderGate, useBuyerOrder } from "@/components/orders/BuyerOrderGate";
import {
  buildReturnBody,
  canRequestReturn,
  estimateRefund,
  RETURN_REASONS,
  RETURN_STATEMENT_MAX,
  returnRequestProblem,
  timeLeft,
  type ReturnReasonId,
} from "@/lib/returns";
import { cn, formatNaira } from "@/lib/utils";
import { requestReturnApi } from "@/services/orders";
import type { Order } from "@/types";

/**
 * Ask the seller for a refund (and maybe a return) on a delivered order, within
 * the 3-day window. Once per order; the server prices it and holds the payout.
 */
export default function OrderReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { order, setOrder, loadState } = useBuyerOrder(id);
  return (
    <BuyerOrderGate loadState={loadState} order={order}>
      {(o) => <ReturnForm order={o} onSent={setOrder} />}
    </BuyerOrderGate>
  );
}

function ReturnForm({ order, onSent }: { order: Order; onSent: (o: Order) => void }) {
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnReasonId | null>(null);
  const [statement, setStatement] = useState("");
  const [problem, setProblem] = useState("");
  const [sending, setSending] = useState(false);
  const now = new Date();

  const priced = {
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    totalAmount: order.total,
    items: order.items.map((i) => ({ id: i.id ?? i.product.id, quantity: i.quantity, unitPrice: i.unitPrice ?? i.product.price })),
  };
  const estimate = estimateRefund(priced, picked);
  const anyPicked = Object.values(picked).some((q) => q > 0);

  async function submit() {
    const found = returnRequestProblem(picked, reason, statement);
    setProblem(found ?? "");
    if (found || !reason) return;
    setSending(true);
    const { data, error } = await requestReturnApi(order.backendId ?? order.id, buildReturnBody(picked, reason, statement));
    setSending(false);
    if (error || !data) {
      setProblem(error?.message || "We couldn't send your request. Nothing was changed.");
      return;
    }
    onSent(data);
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Orders", href: "/orders" },
    { label: `#${order.id}`, href: `/orders/${order.id}` },
    { label: "Refund or return" },
  ];

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <header>
          <h1 className="text-xl font-bold text-kampmax-text">Refund or return</h1>
          <p className="mt-0.5 text-xs text-kampmax-text-secondary">
            Order #{order.id} from {order.vendorName ?? "the seller"} · {formatNaira(order.total)}
          </p>
        </header>

        {order.returnRequest ? (
          <section role="status" className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <CheckCircle className="h-4 w-4" aria-hidden /> Your request is with the seller
            </h2>
            <p className="text-xs">
              They have 48 hours to answer. If they don&apos;t, Kampmax decides. The seller isn&apos;t paid until this
              is settled, and you can follow it on your order.
            </p>
            <Link href={`/orders/${order.id}`} className="inline-block text-xs font-semibold underline">
              Back to my order
            </Link>
          </section>
        ) : !canRequestReturn(order, now) ? (
          <section role="status" className="space-y-2 rounded-2xl border border-kampmax-border bg-white p-4 text-xs text-kampmax-text-secondary">
            <p className="font-semibold text-kampmax-text">A refund can&apos;t be requested here</p>
            <p>
              {order.status !== "delivered"
                ? "You can ask for a refund once the order has been delivered. Before that, report a problem from your order."
                : "The 3-day return window for this order has closed. Contact support and we will look into it."}
            </p>
            <Link href={`/orders/${order.id}`} className="inline-block font-semibold text-primary-600 underline">
              Back to my order
            </Link>
          </section>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <p className="text-xs text-kampmax-text-secondary">
              You have {timeLeft(order.returnWindowEndsAt ?? null, now)} to ask. The seller can refund you, ask for the
              items back first, offer part of it, or decline; if you disagree, Kampmax decides.
            </p>

            <fieldset className="space-y-2 rounded-xl border border-kampmax-border bg-white p-4">
              <legend className="px-1 text-sm font-semibold text-kampmax-text">What do you want a refund for?</legend>
              {order.items.map((item) => {
                const itemId = item.id ?? item.product.id;
                const q = picked[itemId] ?? 0;
                const set = (n: number) => setPicked((p) => ({ ...p, [itemId]: n }));
                return (
                  <div key={itemId} className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm text-kampmax-text">
                      <input type="checkbox" checked={q > 0} onChange={(e) => set(e.target.checked ? item.quantity : 0)} className="h-4 w-4" />
                      {item.product.title} ({formatNaira(item.unitPrice ?? item.product.price)}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ""})
                    </label>
                    {q > 0 && item.quantity > 1 && (
                      <div className="flex items-center gap-2" role="group" aria-label={`How many ${item.product.title}`}>
                        <button type="button" aria-label="One fewer" disabled={q <= 1} onClick={() => set(q - 1)} className="rounded border border-kampmax-border p-1 disabled:opacity-40">
                          <Minus className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <span className="w-6 text-center text-sm tabular-nums">{q}</span>
                        <button type="button" aria-label="One more" disabled={q >= item.quantity} onClick={() => set(q + 1)} className="rounded border border-kampmax-border p-1 disabled:opacity-40">
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {anyPicked && (
                <p className="pt-1 text-sm font-semibold text-emerald-700">
                  About {formatNaira(estimate.amount)} back to your Kampmax wallet{estimate.wholeOrder ? ", delivery included" : ""}.
                </p>
              )}
            </fieldset>

            <fieldset className="space-y-2 rounded-xl border border-kampmax-border bg-white p-4">
              <legend className="px-1 text-sm font-semibold text-kampmax-text">What went wrong?</legend>
              {RETURN_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm",
                    reason === r.id ? "border-kampmax-blue bg-kampmax-blue/5 font-semibold" : "border-kampmax-border"
                  )}
                >
                  <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} />
                  {r.label}
                </label>
              ))}
            </fieldset>

            <label className="block space-y-1">
              <span className="text-sm font-semibold text-kampmax-text">Tell the seller what happened</span>
              <textarea
                rows={5}
                value={statement}
                maxLength={RETURN_STATEMENT_MAX}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="What did you get, and what should have happened?"
                className="w-full rounded-lg border border-kampmax-border p-3 text-sm focus:border-kampmax-blue focus:outline-none"
              />
              <span className="block text-xs text-kampmax-text-secondary">
                The seller sees your reason and what you write, so they can decide quickly.
              </span>
            </label>

            {problem && (
              <p role="alert" className="text-sm text-kampmax-error">
                {problem}
              </p>
            )}
            <button
              type="submit"
              disabled={sending}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-kampmax-navy text-sm font-bold text-white hover:bg-kampmax-navy/90 disabled:opacity-60"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Send request
            </button>
          </form>
        )}
      </div>
    </PageContainer>
  );
}
