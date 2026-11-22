"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, ShoppingBag, ShoppingCart, Lock } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useApp } from "@/lib/app-context";
import { getVendorById } from "@/services/users";
import { formatNaira } from "@/lib/utils";
import { QuantitySelector } from "./QuantitySelector";
import type { CartLineItem } from "@/types/cart";
import { cn } from "@/lib/utils";

function DrawerLineItem({ line }: { line: CartLineItem }) {
  const { updateQuantity, removeItem, pendingId, pendingAction } = useCart();
  const vendor = getVendorById(line.vendorId);
  const isPending = pendingId === line.productId;
  const subtotal = (line.unitPrice ?? line.product.price) * line.quantity;

  return (
    <div className="flex gap-3 py-3 border-b border-neutral-100 last:border-0">
      <Link
        href={`/marketplace/${line.product.id}`}
        className="w-16 h-16 bg-neutral-50 rounded-md flex-shrink-0 overflow-hidden flex items-center justify-center"
        aria-label={line.product.title}
      >
        <svg className="w-6 h-6 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/marketplace/${line.product.id}`}
            className="text-sm font-medium text-neutral-900 leading-snug line-clamp-2 hover:text-primary-600 transition-colors"
          >
            {line.product.title}
          </Link>
          <button
            onClick={() => removeItem(line.product.id)}
            aria-label="Remove item"
            className="p-1 text-neutral-400 hover:text-error-600 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {line.variantLabel && (
          <p className="text-xs text-neutral-500 mt-0.5">{line.variantLabel}</p>
        )}

        <div className="flex items-center justify-between mt-2">
          <QuantitySelector
            value={line.quantity}
            max={line.maxPurchaseQuantity}
            loading={isPending && pendingAction === "quantity"}
            onChange={(q) => updateQuantity(line.productId, q)}
          />
          <span className="text-sm font-bold text-primary-900 tabular-nums">
            {formatNaira(subtotal)}
          </span>
        </div>
        {vendor && (
          <p className="text-[11px] text-neutral-400 mt-1">
            {vendor.storeName}
          </p>
        )}
      </div>
    </div>
  );
}

export function CartDrawer() {
  const router = useRouter();
  const {
    items,
    isCartOpen,
    closeCart,
    summary,
    vendorGroups,
  } = useCart();
  const { selectedCampus } = useApp();

  const activeItems = items.filter((i) => !i.savedForLater) as CartLineItem[];
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCartOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isCartOpen, closeCart]);

  useEffect(() => {
    if (isCartOpen) {
      const t = setTimeout(() => panelRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
      <div className="absolute inset-0 bg-black/50" onClick={closeCart} aria-hidden="true" />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl flex flex-col focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h2 id="cart-drawer-title" className="flex items-center gap-2 text-base font-bold text-neutral-900">
            <ShoppingBag className="h-5 w-5 text-primary-600" />
            {summary.itemCount} {summary.itemCount === 1 ? "item" : "items"}
            {vendorGroups.length > 1 && ` · ${vendorGroups.length} sellers`}
          </h2>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Campus ribbon */}
        <div className="px-5 py-2 bg-primary-50/60 text-xs text-primary-700 flex items-center gap-1.5 border-b border-primary-100">
          <Lock className="h-3 w-3" />
          Shopping near <span className="font-semibold">{selectedCampus.name}</span>
        </div>

        {/* Body */}
        {activeItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
            <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
              <ShoppingCart className="h-8 w-8 text-neutral-400" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900">Your cart is waiting</h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-xs">
              Discover products from vendors around your campus and add something you love.
            </p>
            <Link
              href="/marketplace"
              onClick={closeCart}
              className="mt-5 inline-flex items-center justify-center h-11 px-5 rounded-md bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-2">
            {activeItems.map((line) => (
              <DrawerLineItem key={line.id} line={line} />
            ))}
          </div>
        )}

        {/* Footer */}
        {activeItems.length > 0 && (
          <div className="border-t border-neutral-200 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-500">Subtotal</span>
              <span className="text-base font-bold text-neutral-900 tabular-nums">
                {formatNaira(summary.itemsSubtotal)}
              </span>
            </div>
            <p className="text-xs text-neutral-500 -mt-1">
              Delivery and platform fee shown at checkout.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  closeCart();
                  router.push("/cart");
                }}
                className="flex-1 h-11 rounded-md border border-neutral-300 text-neutral-800 text-sm font-semibold hover:bg-neutral-50 transition-colors"
              >
                View Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  closeCart();
                  router.push("/checkout");
                }}
                className="flex-1 h-11 rounded-md bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
