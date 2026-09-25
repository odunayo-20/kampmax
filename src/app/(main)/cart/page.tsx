"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, ShoppingBag, Loader2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useApp } from "@/lib/app-context";
import { getVendorById } from "@/services/users";
import { useEnsureVendors } from "@/hooks/use-vendor-cache";
import { formatNaira } from "@/lib/utils";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/atoms/Button";
import {
  VendorGroup,
  CartSummary,
  SavedForLater,
  EmptyCart,
} from "@/components/cart";

export default function CartPage() {
  const router = useRouter();
  const { selectedCampus } = useApp();
  const {
    items,
    savedItems,
    vendorGroups,
    summary,
    isLoading,
    pendingId,
    updateQuantity,
    removeItem,
    saveForLater,
    moveToCart,
    removeSavedItem,
    clearCart,
    validateCart,
  } = useCart();

  const activeItems = useMemo(
    () => items.filter((i) => !i.savedForLater),
    [items]
  );

  const vendorsLoaded = useEnsureVendors(items.map((i) => i.product.vendorId));

  const vendorNameCache = useMemo(() => {
    const cache: Record<string, { name: string; verified: boolean }> = {};
    vendorGroups.forEach((g) => {
      const vendor = getVendorById(g.vendorId);
      cache[g.vendorId] = {
        name: vendor?.storeName || "Unknown Vendor",
        verified: vendor?.verified || false,
      };
    });
    savedItems.forEach((item) => {
      if (!cache[item.product.vendorId]) {
        const vendor = getVendorById(item.product.vendorId);
        cache[item.product.vendorId] = {
          name: vendor?.storeName || "Unknown Vendor",
          verified: vendor?.verified || false,
        };
      }
    });
    return cache;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorGroups, savedItems, vendorsLoaded]);

  // Re-validate cart lines against the current catalog on mount.
  useEffect(() => {
    validateCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isEmpty = activeItems.length === 0 && savedItems.length === 0;

  if (isEmpty && !isLoading) {
    return (
      <PageContainer>
        <EmptyCart campusName={selectedCampus.name} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-kampmax-muted transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-kampmax-text" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-kampmax-text">Cart</h1>
            <p className="text-xs text-kampmax-text-secondary">
              {isLoading ? (
                "Loading cart…"
              ) : (
                <>
                  {summary.itemCount}{" "}
                  {summary.itemCount === 1 ? "item" : "items"}
                  {vendorGroups.length > 1 &&
                    ` from ${vendorGroups.length} vendors`}
                </>
              )}
            </p>
          </div>
        </div>

        {activeItems.length > 0 && (
          <button
            onClick={clearCart}
            className="flex items-center gap-1.5 text-xs text-kampmax-text-secondary hover:text-kampmax-error transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear cart
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-kampmax-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading your cart…
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-8">
          {/* Left: items */}
          <div className="space-y-4">
            {vendorGroups.length > 0 && (
              <div className="space-y-4">
                {vendorGroups.map((group, index) => (
                  <VendorGroup
                    key={group.vendorId || `vendor-group-${index}`}
                    group={group}
                    vendorName={
                      vendorNameCache[group.vendorId]?.name || "Unknown Vendor"
                    }
                    vendorVerified={vendorNameCache[group.vendorId]?.verified}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeItem}
                    onSaveForLater={saveForLater}
                    pendingId={pendingId}
                  />
                ))}
              </div>
            )}

            {activeItems.length === 0 && savedItems.length > 0 && (
              <div className="text-center py-6 bg-white rounded-xl border border-kampmax-border">
                <ShoppingBag className="h-8 w-8 mx-auto text-kampmax-text-secondary/40 mb-2" />
                <p className="text-sm text-kampmax-text-secondary">
                  All items are saved for later. Move items to your cart to
                  checkout.
                </p>
              </div>
            )}

            <SavedForLater
              items={savedItems}
              onMoveToCart={moveToCart}
              onRemove={removeSavedItem}
            />
          </div>

          {/* Right: sticky summary (desktop) */}
          {activeItems.length > 0 && (
            <aside className="lg:sticky lg:top-20 space-y-4 mt-6 lg:mt-0">
              <CartSummary summary={summary} />
              <Button
                onClick={() => router.push("/checkout")}
                className="w-full bg-kampmax-blue text-white hover:bg-kampmax-blue/90 h-12 text-base font-semibold"
              >
                Proceed to Checkout · {formatNaira(summary.total)}
              </Button>
              <p className="text-center text-[11px] text-kampmax-text-muted">
                Delivery and fees calculated at checkout. Backend validates the
                final total.
              </p>
            </aside>
          )}
        </div>
      )}

      {/* Mobile sticky CTA (above the bottom navigation bar) */}
      {activeItems.length > 0 && (
        <div className="lg:hidden fixed bottom-[60px] inset-x-0 z-30 border-t border-kampmax-border bg-white/95 backdrop-blur px-4 py-3 safe-bottom">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-kampmax-text-secondary">Total</p>
              <p className="text-base font-bold text-kampmax-navy tabular-nums truncate">
                {formatNaira(summary.total)}
              </p>
            </div>
            <Button
              onClick={() => router.push("/checkout")}
              className="bg-kampmax-blue text-white hover:bg-kampmax-blue/90 h-11 px-6 flex-1 max-w-[240px]"
            >
              Checkout
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
