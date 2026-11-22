"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfirmStep } from "@/components/orders/ConfirmStep";
import { ReturnSummary } from "@/components/orders/ReturnSummary";
import { vendorDashboardKeys, vendorOrderKeys } from "@/lib/query-keys";
import {
  DECLINE_NOTE_MIN,
  offerProblem,
  parseOffer,
  VENDOR_NOTE_MAX,
  vendorReturnView,
  type VendorReturnAction,
} from "@/lib/returns";
import { cn, formatNaira } from "@/lib/utils";
import { answerVendorReturn, moveVendorReturn, type VendorReturnAnswer } from "@/services/vendor-orders-api";
import type { VendorOrder } from "@/types/vendor-orders";

type Form = "return_first" | "offer" | "decline";
type Quick = "refund" | "received" | "escalate";

const LABEL: Record<VendorReturnAction, string> = {
  refund: "Refund now",
  return_first: "Ask for the items back first",
  offer: "Offer a smaller refund",
  decline: "Decline",
  received: "I have the items back",
  escalate: "Ask Kampmax to decide",
};

/**
 * The vendor's side of a buyer's refund request: where it stands, and their
 * answer. Refunding is one confirmed click; asking for the items back, offering
 * less or declining open a short form first.
 */
export function VendorReturnPanel({ order }: { order: VendorOrder }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [confirming, setConfirming] = useState<Quick | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState("");

  const act = useMutation({
    mutationFn: (step: { answer: VendorReturnAnswer } | { move: "received" | "escalate" }) =>
      "answer" in step ? answerVendorReturn(order.id, step.answer) : moveVendorReturn(order.id, step.move),
    onSuccess: async (updated) => {
      queryClient.setQueryData(vendorOrderKeys.detail(order.id), updated);
      setForm(null);
      setConfirming(null);
      setAmount("");
      setNote("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: vendorOrderKeys.all }),
        queryClient.invalidateQueries({ queryKey: vendorDashboardKeys.all }),
      ]);
    },
    onError: (e: Error) => {
      setConfirming(null);
      setProblem(e.message || "That didn't go through. Refresh to see where the request stands.");
      // The buyer or the clock may have moved it on: show what is true now.
      void queryClient.invalidateQueries({ queryKey: vendorOrderKeys.detail(order.id) });
    },
  });

  const r = order.returnRequest;
  if (!r) return null;
  const view = vendorReturnView(r, new Date(), formatNaira);

  const quick: Record<Quick, { title: string; text: string; run: () => void }> = {
    refund: {
      title: `Refund ${formatNaira(r.requestedAmount)} now?`,
      text: "It goes to the buyer's Kampmax wallet straight away, and your payout for this order is reduced to match.",
      run: () => act.mutate({ answer: { action: "refund" } }),
    },
    received: {
      title: "Got the items back?",
      text: `This refunds ${formatNaira(r.requestedAmount)} to the buyer now. Only confirm once you have them.`,
      run: () => act.mutate({ move: "received" }),
    },
    escalate: {
      title: "Ask Kampmax to decide?",
      text: "Kampmax looks at what you and the buyer said and decides. Your payout waits until then.",
      run: () => act.mutate({ move: "escalate" }),
    },
  };

  function choose(action: VendorReturnAction) {
    setProblem("");
    if (action === "return_first" || action === "offer" || action === "decline") setForm(action);
    else setConfirming(action);
  }

  function submit() {
    if (!form || !r) return;
    const trimmed = note.trim();
    setProblem("");
    if (form === "offer") {
      const wrong = offerProblem(amount, r.requestedAmount);
      if (wrong) return setProblem(wrong);
      return act.mutate({ answer: { action: "offer", amount: parseOffer(amount), ...(trimmed ? { note: trimmed } : {}) } });
    }
    if (form === "decline") {
      if (trimmed.length < DECLINE_NOTE_MIN) return setProblem("Tell the buyer why you are declining.");
      return act.mutate({ answer: { action: "decline", note: trimmed } });
    }
    act.mutate({ answer: { action: "return_first", ...(trimmed ? { note: trimmed } : {}) } });
  }

  const noteLabel =
    form === "decline"
      ? "Why are you declining? The buyer can then ask Kampmax to decide."
      : form === "offer"
        ? "Message to the buyer (optional)"
        : "Where and when should they bring it? (optional)";

  return (
    <ReturnSummary request={r} view={view} audience="vendor">
      <div className="space-y-2">
        {problem && (
          <p role="alert" className="text-xs text-kampmax-error">
            {problem}
          </p>
        )}

        {form ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {form === "offer" && (
              <label className="block space-y-1 text-xs">
                <span className="font-semibold text-kampmax-text">Your offer (₦)</span>
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block h-9 w-full max-w-xs rounded-md border border-kampmax-border px-2 text-sm"
                />
                <span className="block text-kampmax-text-secondary">
                  Less than {formatNaira(r.requestedAmount)}. The buyer can accept it or ask Kampmax.
                </span>
              </label>
            )}
            <label className="block space-y-1 text-xs">
              <span className="font-semibold text-kampmax-text">{noteLabel}</span>
              <textarea
                rows={3}
                value={note}
                maxLength={VENDOR_NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-md border border-kampmax-border p-2 text-sm"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setForm(null);
                  setProblem("");
                }}
                className="h-9 flex-1 rounded-lg border border-kampmax-border bg-white text-xs font-semibold text-kampmax-text hover:bg-kampmax-muted"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={act.isPending}
                className={cn(
                  "h-9 flex-[2] rounded-lg text-xs font-bold text-white disabled:opacity-60",
                  form === "decline" ? "bg-kampmax-error hover:bg-red-700" : "bg-kampmax-navy hover:bg-kampmax-navy/90"
                )}
              >
                {act.isPending ? "Sending…" : form === "decline" ? "Decline" : form === "offer" ? "Send offer" : "Ask for them back"}
              </button>
            </div>
          </form>
        ) : confirming ? (
          <ConfirmStep
            title={quick[confirming].title}
            text={quick[confirming].text}
            confirmLabel={LABEL[confirming]}
            busy={act.isPending}
            onConfirm={quick[confirming].run}
            onCancel={() => setConfirming(null)}
          />
        ) : (
          view.actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {view.actions.map((a, i) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => choose(a)}
                  className={
                    i === 0
                      ? "rounded-lg bg-kampmax-navy px-3 py-2 text-xs font-bold text-white hover:bg-kampmax-navy/90"
                      : "rounded-lg border border-kampmax-border bg-white px-3 py-2 text-xs font-semibold text-kampmax-text hover:bg-kampmax-muted"
                  }
                >
                  {LABEL[a]}
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </ReturnSummary>
  );
}
