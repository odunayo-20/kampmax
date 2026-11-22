"use client";

import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";

interface CheckoutHeaderProps {
  itemCount: number;
  vendorCount: number;
}

export function CheckoutHeader({ itemCount, vendorCount }: CheckoutHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/cart"
          aria-label="Back to cart"
          className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-kampmax-muted transition-colors shrink-0"
        >
          <ArrowLeft className="h-5 w-5 text-kampmax-text" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-kampmax-text truncate">
            Checkout
          </h1>
          <p className="text-xs text-kampmax-text-secondary">
            {itemCount} {itemCount === 1 ? "item" : "items"}
            {vendorCount > 1 && ` · ${vendorCount} sellers`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-[11px] text-kampmax-text-secondary shrink-0">
        <Lock className="h-3.5 w-3.5 text-kampmax-success" />
        <span className="hidden sm:inline">Secure checkout</span>
      </div>
    </header>
  );
}
