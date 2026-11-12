"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AlertTriangle, Home, LifeBuoy, RotateCw, Wallet } from "lucide-react";

/**
 * The recoverable error screen used by every route's error.tsx.
 *
 * Money screens get different words on purpose. When a page breaks in the
 * middle of a payment, the question in the person's head is "was I charged?",
 * so the screen answers it first, says what NOT to do (pay again blindly), and
 * points at the one place that shows the truth. Nothing here shows the raw
 * error text (it can leak details); the digest is shown as a reference code
 * support can look up.
 */
export type RouteErrorVariant = "generic" | "checkout" | "payment" | "wallet" | "contract" | "order" | "booking";

interface VariantCopy {
  title: string;
  body: string;
  /** Where the person can confirm what actually happened. */
  check?: { href: string; label: string };
  /** Pre-selected support category. */
  category?: string;
}

const VARIANTS: Record<RouteErrorVariant, VariantCopy> = {
  generic: {
    title: "This page couldn't load",
    body: "Something went wrong on our side. Your account and data are safe. Try again, or head back and carry on.",
  },
  checkout: {
    title: "Checkout hit a problem",
    body: "Your cart is saved. If you were redirected to pay, your payment may still have gone through. Check My orders before paying again so you are not charged twice.",
    check: { href: "/orders", label: "Check my orders" },
    category: "payments",
  },
  payment: {
    title: "We couldn't finish that payment screen",
    body: "Nothing has been taken twice. If you completed a payment, it will show in your orders or wallet within a few minutes. Please don't pay again until you've checked.",
    check: { href: "/orders", label: "Check my orders" },
    category: "payments",
  },
  wallet: {
    title: "We couldn't load your wallet",
    body: "Your balance and money are safe. This is only the screen failing to load. Try again in a moment. If you were withdrawing, don't repeat it until you've checked your activity.",
    check: { href: "/pay", label: "Open wallet" },
    category: "payments",
  },
  contract: {
    title: "We couldn't load this contract",
    body: "The money in escrow is safe and nothing about your contract has changed. Try again. If you were funding, submitting or approving work, check the contract before doing it a second time.",
    check: { href: "/freelancer/contracts", label: "Open my contracts" },
    category: "payments",
  },
  order: {
    title: "We couldn't load this order",
    body: "Your order and payment are safe. This is only the screen failing to load. Try again, or check your orders list.",
    check: { href: "/orders", label: "Check my orders" },
    category: "marketplace",
  },
  booking: {
    title: "We couldn't load this booking",
    body: "Your booking and any payment are safe. Try again, or check your bookings.",
    category: "marketplace",
  },
};

export function RouteError({
  error,
  retry,
  reset,
  variant = "generic",
  homeHref = "/home",
  fullScreen = false,
}: {
  error: Error & { digest?: string };
  /** Next 16: re-fetches and re-renders the failed segment. */
  retry?: () => void;
  /** Older name for the same recovery; used when `retry` is absent. */
  reset?: () => void;
  variant?: RouteErrorVariant;
  homeHref?: string;
  /** Roots without a surrounding layout (global-error, not-found) centre themselves on the page. */
  fullScreen?: boolean;
}) {
  const copy = VARIANTS[variant];
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Keep the details for developers, never for the screen.
    console.error(error);
    // Move focus so keyboard and screen-reader users land on the problem.
    heading.current?.focus();
  }, [error]);

  const tryAgain = retry ?? reset;
  const helpHref = `/support/new?subject=${encodeURIComponent(copy.title)}${copy.category ? `&category=${copy.category}` : ""}`;

  return (
    <div
      role="alert"
      className={fullScreen ? "flex min-h-screen items-center justify-center px-4" : "flex min-h-[50vh] items-center justify-center px-4 py-10"}
    >
      <div className="w-full max-w-md rounded-2xl border border-kampmax-border bg-white p-6 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-50 text-error-600">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </div>
        <h1 ref={heading} tabIndex={-1} className="mt-4 text-lg font-bold text-kampmax-text outline-none">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-kampmax-text-secondary">{copy.body}</p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {tryAgain && (
            <button
              type="button"
              onClick={() => tryAgain()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            >
              <RotateCw className="h-4 w-4" aria-hidden /> Try again
            </button>
          )}
          {copy.check && (
            <Link
              href={copy.check.href}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-kampmax-border px-4 py-2.5 text-sm font-semibold text-kampmax-text hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            >
              <Wallet className="h-4 w-4" aria-hidden /> {copy.check.label}
            </Link>
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs">
          <Link href={helpHref} className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:underline">
            <LifeBuoy className="h-3.5 w-3.5" aria-hidden /> Get help
          </Link>
          <Link href={homeHref} className="inline-flex items-center gap-1 font-semibold text-kampmax-text-secondary hover:underline">
            <Home className="h-3.5 w-3.5" aria-hidden /> Go home
          </Link>
        </div>

        {error.digest && (
          <p className="mt-4 text-[11px] text-neutral-400">
            Reference: <span className="font-mono">{error.digest}</span>. Quote this if you contact support.
          </p>
        )}
      </div>
    </div>
  );
}
