"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { CartItem, Product } from "@/types";
import type { CartLineItem } from "@/types/cart";
import {
  buildCartLine,
  buildPricingSummary,
  groupItemsByVendor,
  mergeCarts,
  validateCartItems,
  makeLineId,
  fetchServerCart,
  addToServerCart,
  updateServerCartItem,
  removeServerCartItem,
  clearServerCart,
} from "@/services/cart";
import { useAuth } from "@/lib/auth-context";
import { useApp } from "@/lib/app-context";
import { getProductById } from "@/services/products";

// ── Constants ──
const STORAGE_KEY = "kampmax_guest_cart_v2";

// ── Vendor Group (kept for existing components) ──
export interface VendorCartGroup {
  vendorId: string;
  vendorName: string;
  items: CartLineItem[];
  subtotal: number;
  deliveryEstimate: string;
}

// ── Cart Summary ──
export interface CartSummary {
  itemsSubtotal: number;
  deliveryFee: number;
  discountTotal: number;
  total: number;
  itemCount: number;
  // campus context attached to the cart
  campusId?: string;
}

export type CartMutation =
  | "quantity"
  | "remove"
  | "save_for_later"
  | "move_to_cart"
  | null;

export interface CartFeedback {
  type: "success" | "error" | "info";
  message: string;
}

// ── Context ──
interface CartContextType {
  items: CartItem[];
  savedItems: CartItem[];
  addItem: (
    product: Product,
    quantity?: number,
    options?: {
      variantLabel?: string;
      selectedVariants?: Record<string, string>;
      /** The option to record on the server cart (it prices and checks stock against it). */
      serverVariations?: Array<{ name: string; option: string }>;
      unitPrice?: number;
      openDrawer?: boolean;
    }
  ) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  saveForLater: (productId: string) => void;
  moveToCart: (productId: string) => void;
  removeSavedItem: (productId: string) => void;
  clearCart: () => void;
  vendorGroups: VendorCartGroup[];
  summary: CartSummary;
  /** @deprecated Use summary.itemCount */
  itemCount: number;
  /** @deprecated Use summary.itemsSubtotal */
  total: number;

  // Cart drawer
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  setCartOpen: (open: boolean) => void;

  // Loading / mutation state
  isLoading: boolean;
  pendingId: string | null;
  pendingAction: CartMutation;

  // Feedback
  feedback: CartFeedback | null;
  dismissFeedback: () => void;

  // Validation & merge
  validateCart: () => void;
  mergeGuestWithServer: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function readStoredCart(): CartItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const lines: CartLineItem[] = [];
    for (const entry of parsed) {
      // The catalog cache is empty on a fresh page load, so fall back to the
      // snapshot saved with the line instead of dropping it.
      const product: Product | undefined = entry?.productId
        ? (getProductById(entry.productId) ?? entry.product)
        : undefined;
      if (!product?.id) continue;
      const qty = typeof entry?.quantity === "number" ? entry.quantity : 1;
      lines.push({
        id: makeLineId(),
        productId: product.id,
        vendorId: product.vendorId,
        product,
        quantity: qty,
        savedForLater: entry.savedForLater ?? false,
        variantLabel: entry.variantLabel,
        selectedVariants: entry.selectedVariants,
        selectedVariation: entry.selectedVariation,
        unitPrice: typeof entry?.unitPrice === "number"
          ? entry.unitPrice
          : product.price,
        availabilityStatus: entry.availabilityStatus,
        maxPurchaseQuantity: entry.maxPurchaseQuantity,
      });
    }
    return lines.length ? lines : null;
  } catch {
    return null;
  }
}

function writeStoredCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    // Guest cart stores only minimum shopping info (product ref, qty, variant).
    const slim = items.map((i) => ({
      productId: i.product.id,
      product: i.product,
      quantity: i.quantity,
      savedForLater: i.savedForLater ?? false,
      variantLabel: (i as CartLineItem).variantLabel,
      selectedVariants: (i as CartLineItem).selectedVariants,
      selectedVariation: (i as CartLineItem).selectedVariation,
      unitPrice: (i as CartLineItem).unitPrice ?? i.product.price,
      availabilityStatus: (i as CartLineItem).availabilityStatus,
      maxPurchaseQuantity: (i as CartLineItem).maxPurchaseQuantity,
    }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    // private browsing / quota exceeded
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const { selectedCampus } = useApp();

  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<CartMutation>(null);
  const [feedback, setFeedback] = useState<CartFeedback | null>(null);
  const mergedRef = useRef<string | null>(null);

  // Load guest cart once on mount.
  useEffect(() => {
    const stored = readStoredCart();
    if (stored) {
      setItems(stored);
    }
    setIsLoading(false);
  }, []);

  // Persist on every change for guest/offline.
  // Signed-in carts live on the server; storing them here would make the next
  // page load merge (and double) them again.
  useEffect(() => {
    if (isLoading || status === "authenticated") return;
    writeStoredCart(items);
  }, [items, isLoading, status]);

  // Synchronize authenticated server cart and merge guest cart when auth is established.
  const mergeGuestWithServer = useCallback(async () => {
    if (status !== "authenticated" || !user) return;
    if (mergedRef.current === user.id) return;
    mergedRef.current = user.id;

    try {
      const serverRes = await fetchServerCart();
      // If the server cart can't be read, keep the local cart untouched and
      // let the next sign-in retry the merge.
      if (serverRes.error) {
        mergedRef.current = null;
        return;
      }
      const serverItems = serverRes.items;
      const guest = items.filter((i) => !i.savedForLater) as CartLineItem[];
      const saved = items.filter((i) => i.savedForLater);

      if (guest.length > 0) {
        // Send guest items to backend cart, preserving chosen varieties
        let failed = 0;
        for (const g of guest) {
          const selectedVariations = g.selectedVariants
            ? Object.entries(g.selectedVariants).map(([name, option]) => ({ name, option }))
            : g.selectedVariation
            ? [{ name: g.selectedVariation.name, option: g.selectedVariation.option }]
            : undefined;

          const res = await addToServerCart({
            productId: g.productId,
            quantity: g.quantity,
            selectedVariations,
          });
          if (res.error) failed += 1;
        }
        const updated = await fetchServerCart();
        if (updated.error) return;
        // Keep any guest line the server did not accept so it isn't lost.
        const missing = guest.filter(
          (g) => !updated.items.some((u) => u.productId === g.productId)
        );
        setItems([...updated.items, ...missing, ...saved]);
        if (failed > 0) {
          setFeedback({
            type: "error",
            message: "Some items couldn't be saved to your account cart.",
          });
        } else {
          // Merged: the server cart is now the source of truth, so the guest
          // copy must not be merged again on the next page load.
          try {
            window.localStorage.removeItem(STORAGE_KEY);
          } catch {
            // ignore
          }
        }
      } else if (serverItems.length > 0) {
        setItems([...serverItems, ...saved]);
      }
    } catch {
      // Keep local state if server sync fails
      mergedRef.current = null;
    }
  }, [status, user, items]);

  useEffect(() => {
    if (status === "authenticated") {
      mergeGuestWithServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const setCartOpen = useCallback((open: boolean) => setIsCartOpen(open), []);
  const dismissFeedback = useCallback(() => setFeedback(null), []);

  const addItem = useCallback(
    (
      product: Product,
      quantity = 1,
      options?: {
        variantLabel?: string;
        selectedVariants?: Record<string, string>;
        /** The option to record on the server cart (it prices and checks stock against it). */
        serverVariations?: Array<{ name: string; option: string }>;
        unitPrice?: number;
        openDrawer?: boolean;
      }
    ) => {
      const line = buildCartLine(product, quantity, {
        variantLabel: options?.variantLabel,
        selectedVariants: options?.selectedVariants,
        unitPrice: options?.unitPrice,
      });

      // Optimistic local state update
      setItems((prev) => {
        const existing = prev.find(
          (i) =>
            !i.savedForLater &&
            i.product.id === product.id &&
            JSON.stringify((i as CartLineItem).selectedVariants ?? {}) ===
              JSON.stringify(options?.selectedVariants ?? {})
        );
        if (existing) {
          const nextQty = Math.min(
            (existing as CartLineItem).maxPurchaseQuantity ??
              existing.quantity + quantity,
            existing.quantity + quantity
          );
          return prev.map((i) =>
            i === existing
              ? { ...i, quantity: nextQty, ...(line.unitPrice !== undefined ? { unitPrice: line.unitPrice } : {}) }
              : i
          );
        }
        const saved = prev.find(
          (i) => i.product.id === product.id && i.savedForLater
        );
        if (saved) {
          return prev.map((i) =>
            i.product.id === product.id && i.savedForLater
              ? { ...i, quantity, savedForLater: false }
              : i
          );
        }
        return [...prev, line];
      });

      // Send to backend if authenticated
      if (status === "authenticated") {
        const resolvedVariations =
          options?.serverVariations ??
          (options?.selectedVariants
            ? Object.entries(options.selectedVariants).map(([name, option]) => ({ name, option }))
            : undefined);

        addToServerCart({
          productId: product.id,
          quantity,
          selectedVariations: resolvedVariations,
        }).then(async (res) => {
          if (res.error) {
            setFeedback({
              type: "error",
              message: res.error.message || "Couldn't save this item to your cart. Please try again.",
            });
            // The server rejected it (e.g. out of stock): drop the optimistic
            // line by reloading the real server cart.
            const server = await fetchServerCart();
            if (!server.error) {
              setItems((prev) => [
                ...server.items,
                ...prev.filter((i) => i.savedForLater),
              ]);
            }
            return;
          }
          if (res.items && res.items.length > 0) {
            setItems((prev) => {
              const saved = prev.filter((i) => i.savedForLater);
              return [...res.items, ...saved];
            });
          }
        }).catch(() => {
          setFeedback({
            type: "error",
            message: "Couldn't save this item to your cart. Please try again.",
          });
        });
      }

      setFeedback({ type: "success", message: `${product.title} added to cart.` });
      if (options?.openDrawer !== false) {
        setIsCartOpen(true);
      }
    },
    [status]
  );

  const removeItem = useCallback(
    (productId: string) => {
      setPendingId(productId);
      setPendingAction("remove");

      // Find cart line item ID if available
      const targetItem = items.find((i) => i.product.id === productId);
      const lineId = (targetItem as CartLineItem)?.id;

      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      setFeedback({ type: "info", message: "Item removed from your cart." });

      if (status === "authenticated") {
        // Treat the server cart as the source of truth: adopt its response, or
        // reload it if the delete failed so the item can't silently return.
        const reconcile = async () => {
          const res = lineId ? await removeServerCartItem(lineId) : null;
          if (res && !res.error) {
            setItems((prev) => [
              ...res.items,
              ...prev.filter((i) => i.savedForLater),
            ]);
            return;
          }
          const server = await fetchServerCart();
          if (!server.error) {
            setItems((prev) => [
              ...server.items,
              ...prev.filter((i) => i.savedForLater),
            ]);
          }
          if (res?.error) {
            setFeedback({
              type: "error",
              message: res.error.message || "Couldn't remove that item. Please try again.",
            });
          }
        };
        reconcile().catch(() => {
          setFeedback({
            type: "error",
            message: "Couldn't remove that item. Please try again.",
          });
        });
      }

      queueMicrotask(() => {
        setPendingId(null);
        setPendingAction(null);
      });
    },
    [items, status]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId);
        return;
      }

      setPendingId(productId);
      setPendingAction("quantity");

      const targetItem = items.find((i) => i.product.id === productId);
      const lineId = (targetItem as CartLineItem)?.id;

      setItems((prev) =>
        prev.map((i) =>
          i.product.id === productId && !i.savedForLater
            ? { ...i, quantity }
            : i
        )
      );

      if (status === "authenticated" && lineId) {
        updateServerCartItem(lineId, { quantity }).catch(() => {});
      }

      queueMicrotask(() => {
        setPendingId(null);
        setPendingAction(null);
      });
    },
    [items, removeItem, status]
  );

  const saveForLater = useCallback(
    (productId: string) => {
      setPendingId(productId);
      setPendingAction("save_for_later");
      setItems((prev) =>
        prev.map((i) =>
          i.product.id === productId ? { ...i, savedForLater: true } : i
        )
      );
      setFeedback({ type: "info", message: "Saved for later." });
      queueMicrotask(() => {
        setPendingId(null);
        setPendingAction(null);
      });
    },
    []
  );

  const moveToCart = useCallback(
    (productId: string) => {
      setPendingId(productId);
      setPendingAction("move_to_cart");
      setItems((prev) =>
        prev.map((i) =>
          i.product.id === productId ? { ...i, savedForLater: false } : i
        )
      );
      queueMicrotask(() => {
        setPendingId(null);
        setPendingAction(null);
      });
    },
    []
  );

  const removeSavedItem = useCallback(
    (productId: string) => {
      setPendingId(productId);
      setPendingAction("remove");
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      queueMicrotask(() => {
        setPendingId(null);
        setPendingAction(null);
      });
    },
    []
  );

  const clearCart = useCallback(() => {
    setItems([]);
    if (status === "authenticated") {
      clearServerCart().catch(() => {});
    }
  }, [status]);

  const validateCart = useCallback(() => {
    const lines = items.filter((i) => !i.savedForLater) as CartLineItem[];
    const results = validateCartItems(lines);
    setItems((prev) =>
      prev.map((i) => {
        const line = i as CartLineItem;
        const res = results.find((r) => r.id === line.id) || {
          id: line.id,
          status: "valid",
        };
        return {
          ...i,
          validationStatus: res.status,
          message:
            res.status === "valid" ? undefined : (res as { message?: string }).message,
        } as CartLineItem;
      })
    );
  }, [items]);

  const activeItems = useMemo(
    () => items.filter((i) => !i.savedForLater),
    [items]
  ) as CartLineItem[];

  const savedItems = useMemo(
    () => items.filter((i) => i.savedForLater),
    [items]
  ) as CartLineItem[];

  const vendorGroups = useMemo<VendorCartGroup[]>(() => {
    const groups = groupItemsByVendor(activeItems);
    return groups.map((g) => ({
      vendorId: g.vendorId,
      vendorName: g.vendorName ?? g.vendorId,
      items: g.items,
      subtotal: g.subtotal,
      deliveryEstimate: g.delivery.estimatedDelivery ?? "1-3 hours",
    }));
  }, [activeItems]);

  const summary = useMemo<CartSummary>(() => {
    const pricing = buildPricingSummary(activeItems);
    return {
      ...pricing,
      campusId: selectedCampus.id,
    };
  }, [activeItems, selectedCampus]);

  return (
    <CartContext.Provider
      value={{
        items,
        savedItems,
        addItem,
        removeItem,
        updateQuantity,
        saveForLater,
        moveToCart,
        removeSavedItem,
        clearCart,
        vendorGroups,
        summary,
        itemCount: summary.itemCount,
        total: summary.itemsSubtotal,
        isCartOpen,
        openCart,
        closeCart,
        setCartOpen,
        isLoading,
        pendingId,
        pendingAction,
        feedback,
        dismissFeedback,
        validateCart,
        mergeGuestWithServer,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
