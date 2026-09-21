"use client";

import { useState, useCallback, useEffect } from "react";
import { getProducts, getProductById } from "@/services/products";
import { apiClient, ApiError } from "@/lib/api-client";
import type { Product } from "@/types";

// ============================================================
// BACKEND RESPONSE & DTO TYPES (from NestJS Wishlist Module)
// ============================================================

export type WishlistTargetType =
  | "PRODUCT"
  | "SERVICE_PROVIDER_SERVICE"
  | "FREELANCER_SERVICE"
  | "SERVICE_PROVIDER"
  | "FREELANCER_PROFILE";

export interface BackendWishlistItemResponse {
  id: string;
  targetType: WishlistTargetType;
  targetId: string;
  createdAt: string | Date;
}

export interface BackendWishlistListResponse {
  total: number;
  items: BackendWishlistItemResponse[];
}

export interface CreateWishlistItemPayload {
  targetType: WishlistTargetType;
  targetId: string;
}

// In-memory cache for synchronous fallback access
let wishlist: string[] = ["p1", "p3", "p5", "p8", "p12", "p17"];
// Map of targetId -> backend wishlistItemId
const wishlistItemIdMap = new Map<string, string>();

// ============================================================
// ASYNC API CLIENT METHODS
// ============================================================

/**
 * Fetch wishlist items from backend API.
 * GET /api/v1/wishlist
 */
export async function fetchWishlist(): Promise<{
  items: BackendWishlistItemResponse[];
  total: number;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.get<BackendWishlistListResponse>("/wishlist");

  if (error || !data || !Array.isArray(data.items)) {
    return {
      items: wishlist.map((id) => ({
        id: `local_${id}`,
        targetType: "PRODUCT",
        targetId: id,
        createdAt: new Date().toISOString(),
      })),
      total: wishlist.length,
      error,
    };
  }

  // Update in-memory cache
  wishlist = data.items.map((i) => i.targetId);
  wishlistItemIdMap.clear();
  data.items.forEach((i) => {
    wishlistItemIdMap.set(i.targetId, i.id);
  });

  return {
    items: data.items,
    total: data.total,
    error: null,
  };
}

/**
 * Add an item to user wishlist.
 * POST /api/v1/wishlist
 */
export async function addToWishlistApi(
  targetId: string,
  targetType: WishlistTargetType = "PRODUCT"
): Promise<{ item: BackendWishlistItemResponse | null; error: ApiError | null }> {
  // Optimistic local update
  if (!wishlist.includes(targetId)) {
    wishlist = [...wishlist, targetId];
  }

  const { data, error } = await apiClient.post<
    CreateWishlistItemPayload,
    BackendWishlistItemResponse
  >("/wishlist", {
    targetType,
    targetId,
  });

  if (error || !data || !data.id) {
    return { item: null, error };
  }

  wishlistItemIdMap.set(targetId, data.id);
  return { item: data, error: null };
}

/**
 * Remove an item from user wishlist.
 * DELETE /api/v1/wishlist/:id
 */
export async function removeFromWishlistApi(
  targetId: string
): Promise<{ success: boolean; error: ApiError | null }> {
  // Optimistic local update
  wishlist = wishlist.filter((id) => id !== targetId);

  const backendItemId = wishlistItemIdMap.get(targetId) || targetId;
  const { error } = await apiClient.delete<void>(`/wishlist/${backendItemId}`);

  if (error) {
    return { success: false, error };
  }

  wishlistItemIdMap.delete(targetId);
  return { success: true, error: null };
}

/**
 * Clear entire user wishlist.
 * DELETE /api/v1/wishlist
 */
export async function clearWishlistApi(): Promise<{ success: boolean; error: ApiError | null }> {
  wishlist = [];
  wishlistItemIdMap.clear();

  const { error } = await apiClient.delete<void>("/wishlist");

  if (error) {
    return { success: false, error };
  }

  return { success: true, error: null };
}

// ============================================================
// SYNCHRONOUS FALLBACK HELPERS
// ============================================================

export function getWishlist(userId?: string): Product[] {
  void userId;
  const byId = getProducts().reduce<Record<string, Product>>(
    (acc, p) => ((acc[p.id] = p), acc),
    {}
  );
  return wishlist
    .map((id) => byId[id] || getProductById(id))
    .filter((p): p is Product => Boolean(p));
}

export function getWishlistIds(userId?: string): string[] {
  void userId;
  return [...wishlist];
}

export function getWishlistCount(userId?: string): number {
  void userId;
  return wishlist.length;
}

export function isWishlisted(productId: string): boolean {
  return wishlist.includes(productId);
}

export function addToWishlist(productId: string): void {
  if (!wishlist.includes(productId)) wishlist = [...wishlist, productId];
  addToWishlistApi(productId).catch(() => {});
}

export function removeFromWishlist(productId: string): void {
  wishlist = wishlist.filter((id) => id !== productId);
  removeFromWishlistApi(productId).catch(() => {});
}

export function toggleWishlist(productId: string): boolean {
  if (wishlist.includes(productId)) {
    removeFromWishlist(productId);
    return false;
  }
  addToWishlist(productId);
  return true;
}

/**
 * Client-side wishlist hook with backend synchronization.
 */
export function useWishlist(userId?: string) {
  const [items, setItems] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    fetchWishlist().then((res) => {
      const byId = getProducts().reduce<Record<string, Product>>(
        (acc, p) => ((acc[p.id] = p), acc),
        {}
      );
      const productItems = res.items
        .map((i) => byId[i.targetId] || getProductById(i.targetId))
        .filter((p): p is Product => Boolean(p));

      setItems(productItems);
      setLoaded(true);
    }).catch(() => {
      setItems(getWishlist(userId));
      setLoaded(true);
    });
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const remove = useCallback(
    (productId: string) => {
      removeFromWishlist(productId);
      setItems((prev) => prev.filter((p) => p.id !== productId));
    },
    []
  );

  const add = useCallback(
    (productId: string) => {
      addToWishlist(productId);
      const p = getProductById(productId);
      if (p) setItems((prev) => (prev.some((x) => x.id === productId) ? prev : [...prev, p]));
    },
    []
  );

  const toggle = useCallback(
    (productId: string) => {
      const isCurrently = isWishlisted(productId);
      if (isCurrently) {
        remove(productId);
      } else {
        add(productId);
      }
    },
    [add, remove]
  );

  return {
    items,
    count: items.length,
    loaded,
    remove,
    add,
    toggle,
    reload,
  };
}
