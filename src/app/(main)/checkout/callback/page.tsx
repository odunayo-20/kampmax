"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useCart } from "@/lib/cart-context";
import { verifyPaymentApi } from "@/services/checkout";
import { cancelUnpaidOrders } from "@/services/orders";

type Phase =
  | { kind: "verifying" }
  | { kind: "success"; orderId: string }
  | { kind: "pending"; orderId: string }
  | { kind: "failed"; message: string };

/**
 * Paystack redirects here with ?reference=…&trxref=…. The payment is verified
 * with the backend (which asks Paystack — the URL is never trusted), and only
 * then is the cart cleared and the order shown.
 */
function CheckoutCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const { clearCart } = useCart();
  const [phase, setPhase] = useState<Phase>({ kind: "verifying" });
  const started = useRef(false);

  const reference = params.get("reference") || params.get("trxref") || "";

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!reference) {
      setPhase({ kind: "failed", message: "Missing payment reference." });
      return;
    }

    void verifyPaymentApi(reference, true).then(({ data, error }) => {
      if (!data) {
        setPhase({ kind: "failed", message: error?.message || "We couldn't verify your payment." });
        return;
      }
      if (data.status === "SUCCESS") {
        clearCart();
        setPhase({ kind: "success", orderId: data.orderId });
        setTimeout(() => router.replace(`/orders/${data.orderId}`), 1500);
      } else if (data.status === "PENDING") {
        setPhase({ kind: "pending", orderId: data.orderId });
      } else {
        // The payment did not go through, so neither does the order.
        void cancelUnpaidOrders(data.orderIds?.length ? data.orderIds : [data.orderId]);
        setPhase({ kind: "failed", message: "Payment was not completed. Your order was not placed and you have not been charged." });
      }
    });
  }, [reference, clearCart, router]);

  return (
    <PageContainer>
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-20 text-center">
        {phase.kind === "verifying" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-kampmax-blue" />
            <p className="text-sm font-medium text-kampmax-text">Confirming your payment…</p>
          </>
        )}
        {phase.kind === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-kampmax-success" />
            <p className="text-sm font-semibold text-kampmax-text">Payment successful</p>
            <p className="text-xs text-kampmax-text-secondary">Taking you to your order…</p>
          </>
        )}
        {phase.kind === "pending" && (
          <>
            <Loader2 className="h-10 w-10 text-kampmax-gold" />
            <p className="text-sm font-semibold text-kampmax-text">Payment still processing</p>
            <button type="button" onClick={() => router.replace(`/orders/${phase.orderId}`)} className="text-sm font-medium text-kampmax-blue">
              View order
            </button>
          </>
        )}
        {phase.kind === "failed" && (
          <>
            <XCircle className="h-10 w-10 text-kampmax-error" />
            <p className="text-sm font-semibold text-kampmax-text">{phase.message}</p>
            <button type="button" onClick={() => router.replace("/checkout")} className="text-sm font-medium text-kampmax-blue">
              Back to checkout
            </button>
          </>
        )}
      </div>
    </PageContainer>
  );
}

export default function CheckoutCallbackPage() {
  return (
    <Suspense>
      <CheckoutCallback />
    </Suspense>
  );
}
