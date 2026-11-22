"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { ConfirmStep } from "@/components/orders/ConfirmStep";
import { ReturnSummary } from "@/components/orders/ReturnSummary";
import { buyerReturnView, canRequestReturn, timeLeft, type BuyerReturnAction } from "@/lib/returns";
import { formatNaira } from "@/lib/utils";
import { moveReturnApi, type BuyerReturnStep } from "@/services/orders";
import type { Order } from "@/types";

const STEP: Record<BuyerReturnAction, BuyerReturnStep> = { accept_offer: "accept-offer", escalate: "escalate", withdraw: "withdraw" };
const LABEL: Record<BuyerReturnAction, string> = { accept_offer: "Accept the offer", escalate: "Ask Kampmax to decide", withdraw: "Withdraw request" };

/**
 * The buyer's refund request on a delivered order: the way in while the 3-day
 * window is open, then where the request stands and the buyer's next step.
 */
export function BuyerReturnCard({ order, onChange }: { order: Order; onChange: (updated: Order) => void }) {
  const [confirming, setConfirming] = useState<BuyerReturnAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const now = new Date();

  const r = order.returnRequest;
  if (!r) {
    if (!canRequestReturn(order, now)) return null;
    return (
      <section className="flex items-start gap-3 rounded-xl border border-kampmax-blue/20 bg-kampmax-blue/5 p-4">
        <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-kampmax-blue" aria-hidden />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-kampmax-navy">Something wrong with your order?</p>
          <p className="text-xs text-kampmax-text-secondary">
            You have {timeLeft(order.returnWindowEndsAt ?? null, now)} to ask the seller for a refund or return.
          </p>
          <Link
            href={`/orders/${order.id}/return`}
            className="inline-flex items-center rounded-lg border border-kampmax-border bg-white px-3 py-1.5 text-xs font-semibold text-kampmax-text hover:bg-kampmax-muted"
          >
            Ask for a refund
          </Link>
        </div>
      </section>
    );
  }

  const view = buyerReturnView(r, now, formatNaira);
  const confirmText: Record<BuyerReturnAction, { title: string; text: string; cta: string }> = {
    accept_offer: { title: `Accept ${formatNaira(r.offeredAmount ?? 0)}?`, text: "It goes to your Kampmax wallet now, and the request closes.", cta: "Accept offer" },
    escalate: { title: "Ask Kampmax to decide?", text: "Kampmax looks at what you and the seller said and decides how much to refund. The decision is final.", cta: "Ask Kampmax" },
    withdraw: { title: "Withdraw your request?", text: "The seller is then paid as normal, and you can't ask again for this order.", cta: "Withdraw" },
  };

  async function run(action: BuyerReturnAction) {
    setBusy(true);
    setProblem("");
    const { data, error } = await moveReturnApi(order.backendId ?? order.id, STEP[action]);
    setBusy(false);
    setConfirming(null);
    if (error || !data) {
      setProblem(error?.message || "That didn't go through. Refresh the page to see where your request stands.");
      return;
    }
    onChange(data);
  }

  return (
    <ReturnSummary request={r} view={view} audience="buyer">
      {view.actions.length > 0 && (
        <div className="space-y-2">
          {problem && (
            <p role="alert" className="text-xs text-kampmax-error">
              {problem}
            </p>
          )}
          {confirming ? (
            <ConfirmStep
              title={confirmText[confirming].title}
              text={confirmText[confirming].text}
              confirmLabel={confirmText[confirming].cta}
              danger={confirming === "withdraw"}
              busy={busy}
              onConfirm={() => void run(confirming)}
              onCancel={() => setConfirming(null)}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {view.actions.map((a, i) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setConfirming(a)}
                  className={
                    i === 0 && a !== "withdraw"
                      ? "rounded-lg bg-kampmax-navy px-3 py-2 text-xs font-bold text-white hover:bg-kampmax-navy/90"
                      : "rounded-lg border border-kampmax-border bg-white px-3 py-2 text-xs font-semibold text-kampmax-text hover:bg-kampmax-muted"
                  }
                >
                  {LABEL[a]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </ReturnSummary>
  );
}
