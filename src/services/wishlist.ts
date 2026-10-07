"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { getFriendlyErrorMessage } from "@/lib/error-messages";

// ============================================================
// WISHLIST (live)
// ============================================================
//
//   GET    /wishlist          → { total, items[] }  (products come with their details)
//   POST   /wishlist          → { targetType, targetId }
//   DELETE /wishlist/:id      → remove one
//   DELETE /wishlist          → clear
//
// The list lives on the server, so it follows the person to any device. Nothing
// is invented locally: a heart only stays filled if the server kept it.

export type WishlistTargetType =
  | "PRODUCT"
  | "SERVICE_PROVIDER_SERVICE"
  | "FREELANCER_SERVICE"
  | "SERVICE_PROVIDER"
  | "FREELANCER_PROFILE";

export interface WishlistProduct {
  id: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  condition: string;
  stockQuantity: number;
  vendorId: string;
  status: string;
  /** Can be bought right now. */
  available: boolean;
}

export interface WishlistEntry {
  id: string;
  targetType: WishlistTargetType;
  targetId: string;
  createdAt: string;
  /** Present for products; null when the product no longer exists. */
  product: WishlistProduct | null;
}

interface WishlistData {
  total: number;
  items: WishlistEntry[];
}

// ── API calls ───────────────────────────────────────────────

/** The signed-in person's wishlist. On failure, `error` is set and nothing is made up. */
export async function fetchWishlist(): Promise<{ items: WishlistEntry[]; total: number; error: ApiError | null }> {
  const { data, error } = await apiClient.get<WishlistData>("/wishlist");
  if (error || !data || !Array.isArray(data.items)) {
    return { items: [], total: 0, error: error ?? ({ name: "ApiError", message: "Unexpected response" } as ApiError) };
  }
  return { items: data.items, total: data.total, error: null };
}

export async function addToWishlistApi(
  targetId: string,
  targetType: WishlistTargetType = "PRODUCT"
): Promise<{ item: WishlistEntry | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<{ targetType: WishlistTargetType; targetId: string }, WishlistEntry>(
    "/wishlist",
    { targetType, targetId }
  );
  if (error || !data?.id) return { item: null, error };
  return { item: data, error: null };
}

export async function removeFromWishlistApi(itemId: string): Promise<{ success: boolean; error: ApiError | null }> {
  const { error } = await apiClient.delete<void>(`/wishlist/${encodeURIComponent(itemId)}`);
  return error ? { success: false, error } : { success: true, error: null };
}

export async function clearWishlistApi(): Promise<{ success: boolean; error: ApiError | null }> {
  const { error } = await apiClient.delete<void>("/wishlist");
  return error ? { success: false, error } : { success: true, error: null };
}

// ── Shared state ────────────────────────────────────────────

export const wishlistKey = (userId: string | null | undefined) => ["wishlist", userId ?? "guest"] as const;

export interface WishlistToggleResult {
  ok: boolean;
  /** The product is now saved (true) or no longer saved (false); only meaningful when ok. */
  saved?: boolean;
  /** Nobody is signed in: the caller should send them to sign in. */
  needsLogin?: boolean;
  error?: string;
}

/**
 * The signed-in person's wishlist, shared by every heart button and the wishlist
 * page. Changes show instantly and are undone if the server says no.
 */
export function useWishlist() {
  const { user, status } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const signedIn = status === "authenticated" && !!userId;
  const key = wishlistKey(userId);

  const query = useQuery({
    queryKey: key,
    enabled: signedIn,
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<WishlistData> => {
      const res = await fetchWishlist();
      if (res.error) throw res.error;
      return { items: res.items, total: res.total };
    },
  });

  const items = query.data?.items ?? [];

  const has = useCallback(
    (productId: string) => items.some((i) => i.targetType === "PRODUCT" && i.targetId === productId),
    [items]
  );

  const setItems = useCallback(
    (next: (current: WishlistEntry[]) => WishlistEntry[]) =>
      queryClient.setQueryData<WishlistData>(key, (current) => {
        const list = next(current?.items ?? []);
        return { items: list, total: list.length };
      }),
    [queryClient, key]
  );

  const reload = useCallback(() => queryClient.invalidateQueries({ queryKey: key }), [queryClient, key]);

  const remove = useCallback(
    async (productId: string): Promise<WishlistToggleResult> => {
      if (!signedIn) return { ok: false, needsLogin: true };
      const current = queryClient.getQueryData<WishlistData>(key)?.items ?? [];
      const entry = current.find((i) => i.targetType === "PRODUCT" && i.targetId === productId);
      if (!entry) return { ok: true, saved: false };
      setItems((list) => list.filter((i) => i.id !== entry.id));
      const res = await removeFromWishlistApi(entry.id);
      // Already gone on the server is the outcome the person wanted.
      if (res.error && res.error.status !== 404) {
        setItems(() => current);
        return { ok: false, error: getFriendlyErrorMessage(res.error) };
      }
      return { ok: true, saved: false };
    },
    [signedIn, queryClient, key, setItems]
  );

  const add = useCallback(
    async (productId: string): Promise<WishlistToggleResult> => {
      if (!signedIn) return { ok: false, needsLogin: true };
      const current = queryClient.getQueryData<WishlistData>(key)?.items ?? [];
      const pending: WishlistEntry = {
        id: `pending:${productId}`,
        targetType: "PRODUCT",
        targetId: productId,
        createdAt: new Date().toISOString(),
        product: null,
      };
      setItems((list) => [pending, ...list]);
      const res = await addToWishlistApi(productId);
      if (res.error?.status === 409) {
        // Saved already (another tab or device): take the server's list.
        void reload();
        return { ok: true, saved: true };
      }
      if (res.error || !res.item) {
        setItems(() => current);
        return { ok: false, error: getFriendlyErrorMessage(res.error) };
      }
      const saved = res.item;
      setItems((list) => list.map((i) => (i.id === pending.id ? saved : i)));
      return { ok: true, saved: true };
    },
    [signedIn, queryClient, key, setItems, reload]
  );

  const toggle = useCallback(
    (productId: string): Promise<WishlistToggleResult> => (has(productId) ? remove(productId) : add(productId)),
    [has, add, remove]
  );

  return {
    items,
    total: query.data?.total ?? 0,
    signedIn,
    /** Waiting for the first answer from the server. */
    loading: signedIn && query.isPending,
    error: query.isError ? getFriendlyErrorMessage(query.error) : null,
    has,
    toggle,
    add,
    remove,
    reload,
  };
}
