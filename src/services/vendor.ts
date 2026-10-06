import {
  VendorProduct,
  VendorOrder,
  VendorEarningsSummary,
  VendorDailyEarning,
  VendorCustomer,
  StoreProfile,
} from "@/types";
import {
  vendorProducts as mockProducts,
  vendorOrders as mockOrders,
  vendorEarningsSummary,
  vendorDailyEarnings,
  vendorCustomers,
  storeProfile as mockStoreProfile,
} from "@/data/vendor";

let products = [...mockProducts];
let orders = [...mockOrders];
let store = { ...mockStoreProfile };

// ── Products ──

export function getVendorProducts(): VendorProduct[] {
  return products;
}

export function getVendorProductById(id: string): VendorProduct | undefined {
  return products.find((p) => p.id === id);
}

export function addVendorProduct(
  data: Omit<VendorProduct, "id" | "createdAt" | "updatedAt" | "soldCount" | "viewCount" | "saveCount" | "rating" | "ratingCount">
): VendorProduct {
  const now = new Date().toISOString();
  const product: VendorProduct = {
    ...data,
    id: `vp${Date.now()}`,
    soldCount: 0,
    viewCount: 0,
    saveCount: 0,
    rating: 0,
    ratingCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  products = [product, ...products];
  return product;
}

export function updateVendorProduct(
  id: string,
  data: Partial<VendorProduct>
): VendorProduct | undefined {
  products = products.map((p) =>
    p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
  );
  return products.find((p) => p.id === id);
}

export function deleteVendorProduct(id: string): void {
  products = products.filter((p) => p.id !== id);
}

// ── Orders ──

export function getVendorOrders(): VendorOrder[] {
  return orders;
}

export function getVendorOrderById(id: string): VendorOrder | undefined {
  return orders.find((o) => o.id === id);
}

export function updateVendorOrderStatus(
  id: string,
  status: VendorOrder["status"]
): VendorOrder | undefined {
  orders = orders.map((o) => (o.id === id ? { ...o, status } : o));
  return orders.find((o) => o.id === id);
}

// ── Earnings ──

export function getEarningsSummary(): VendorEarningsSummary {
  return vendorEarningsSummary;
}

export function getDailyEarnings(): VendorDailyEarning[] {
  return vendorDailyEarnings;
}

// ── Customers ──

export function getVendorCustomers(): VendorCustomer[] {
  return vendorCustomers;
}

import { apiClient } from "@/lib/api-client";

// ── Store Profile (Live & Fallback) ──

export function getStoreProfile(): StoreProfile {
  return store;
}

export async function getStoreProfileLive(): Promise<StoreProfile> {
  try {
    const { data } = await apiClient.get<any>("/vendors/me");
    if (data && data.id) {
      return {
        vendorId: data.id,
        storeName: data.storeName || store.storeName,
        description: data.description || store.description,
        coverImage: data.banner || store.coverImage,
        logoImage: data.logo || store.logoImage,
        specialties: store.specialties,
        responseTime: store.responseTime,
        operatingHours: store.operatingHours,
        returnPolicy: store.returnPolicy,
        campusId: data.campusId || store.campusId,
        isActive: data.status === "ACTIVE",
        createdAt: data.createdAt || store.createdAt,
      };
    }
  } catch {}
  return getStoreProfile();
}

export async function updateStoreProfileLive(data: Partial<StoreProfile>): Promise<StoreProfile> {
  try {
    const payload: Record<string, unknown> = {};
    if (data.storeName) payload.storeName = data.storeName;
    if (data.description !== undefined) payload.description = data.description;
    if (data.logoImage !== undefined) payload.logo = data.logoImage;
    if (data.coverImage !== undefined) payload.banner = data.coverImage;

    const { data: updated } = await apiClient.patch<any, any>("/vendors/me", payload);
    if (updated) {
      return {
        ...store,
        ...data,
        storeName: updated.storeName || data.storeName || store.storeName,
      };
    }
  } catch {}
  return updateStoreProfile(data);
}

export function updateStoreProfile(data: Partial<StoreProfile>): StoreProfile {
  store = { ...store, ...data };
  return store;
}

