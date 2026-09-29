import { apiClient, type ApiError } from "@/lib/api-client";
import { fetchProducts, updateProduct } from "@/services/products";
import type {
  ActionRequiredItem,
  DashboardMetric,
  DashboardOverview,
  StoreHealth,
  VendorRecentOrder,
} from "@/types/vendor-dashboard";
import type { Product } from "@/types";

// ============================================================
// VENDOR DASHBOARD — LIVE API LAYER
// ============================================================
// Every fetcher here hits the real backend and throws on failure so
// TanStack Query can surface loading / error / retry states. Vendor identity
// is always derived server-side from the JWT — never sent by the client.
//
//   GET /vendors/me                     → store profile
//   GET /analytics/vendor               → totals
//   GET /analytics/vendor/orders/status → order status breakdown
//   GET /orders/vendor                  → orders received by this vendor

export interface VendorProfile {
  id: string;
  storeName: string;
  slug: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  phone: string | null;
  businessAddress: string | null;
  verificationStatus:
    | "PENDING"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "VERIFIED"
    | "REJECTED"
    | "SUSPENDED";
  rating: number;
  totalSales: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface VendorAnalyticsOverview {
  vendor: { id: string; storeName: string; rating: number; totalSales: number };
  overview: {
    totalOrders: number;
    completedOrders: number;
    totalProducts: number;
    activeProducts: number;
  };
}

export interface StatusCount {
  status: string;
  count: number;
}

interface BackendVendorOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  totalAmount: number | string;
  createdAt: string;
}

interface Paginated<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

async function unwrap<T>(
  request: Promise<{ data: T; error: ApiError | null }>
): Promise<T> {
  const { data, error } = await request;
  if (error || data == null) {
    throw error ?? new Error("Empty response from server");
  }
  return data;
}

// ── Fetchers ─────────────────────────────────────────────────

export function fetchVendorProfile(): Promise<VendorProfile> {
  return unwrap(apiClient.get<VendorProfile>("/vendors/me"));
}

export function fetchVendorAnalytics(): Promise<VendorAnalyticsOverview> {
  return unwrap(apiClient.get<VendorAnalyticsOverview>("/analytics/vendor"));
}

export function fetchVendorOrderStatusCounts(): Promise<StatusCount[]> {
  return unwrap(apiClient.get<StatusCount[]>("/analytics/vendor/orders/status"));
}

export function fetchVendorSalesAnalytics(period?: string): Promise<any> {
  return unwrap(apiClient.get<any>(`/analytics/vendor/sales${period ? `?period=${period}` : ""}`));
}

export function fetchVendorEarningsAnalytics(): Promise<any> {
  return unwrap(apiClient.get<any>("/analytics/vendor/earnings"));
}

export function fetchVendorProductsAnalytics(): Promise<any> {
  return unwrap(apiClient.get<any>("/analytics/vendor/products"));
}

export function fetchVendorCampusOrdersAnalytics(): Promise<any> {
  return unwrap(apiClient.get<any>("/analytics/vendor/orders/by-campus"));
}

export async function fetchVendorRecentOrders(limit = 5): Promise<VendorRecentOrder[]> {
  const page = await unwrap(
    apiClient.get<Paginated<BackendVendorOrder>>(`/orders/vendor?limit=${limit}`)
  );
  return page.items.map((o) => ({
    id: o.orderNumber,
    customerName: o.customerName,
    createdAt: o.createdAt,
    amount: Number(o.totalAmount),
    status: mapOrderStatus(o.status),
    href: `/vendor/orders/${o.id}`,
  }));
}

/** Active products at or below the low-stock threshold in the owner's store. */
export async function fetchLowStockProducts(
  vendorId: string,
  threshold = 5
): Promise<Product[]> {
  const res = await fetchProducts({ vendorId, status: "ACTIVE", limit: 50 });
  if (res.error) throw res.error;
  return res.data.filter((p) => (p.stock ?? 0) <= threshold).slice(0, 5);
}

export async function restockProduct(product: Product, quantity: number): Promise<void> {
  const res = await updateProduct(product.id, {
    stockQuantity: (product.stock ?? 0) + quantity,
  });
  if (res.error) throw res.error;
}

// ── Derivations (pure — computed from real data) ─────────────

const ORDER_STATUS_MAP: Record<string, VendorRecentOrder["status"]> = {
  PENDING: "pending",
  CONFIRMED: "paid",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
};

export function mapOrderStatus(status: string): VendorRecentOrder["status"] {
  return ORDER_STATUS_MAP[status] ?? "pending";
}

function pendingCount(statusCounts: StatusCount[]): number {
  return statusCounts.find((s) => s.status === "PENDING")?.count ?? 0;
}

export function buildDashboardOverview(
  analytics: VendorAnalyticsOverview,
  statusCounts: StatusCount[]
): DashboardOverview {
  const { overview, vendor } = analytics;
  const pending = pendingCount(statusCounts);

  const metrics: DashboardMetric[] = [
    {
      key: "orders",
      label: "Total orders",
      valueLabel: String(overview.totalOrders),
      sublabel: `${overview.completedOrders} completed`,
      tone: "neutral",
    },
    {
      key: "pending",
      label: "Pending orders",
      valueLabel: String(pending),
      sublabel: pending > 0 ? "Awaiting your action" : "Nothing waiting",
      tone: pending > 0 ? "negative" : "positive",
    },
    {
      key: "products",
      label: "Active products",
      valueLabel: String(overview.activeProducts),
      sublabel: `${overview.totalProducts} total listings`,
      tone: "neutral",
    },
    {
      key: "rating",
      label: "Store rating",
      valueLabel: vendor.rating > 0 ? vendor.rating.toFixed(1) : "—",
      sublabel: `${vendor.totalSales} sales`,
      tone: "neutral",
    },
  ];

  return { summary: `Here's how ${vendor.storeName} is doing.`, metrics };
}

export function buildStoreHealth(profile: VendorProfile, activeProducts: number): StoreHealth {
  const items = [
    {
      id: "branding",
      label: "Logo and banner",
      complete: Boolean(profile.logo && profile.banner),
      detail: "Stores with branding earn more trust from buyers.",
    },
    {
      id: "description",
      label: "Store description",
      complete: Boolean(profile.description?.trim()),
      detail: "Tell shoppers what you sell.",
    },
    {
      id: "contact",
      label: "Contact details",
      complete: Boolean(profile.phone && profile.businessAddress),
      detail: "Add a phone number and business address.",
    },
    {
      id: "products",
      label: "At least one active product",
      complete: activeProducts > 0,
      detail: "Publish a product so buyers can find you.",
    },
    {
      id: "verification",
      label: "Identity verified",
      complete: profile.verificationStatus === "VERIFIED",
      detail: "Complete verification to unlock the verified badge.",
    },
  ];
  const done = items.filter((i) => i.complete).length;
  return { score: Math.round((done / items.length) * 100), items };
}

export function buildActionRequired(
  profile: VendorProfile,
  statusCounts: StatusCount[],
  lowStockCount: number
): ActionRequiredItem[] {
  const actions: ActionRequiredItem[] = [];
  const pending = pendingCount(statusCounts);

  if (pending > 0) {
    actions.push({
      id: "pending-orders",
      title: `${pending} order${pending === 1 ? "" : "s"} awaiting confirmation`,
      description: "Confirm new orders so buyers know you're on it.",
      actionLabel: "Review orders",
      href: "/vendor/orders",
      priority: "high",
    });
  }
  if (lowStockCount > 0) {
    actions.push({
      id: "low-stock",
      title: `${lowStockCount} product${lowStockCount === 1 ? "" : "s"} low or out of stock`,
      description: "Restock to keep your listings purchasable.",
      actionLabel: "Manage inventory",
      href: "/vendor/products?stockStatus=low_stock",
      priority: "medium",
    });
  }
  if (profile.verificationStatus === "REJECTED") {
    actions.push({
      id: "verification-rejected",
      title: "Verification was rejected",
      description: "Review the feedback and resubmit your documents.",
      actionLabel: "Open verification",
      href: "/vendor/verification",
      priority: "high",
    });
  } else if (profile.verificationStatus === "PENDING") {
    actions.push({
      id: "verification-start",
      title: "Verify your store",
      description: "Verified stores get a badge and higher buyer trust.",
      actionLabel: "Start verification",
      href: "/vendor/verification",
      priority: "low",
    });
  }
  return actions;
}
