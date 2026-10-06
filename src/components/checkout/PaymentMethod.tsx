"use client";

import Link from "next/link";
import { CreditCard, ShieldCheck, Lock, Wallet } from "lucide-react";
import { CheckoutPaymentMethod } from "@/types/checkout";
import { formatNaira } from "@/lib/utils";

interface PaymentMethodProps {
  paymentMethod: CheckoutPaymentMethod;
  paystackEnabled: boolean;
  finalTotal: number;
  onChange: (method: CheckoutPaymentMethod) => void;
  /** Kampmax Pay wallet balance; undefined while loading or unavailable (e.g. guests). */
  walletBalance?: number;
  walletEnabled?: boolean;
}

const optionClass = (selected: boolean, disabled = false) =>
  "flex items-center gap-3 p-3 rounded-lg border transition-colors " +
  (disabled ? "opacity-60 cursor-not-allowed " : "cursor-pointer ") +
  (selected
    ? "border-kampmax-blue bg-kampmax-blue/5"
    : "border-kampmax-border " + (disabled ? "" : "hover:border-kampmax-blue/40"));

export function PaymentMethod({
  paymentMethod,
  paystackEnabled,
  finalTotal,
  onChange,
  walletBalance,
  walletEnabled = false,
}: PaymentMethodProps) {
  const walletInsufficient =
    walletBalance !== undefined && walletBalance < finalTotal;
  const walletDisabled = !walletEnabled || walletInsufficient;

  return (
    <section
      aria-labelledby="payment-method-title"
      className="bg-white rounded-xl border border-kampmax-border p-4 sm:p-5 space-y-3"
    >
      <h2
        id="payment-method-title"
        className="text-sm font-semibold text-kampmax-text flex items-center gap-2"
      >
        <CreditCard className="h-4 w-4 text-kampmax-blue" />
        Payment Method
      </h2>

      <fieldset disabled={!paystackEnabled}>
        <label className={optionClass(paymentMethod === "paystack")}>
          <input
            type="radio"
            name="payment-method"
            value="paystack"
            checked={paymentMethod === "paystack"}
            onChange={() => onChange("paystack")}
            className="h-4 w-4 text-kampmax-blue focus:ring-kampmax-blue/30 accent-kampmax-blue"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-kampmax-text">Paystack</p>
            <p className="text-xs text-kampmax-text-secondary">
              Secure payment processing — card, bank transfer, USSD.
            </p>
          </div>
          <Lock className="h-4 w-4 text-kampmax-success shrink-0" />
        </label>
      </fieldset>

      {walletEnabled && (
        <fieldset disabled={walletDisabled}>
          <label className={optionClass(paymentMethod === "wallet", walletDisabled)}>
            <input
              type="radio"
              name="payment-method"
              value="wallet"
              checked={paymentMethod === "wallet"}
              onChange={() => onChange("wallet")}
              className="h-4 w-4 text-kampmax-blue focus:ring-kampmax-blue/30 accent-kampmax-blue"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-kampmax-text">Kampmax Pay wallet</p>
              <p className="text-xs text-kampmax-text-secondary">
                {walletBalance !== undefined
                  ? `Balance ${formatNaira(walletBalance)}`
                  : "Pay instantly from your wallet balance."}
              </p>
            </div>
            <Wallet className="h-4 w-4 text-kampmax-blue shrink-0" />
          </label>
          {walletInsufficient && (
            <p className="mt-1.5 text-xs text-kampmax-text-secondary">
              Your wallet balance is too low for this order.{" "}
              <Link href="/profile/wallet" className="font-semibold text-kampmax-blue">
                Top up
              </Link>
            </p>
          )}
        </fieldset>
      )}

      {!paystackEnabled && (
        <p className="text-xs text-kampmax-text-secondary">
          Online payment is not enabled in this prototype.
        </p>
      )}

      <div className="flex items-start gap-2 p-2.5 bg-kampmax-blue/10 rounded-lg">
        <ShieldCheck className="w-4 h-4 text-kampmax-blue shrink-0 mt-0.5" />
        {paymentMethod === "wallet" ? (
          <p className="text-[11px] text-kampmax-text-secondary leading-relaxed">
            <span className="font-semibold text-kampmax-text tabular-nums">
              {formatNaira(finalTotal)}
            </span>{" "}
            will be deducted from your Kampmax Pay wallet when you place the order.
          </p>
        ) : (
          <p className="text-[11px] text-kampmax-text-secondary leading-relaxed">
            You&apos;ll be redirected to Paystack&apos;s secure flow to pay {" "}
            <span className="font-semibold text-kampmax-text tabular-nums">
              {formatNaira(finalTotal)}
            </span>
            . Kampmax never collects your card number, CVV or bank credentials
            directly.
          </p>
        )}
      </div>
    </section>
  );
}
