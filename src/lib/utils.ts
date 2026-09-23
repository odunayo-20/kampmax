import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { OrderStatus, Product, ProductCondition } from "@/types";

// ============================================================
// CLASS NAMES
// ============================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// SECTION SHELLS
// ============================================================

/** Dashboard sub-paths (not the public /service-provider/[slug] profile). */
const SERVICE_PROVIDER_DASHBOARD_SECTIONS = [
  "/service-provider",
  "/service-provider/profile",
  "/service-provider/verification",
  "/service-provider/services",
  "/service-provider/availability",
  "/service-provider/portfolio",
  "/service-provider/reviews",
  "/service-provider/bookings",
  "/service-provider/analytics",
  "/service-provider/financials",
  "/service-provider/settings",
];

/** True when the pathname belongs to the full-screen Service Provider dashboard shell. */
export function isServiceProviderDashboardPath(pathname: string): boolean {
  if (pathname === SERVICE_PROVIDER_DASHBOARD_SECTIONS[0]) return true;
  return SERVICE_PROVIDER_DASHBOARD_SECTIONS.some((section) =>
    pathname.startsWith(`${section}/`)
  );
}

// ============================================================
// SITE URL HELPERS
// ============================================================

/** Canonical site origin used for SEO metadata and shareable links. */
export function getSiteBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://kampmax.example.com";
}

// ============================================================
// NIGERIAN NAIRA FORMATTING
// ============================================================

export function formatNaira(amount: number): string {
  return `\u20A6${amount.toLocaleString("en-NG")}`;
}

export function formatNairaCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `\u20A6${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `\u20A6${(amount / 1_000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  }
  return formatNaira(amount);
}

// ============================================================
// DATE & TIME
// ============================================================

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================
// RELATIVE TIME
// ============================================================

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return formatDate(d);
}

// ============================================================
// PRODUCT AVAILABILITY
// ============================================================

export function isProductAvailable(product: Product): boolean {
  return product.status === "available";
}

export function isProductInStock(product: Product): boolean {
  return product.status === "available";
}

export function getProductStatusLabel(status: Product["status"]): string {
  const labels: Record<Product["status"], string> = {
    available: "In Stock",
    sold: "Sold Out",
    removed: "Unavailable",
  };
  return labels[status];
}

// ============================================================
// DISCOUNT CALCULATIONS
// ============================================================

export function calculateDiscountPercentage(
  originalPrice: number,
  currentPrice: number
): number {
  if (originalPrice <= currentPrice || originalPrice <= 0) return 0;
  return Math.round(
    ((originalPrice - currentPrice) / originalPrice) * 100
  );
}

export function hasDiscount(product: Product): boolean {
  return (
    product.originalPrice !== undefined &&
    product.originalPrice > product.price
  );
}

export function getSavingsAmount(product: Product): number {
  if (!product.originalPrice) return 0;
  return Math.max(0, product.originalPrice - product.price);
}

// ============================================================
// ORDER STATUS
// ============================================================

export const ORDER_STATUS_STEPS: OrderStatus[] = [
  "placed",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];

export function getOrderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    placed: "Order Placed",
    confirmed: "Confirmed",
    preparing: "Preparing",
    ready: "Ready for Pickup",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return labels[status];
}

export function getOrderStatusIndex(status: OrderStatus): number {
  return ORDER_STATUS_STEPS.indexOf(status);
}

export function isOrderComplete(status: OrderStatus): boolean {
  return status === "delivered";
}

export function isOrderCancelled(status: OrderStatus): boolean {
  return status === "cancelled";
}

export function getOrderProgress(status: OrderStatus): number {
  if (status === "cancelled") return 0;
  const idx = ORDER_STATUS_STEPS.indexOf(status);
  if (idx === -1) return 0;
  return Math.round((idx / (ORDER_STATUS_STEPS.length - 1)) * 100);
}

// ============================================================
// RATINGS
// ============================================================

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function getRatingLabel(rating: number): string {
  if (rating >= 4.5) return "Excellent";
  if (rating >= 4.0) return "Very Good";
  if (rating >= 3.5) return "Good";
  if (rating >= 3.0) return "Average";
  if (rating >= 2.0) return "Below Average";
  return "Poor";
}

export function getRatingColor(rating: number): string {
  if (rating >= 4.0) return "text-kampmax-success";
  if (rating >= 3.0) return "text-kampmax-warning";
  return "text-kampmax-error";
}

export function getStarArray(rating: number): ("full" | "half" | "empty")[] {
  const stars: ("full" | "half" | "empty")[] = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push("full");
    } else if (i === fullStars && hasHalf) {
      stars.push("half");
    } else {
      stars.push("empty");
    }
  }
  return stars;
}

// ============================================================
// FORMATTING HELPERS
// ============================================================

export function generateOrderId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `KMP-${num}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural || singular + "s"}`;
}

// ============================================================
// DELIVERY HELPERS
// ============================================================

export const DELIVERY_METHOD_LABELS: Record<string, string> = {
  campus_pickup: "Campus Pickup",
  meetup: "Campus Meetup",
  delivery: "Hostel Delivery",
};

export const DELIVERY_FEE: Record<string, number> = {
  campus_pickup: 0,
  meetup: 0,
  delivery: 500,
};

export function getDeliveryFee(method: string): number {
  return DELIVERY_FEE[method] ?? 0;
}

export function getDeliveryLabel(method: string): string {
  return DELIVERY_METHOD_LABELS[method] ?? method;
}

// ============================================================
// PAYMENT HELPERS
// ============================================================

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  paystack: "Paystack",
  bank_transfer: "Bank Transfer",
  wallet: "Kampmax Wallet",
  cod: "Cash on Pickup",
};

export function getPaymentLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

// ============================================================
// VALIDATION HELPERS
// ============================================================

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^\+?[\d\s-]{10,15}$/.test(phone);
}

export function isValidNigerianPhone(phone: string): boolean {
  return /^(\+234|0)[789][01]\d{8}$/.test(phone.replace(/\s/g, ""));
}
