import { apiClient } from "@/lib/api-client";

export interface FeaturedProduct {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;
}

export interface FeaturedVendor {
  id: string;
  storeName: string;
  slug: string | null;
  logo: string | null;
}

/**
 * Something an admin has featured in a storefront slot: a promo code, a
 * featured product, featured vendors, or a campus campaign. Only a promo
 * code has a code and a discount.
 */
export interface FeaturedPromotion {
  id: string;
  kind: "DISCOUNT" | "FEATURED_PRODUCT" | "FEATURED_VENDOR" | "CAMPUS_CAMPAIGN";
  name: string;
  description: string;
  code: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT" | null;
  discountValue: number | null;
  minimumOrderAmount: number | null;
  expiresAt: string | null;
  products: FeaturedProduct[];
  vendors: FeaturedVendor[];
}

export type FeaturedPlacement = "homepage_banner" | "deals_page" | "category_strip";

export async function fetchFeaturedPromotions(
  placement: FeaturedPlacement,
  campusId?: string,
  categoryId?: string
): Promise<FeaturedPromotion[]> {
  const params = new URLSearchParams({ placement });
  if (campusId) params.set("campusId", campusId);
  if (categoryId) params.set("categoryId", categoryId);
  const { data, error } = await apiClient.get<FeaturedPromotion[]>(
    `/promotions/featured?${params.toString()}`
  );
  if (error) throw new Error(error.message || "Couldn't load promotions.");
  return Array.isArray(data) ? data : [];
}

/** "15% off" / "₦1,500 off", or null for a slot with no discount. */
export function featuredDiscountLabel(
  p: Pick<FeaturedPromotion, "discountType" | "discountValue">
): string | null {
  if (p.discountType === null || p.discountValue === null) return null;
  return p.discountType === "PERCENTAGE"
    ? `${p.discountValue}% off`
    : `₦${p.discountValue.toLocaleString("en-NG")} off`;
}

/** "Spend ₦5,000+" or null when there is no minimum. */
export function featuredMinSpendLabel(
  p: Pick<FeaturedPromotion, "minimumOrderAmount">
): string | null {
  return p.minimumOrderAmount
    ? `Spend ₦${p.minimumOrderAmount.toLocaleString("en-NG")}+`
    : null;
}

export function featuredProductHref(p: Pick<FeaturedProduct, "id">): string {
  return `/marketplace/${p.id}`;
}

/** A vendor without a slug falls back to the marketplace filtered to them. */
export function featuredVendorHref(v: Pick<FeaturedVendor, "id" | "slug">): string {
  return v.slug ? `/store/${v.slug}` : `/marketplace?vendor=${v.id}`;
}

type ViewStorage = Pick<Storage, "getItem" | "setItem">;

const VISITOR_KEY = "kampmax-visitor";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let memoryVisitorId: string | null = null;

/**
 * An anonymous id the browser keeps, so the same visitor is counted once.
 * Without storage it lasts for the page's lifetime.
 */
export function getVisitorId(
  storage: ViewStorage | null,
  makeId: () => string = () => crypto.randomUUID()
): string {
  try {
    const saved = storage?.getItem(VISITOR_KEY);
    if (saved && UUID_RE.test(saved)) return saved;
  } catch {
    // fall through and make a new one
  }
  const id = memoryVisitorId ?? makeId();
  memoryVisitorId = id;
  try {
    storage?.setItem(VISITOR_KEY, id);
  } catch {
    // Storage can throw (private mode); the in-memory id still works.
  }
  return id;
}

/** For tests: forget the in-memory visitor id. */
export function resetVisitorIdForTests(): void {
  memoryVisitorId = null;
}

function localStore(): ViewStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * A slot's view is counted once per browser session, so scrolling back or
 * re-rendering does not inflate it. Returns true (and remembers it) the
 * first time; with no storage available it counts every time.
 */
export function shouldTrackView(storage: ViewStorage | null, id: string): boolean {
  if (!storage) return true;
  const key = `promo-view:${id}`;
  try {
    if (storage.getItem(key)) return false;
    storage.setItem(key, "1");
  } catch {
    // Storage can throw (private mode); count the view rather than lose it.
  }
  return true;
}

/** Fire-and-forget: counting a view or click must never affect the page. */
export async function trackFeaturedEvent(
  id: string,
  type: "view" | "click"
): Promise<void> {
  try {
    await apiClient.post(`/promotions/featured/${id}/events`, {
      type,
      visitorId: getVisitorId(localStore()),
    });
  } catch {
    // ignore
  }
}
