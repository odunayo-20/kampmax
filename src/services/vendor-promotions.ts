import { apiClient } from "@/lib/api-client";
import { getCurrentUser, getVendorByUserId } from "@/services/users";
import { getVendorAccess, getVendorPermissions } from "@/services/vendor-dashboard";
import { VENDOR_DASHBOARD_GATE } from "@/types/vendor-dashboard";
import { getProducts } from "@/services/products";
import { getCategories } from "@/services/categories";
import { promotionsStore, redemptionsStore } from "@/data/vendor-promotions";
import type { Product } from "@/types";
import type {
  VendorPromotion,
  VendorPromotionInput,
  VendorPromotionQuery,
  VendorPromotionPage,
  VendorPromotionCounts,
  VendorPromotionResult,
  VendorPromotionResultCode,
  VendorPromotionStatus,
  VendorPromotionRedemption,
  VendorRedemptionResult,
  VendorPromotionPermissionKey,
  VendorPromotionPermissions,
} from "@/types/vendor-promotions";
import {
  VENDOR_PROMOTION_STATUS,
  VENDOR_PROMOTION_LIMITS,
  VENDOR_PROMOTION_SORT,
} from "@/types/vendor-promotions";

// ============================================================
// VENDOR PROMOTIONS SERVICE LAYER  (Module 13)
// ============================================================
//
// Maps 1:1 to a future backend API:
//   GET    /vendor/promotions               → list (search / filter / page)
//   GET    /vendor/promotions/counts        → status counts
//   GET    /vendor/promotions/{id}          → owner-scoped detail
//   POST   /vendor/promotions               → create (draft)
//   PATCH  /vendor/promotions/{id}          → edit (draft / scheduled only)
//   POST   /vendor/promotions/{id}/activate → validates + activates / schedules
//   POST   /vendor/promotions/{id}/pause
//   POST   /vendor/promotions/{id}/resume
//   POST   /vendor/promotions/{id}/cancel
//   POST   /vendor/promotions/{id}/duplicate
//   GET    /vendor/promotions/{id}/redemptions
//   POST   /vendor/promotions/{id}/redeem    → backend-computed discount
//
// The backend decides status, stacking, eligibility and discount math. The
// frontend never computes a final discount. Status derives from platform time
// (write-through); cancelled/expired are terminal; records are never deleted.

// ── Ownership / access ───────────────────────────────────────

function ownerVendorId(): string | null {
  const user = getCurrentUser();
  const vendor = getVendorByUserId(user.id);
  const access = getVendorAccess();
  if (!vendor || !access.canUseDashboard || access.kind !== VENDOR_DASHBOARD_GATE.APPROVED) {
    return null;
  }
  return vendor.id;
}

export function getVendorPromotionPermissions(): VendorPromotionPermissions {
  const base = getVendorPermissions();
  return {
    "promotions.view": base.canManagePromotions,
    "promotions.create": base.canManagePromotions,
    "promotions.manage": base.canManagePromotions,
    "promotions.archive": base.canManagePromotions,
  } satisfies Record<VendorPromotionPermissionKey, boolean>;
}

function ownedPromotions(): VendorPromotion[] {
  const vendorId = ownerVendorId();
  if (!vendorId) return [];
  return promotionsStore.items.filter((p) => p.vendorId === vendorId);
}

// ── Platform clock / status (backend-authoritative) ─────────

function nowIso(): string {
  return new Date().toISOString();
}

function platformNow(): Date {
  return new Date();
}

function effectiveStatus(p: VendorPromotion, now = platformNow()): VendorPromotionStatus {
  if (p.status === VENDOR_PROMOTION_STATUS.CANCELLED) return VENDOR_PROMOTION_STATUS.CANCELLED;
  const ends = new Date(p.endsAt).getTime();
  if (now.getTime() > ends) return VENDOR_PROMOTION_STATUS.EXPIRED;
  if (p.status === VENDOR_PROMOTION_STATUS.PAUSED) return VENDOR_PROMOTION_STATUS.PAUSED;
  if (p.status === VENDOR_PROMOTION_STATUS.DRAFT) return VENDOR_PROMOTION_STATUS.DRAFT;
  const starts = new Date(p.startsAt).getTime();
  if (now.getTime() < starts) return VENDOR_PROMOTION_STATUS.SCHEDULED;
  return VENDOR_PROMOTION_STATUS.ACTIVE;
}

/** Write-through: persist auto status moves (e.g. active → expired) on reads. */
function refreshStatuses(items: VendorPromotion[]): void {
  const now = platformNow();
  for (const p of items) {
    const next = effectiveStatus(p, now);
    if (next !== p.status) {
      p.status = next;
      if (next === VENDOR_PROMOTION_STATUS.EXPIRED) p.updatedAt = nowIso();
    }
  }
}

// ── Validation (backend rules) ───────────────────────────────

function validIso(s: string): boolean {
  return !Number.isNaN(new Date(s).getTime());
}

function validateBasic(input: VendorPromotionInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = input.title?.trim() ?? "";
  if (!title) errors.title = "Title is required";
  else if (title.length > 80) errors.title = "Title cannot exceed 80 characters";

  if (input.discountType !== "percentage" && input.discountType !== "fixed_amount") {
    errors.discountType = "Select a discount type";
  }
  if (typeof input.discountValue !== "number" || !Number.isFinite(input.discountValue)) {
    errors.discountValue = "Enter a discount value";
  } else if (input.discountType === "percentage") {
    if (input.discountValue < VENDOR_PROMOTION_LIMITS.MIN_PERCENT || input.discountValue > VENDOR_PROMOTION_LIMITS.MAX_PERCENT) {
      errors.discountValue = `Percentage must be between ${VENDOR_PROMOTION_LIMITS.MIN_PERCENT} and ${VENDOR_PROMOTION_LIMITS.MAX_PERCENT}`;
    }
  } else if (input.discountValue <= 0) {
    errors.discountValue = "Amount must be greater than 0";
  }

  if (input.maxDiscountAmount != null && (!Number.isFinite(input.maxDiscountAmount) || input.maxDiscountAmount <= 0)) {
    errors.maxDiscountAmount = "Max discount must be greater than 0";
  }

  const scopes = ["all_products", "products", "category", "minimum_order"];
  if (!scopes.includes(input.scope)) errors.scope = "Select a scope";

  if (!input.startsAt || !validIso(input.startsAt)) errors.startsAt = "Start date is required";
  if (!input.endsAt || !validIso(input.endsAt)) errors.endsAt = "End date is required";
  else if (validIso(input.startsAt) && new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
    errors.endsAt = "End date must be after start date";
  }

  const eligibilities = ["all_customers", "new_customers", "returning_customers"];
  if (!eligibilities.includes(input.eligibility)) errors.eligibility = "Select an eligibility rule";

  if (input.minOrderAmount != null && input.minOrderAmount < 0) errors.minOrderAmount = "Minimum order cannot be negative";
  if (input.usageLimit != null && (!Number.isInteger(input.usageLimit) || input.usageLimit < 1)) {
    errors.usageLimit = "Usage limit must be a positive whole number";
  }
  if (input.perCustomerLimit != null && (!Number.isInteger(input.perCustomerLimit) || input.perCustomerLimit < 1)) {
    errors.perCustomerLimit = "Per-customer limit must be a positive whole number";
  }
  if (
    input.perCustomerLimit != null &&
    input.usageLimit != null &&
    input.perCustomerLimit > input.usageLimit
  ) {
    errors.perCustomerLimit = "Per-customer limit cannot exceed the usage limit";
  }
  return errors;
}

function validateScopeComplete(input: VendorPromotionInput, vendorId: string): Record<string, string> {
  const errors = validateBasic(input);
  if (Object.keys(errors).length > 0) return errors;

  if (input.scope === "products") {
    if (!input.productIds.length) {
      errors.products = "Select at least one product";
    } else {
      const owned = new Set(getProducts().filter((p) => p.vendorId === vendorId).map((p) => p.id));
      const bad = input.productIds.find((pid) => !owned.has(pid));
      if (bad) errors.products = "One or more products do not belong to this store";
    }
  } else if (input.scope === "category") {
    if (!input.categoryId) errors.categoryId = "Select a category";
    else if (!getCategories().some((c) => c.id === input.categoryId)) errors.categoryId = "Category not found";
  } else if (input.productIds.length > 0) {
    errors.products = "Product selection only applies to the 'Selected products' scope";
  }
  return errors;
}

// ── Result helpers ───────────────────────────────────────────

function fail(code: VendorPromotionResultCode, error: string): VendorPromotionResult {
  return { ok: false, code, error };
}

function okPromotion(promotion: VendorPromotion): VendorPromotionResult {
  return { ok: true, code: "ok", promotion };
}

function locateOwned(id: string): VendorPromotion | null {
  const vendorId = ownerVendorId();
  if (!vendorId) return null;
  const promotion = promotionsStore.items.find((p) => p.id === id);
  if (!promotion || promotion.vendorId !== vendorId) return null;
  return promotion;
}

function generateId(): string {
  let max = 1000;
  for (const p of promotionsStore.items) {
    const m = /^PRM-(\d+)$/.exec(p.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `PRM-${max + 1}`;
}

function toInput(p: VendorPromotion): VendorPromotionInput {
  return {
    title: p.title,
    description: p.description,
    discountType: p.discountType,
    discountValue: p.discountValue,
    maxDiscountAmount: p.maxDiscountAmount ?? null,
    scope: p.scope,
    productIds: p.productIds,
    categoryId: p.categoryId ?? null,
    minOrderAmount: p.minOrderAmount ?? null,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
    eligibility: p.eligibility,
    usageLimit: p.usageLimit ?? null,
    perCustomerLimit: p.perCustomerLimit ?? null,
    stackable: p.stackable,
  };
}

// ── List / counts ────────────────────────────────────────────

export function listVendorPromotions(query: VendorPromotionQuery = {}): VendorPromotionPage<VendorPromotion> {
  const { search = "", status = "all", sort = VENDOR_PROMOTION_SORT.NEWEST, page = 1, pageSize = 12 } = query;
  const normPage = Math.max(1, Math.floor(page));
  const normSize = Math.max(1, Math.floor(pageSize));

  const items = ownedPromotions();
  refreshStatuses(items);

  const order = ["active", "scheduled", "draft", "paused", "expired", "cancelled"];
  let filtered = items;
  if (status !== "all") filtered = filtered.filter((p) => p.status === status);

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((p) =>
      [p.id, p.title, p.description ?? ""].join(" ").toLowerCase().includes(q)
    );
  }

  const byStatus = (a: VendorPromotion, b: VendorPromotion): number => order.indexOf(a.status) - order.indexOf(b.status);
  const byCreatedDesc = (a: VendorPromotion, b: VendorPromotion): number => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  if (sort === VENDOR_PROMOTION_SORT.OLDEST) filtered = [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  else if (sort === VENDOR_PROMOTION_SORT.USAGE) filtered = [...filtered].sort((a, b) => b.usageCount - a.usageCount);
  else if (sort === VENDOR_PROMOTION_SORT.ENDS_SOON) filtered = [...filtered].sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
  else if (status === "all") filtered = [...filtered].sort((a, b) => byStatus(a, b) || byCreatedDesc(a, b));
  else filtered = [...filtered].sort(byCreatedDesc);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / normSize));
  const safePage = Math.min(normPage, totalPages);
  const start = (safePage - 1) * normSize;

  return {
    items: filtered.slice(start, start + normSize),
    total,
    page: safePage,
    pageSize: normSize,
    totalPages,
  };
}

export function getVendorPromotionCounts(): VendorPromotionCounts {
  const items = ownedPromotions();
  refreshStatuses(items);
  const counts: VendorPromotionCounts = {
    all: items.length,
    draft: 0,
    scheduled: 0,
    active: 0,
    paused: 0,
    expired: 0,
    cancelled: 0,
  };
  for (const p of items) {
    counts[p.status] = (counts[p.status] ?? 0) + 1;
  }
  return counts;
}

export function getVendorPromotionStats(): { active: number; scheduled: number; draft: number; totalUsage: number } {
  const items = ownedPromotions();
  refreshStatuses(items);
  return {
    active: items.filter((p) => p.status === "active").length,
    scheduled: items.filter((p) => p.status === "scheduled").length,
    draft: items.filter((p) => p.status === "draft").length,
    totalUsage: items.reduce((sum, p) => sum + p.usageCount, 0),
  };
}

// ── Detail ───────────────────────────────────────────────────

export function getVendorPromotionById(id: string): VendorPromotion | null {
  const promotion = locateOwned(id);
  if (!promotion) return null;
  refreshStatuses([promotion]);
  return promotion;
}

export function getVendorPromotionProductTitles(id: string): { id: string; title: string }[] {
  const promotion = locateOwned(id);
  if (!promotion) return [];
  const ids = new Set(promotion.productIds);
  return getProducts()
    .filter((p) => ids.has(p.id))
    .map((p) => ({ id: p.id, title: p.title }));
}

export function getAvailableVendorProducts(): Product[] {
  const vendorId = ownerVendorId();
  if (!vendorId) return [];
  return getProducts().filter((p) => p.vendorId === vendorId);
}

// ── Redemptions ──────────────────────────────────────────────

export function getVendorPromotionRedemptions(id: string): VendorPromotionRedemption[] {
  if (!locateOwned(id)) return [];
  return redemptionsStore.items
    .filter((r) => r.promotionId === id)
    .sort((a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime());
}

export function recordPromotionRedemption(
  promotionId: string,
  customerId: string,
  orderSubtotal: number
): VendorRedemptionResult {
  if (!ownerVendorId()) return { ok: false, error: "You don't have an approved vendor account." };
  const promotion = locateOwned(promotionId);
  if (!promotion) return { ok: false, error: "Promotion not found." };

  refreshStatuses([promotion]);
  if (promotion.status === "expired") return { ok: false, error: "This promotion has ended." };
  if (promotion.status === "cancelled") return { ok: false, error: "This promotion was cancelled." };
  if (promotion.status !== "active") return { ok: false, error: "This promotion is not currently active." };

  if (promotion.usageLimit !== undefined && promotion.usageCount >= promotion.usageLimit) {
    return { ok: false, error: "This promotion has reached its usage limit." };
  }
  if (promotion.perCustomerLimit !== undefined) {
    const used = redemptionsStore.items.filter(
      (r) => r.promotionId === promotionId && r.customerId === customerId
    ).length;
    if (used >= promotion.perCustomerLimit) {
      return { ok: false, error: "This customer has already used this promotion." };
    }
  }

  let discountAmount: number;
  if (promotion.discountType === "percentage") {
    const raw = (orderSubtotal * promotion.discountValue) / 100;
    discountAmount = promotion.maxDiscountAmount !== undefined ? Math.min(raw, promotion.maxDiscountAmount) : raw;
  } else {
    discountAmount = Math.min(promotion.discountValue, orderSubtotal);
  }
  discountAmount = Math.max(0, Math.round(discountAmount));

  const redemption: VendorPromotionRedemption = {
    id: `vpr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    promotionId,
    customerId,
    redeemedAt: nowIso(),
    discountAmount,
  };
  redemptionsStore.items.push(redemption);
  promotion.usageCount += 1;
  promotion.updatedAt = nowIso();

  return { ok: true, redemption, discountedTotal: orderSubtotal - discountAmount };
}

// ── Create / edit ────────────────────────────────────────────

export function createVendorPromotion(input: VendorPromotionInput): VendorPromotionResult {
  const vendorId = ownerVendorId();
  if (!vendorId) return fail("forbidden", "You don't have an approved vendor account.");
  const errors = validateBasic(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, code: "validation_failed", error: "Please fix the highlighted fields.", errors };
  }

  const now = nowIso();
  const promotion: VendorPromotion = {
    id: generateId(),
    vendorId,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    status: VENDOR_PROMOTION_STATUS.DRAFT,
    discountType: input.discountType,
    discountValue: Math.round(input.discountValue * 100) / 100,
    maxDiscountAmount: input.maxDiscountAmount ?? undefined,
    scope: input.scope,
    productIds: input.scope === "products" ? [...input.productIds] : [],
    categoryId: input.scope === "category" ? input.categoryId ?? undefined : undefined,
    minOrderAmount: input.minOrderAmount ?? undefined,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    eligibility: input.eligibility,
    usageLimit: input.usageLimit ?? undefined,
    perCustomerLimit: input.perCustomerLimit ?? undefined,
    usageCount: 0,
    stackable: input.stackable,
    createdAt: now,
    updatedAt: now,
  };
  promotionsStore.items.push(promotion);
  return okPromotion(promotion);
}

export function updateVendorPromotion(id: string, input: VendorPromotionInput): VendorPromotionResult {
  if (!ownerVendorId()) return fail("forbidden", "You don't have an approved vendor account.");
  const promotion = locateOwned(id);
  if (!promotion) return fail("not_found", "Promotion not found.");
  if (promotion.status !== "draft" && promotion.status !== "scheduled") {
    return fail("invalid_transition", "Only draft or scheduled promotions can be edited. Pause or cancel active ones.");
  }

  const errors = validateBasic(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, code: "validation_failed", error: "Please fix the highlighted fields.", errors };
  }

  promotion.title = input.title.trim();
  promotion.description = input.description?.trim() || undefined;
  promotion.discountType = input.discountType;
  promotion.discountValue = Math.round(input.discountValue * 100) / 100;
  promotion.maxDiscountAmount = input.maxDiscountAmount ?? undefined;
  promotion.scope = input.scope;
  promotion.productIds = input.scope === "products" ? [...input.productIds] : [];
  promotion.categoryId = input.scope === "category" ? input.categoryId ?? undefined : undefined;
  promotion.minOrderAmount = input.minOrderAmount ?? undefined;
  promotion.startsAt = input.startsAt;
  promotion.endsAt = input.endsAt;
  promotion.eligibility = input.eligibility;
  promotion.usageLimit = input.usageLimit ?? undefined;
  promotion.perCustomerLimit = input.perCustomerLimit ?? undefined;
  promotion.stackable = input.stackable;
  promotion.updatedAt = nowIso();

  refreshStatuses([promotion]);
  return okPromotion(promotion);
}

// ── Transitions ──────────────────────────────────────────────

export function activateVendorPromotion(id: string): VendorPromotionResult {
  const vendorId = ownerVendorId();
  if (!vendorId) return fail("forbidden", "You don't have an approved vendor account.");
  const promotion = locateOwned(id);
  if (!promotion) return fail("not_found", "Promotion not found.");
  if (promotion.status === "cancelled" || promotion.status === "expired") {
    return fail("invalid_transition", "A cancelled or expired promotion cannot be activated.");
  }

  const errors = validateScopeComplete(toInput(promotion), vendorId);
  if (Object.keys(errors).length > 0) {
    return { ok: false, code: "validation_failed", error: "Please fix the highlighted fields.", errors };
  }

  refreshStatuses([promotion]);
  if ((promotion.status as VendorPromotionStatus) === "expired") return fail("expired", "This promotion has already ended.");
  promotion.status = promotion.startsAt > nowIso() ? VENDOR_PROMOTION_STATUS.SCHEDULED : VENDOR_PROMOTION_STATUS.ACTIVE;
  promotion.updatedAt = nowIso();
  return okPromotion(promotion);
}

export function pauseVendorPromotion(id: string): VendorPromotionResult {
  if (!ownerVendorId()) return fail("forbidden", "You don't have an approved vendor account.");
  const promotion = locateOwned(id);
  if (!promotion) return fail("not_found", "Promotion not found.");
  refreshStatuses([promotion]);
  if (promotion.status !== "active") {
    return fail("invalid_transition", "Only an active promotion can be paused.");
  }
  promotion.status = VENDOR_PROMOTION_STATUS.PAUSED;
  promotion.pausedAt = nowIso();
  promotion.updatedAt = nowIso();
  return okPromotion(promotion);
}

export function resumeVendorPromotion(id: string): VendorPromotionResult {
  if (!ownerVendorId()) return fail("forbidden", "You don't have an approved vendor account.");
  const promotion = locateOwned(id);
  if (!promotion) return fail("not_found", "Promotion not found.");
  refreshStatuses([promotion]);
  if (promotion.status !== "paused") {
    return fail("invalid_transition", "Only a paused promotion can be resumed.");
  }
  const now = platformNow();
  if (now.getTime() > new Date(promotion.endsAt).getTime()) {
    return fail("expired", "This promotion ended while it was paused.");
  }
  promotion.status = now.getTime() < new Date(promotion.startsAt).getTime()
    ? VENDOR_PROMOTION_STATUS.SCHEDULED
    : VENDOR_PROMOTION_STATUS.ACTIVE;
  promotion.pausedAt = undefined;
  promotion.updatedAt = nowIso();
  return okPromotion(promotion);
}

export function cancelVendorPromotion(id: string): VendorPromotionResult {
  if (!ownerVendorId()) return fail("forbidden", "You don't have an approved vendor account.");
  const promotion = locateOwned(id);
  if (!promotion) return fail("not_found", "Promotion not found.");
  refreshStatuses([promotion]);
  if (promotion.status === "cancelled") {
    return fail("invalid_transition", "This promotion is already cancelled.");
  }
  promotion.status = VENDOR_PROMOTION_STATUS.CANCELLED;
  promotion.cancelledAt = nowIso();
  promotion.updatedAt = nowIso();
  return okPromotion(promotion);
}

export function duplicateVendorPromotion(id: string): VendorPromotionResult {
  const vendorId = ownerVendorId();
  if (!vendorId) return fail("forbidden", "You don't have an approved vendor account.");
  const promotion = locateOwned(id);
  if (!promotion) return fail("not_found", "Promotion not found.");

  const now = nowIso();
  const input = toInput(promotion);
  const copy: VendorPromotion = {
    id: generateId(),
    vendorId,
    title: `Copy of ${promotion.title}`,
    description: input.description,
    status: VENDOR_PROMOTION_STATUS.DRAFT,
    discountType: input.discountType,
    discountValue: input.discountValue,
    maxDiscountAmount: input.maxDiscountAmount ?? undefined,
    scope: input.scope,
    productIds: [...input.productIds],
    categoryId: input.categoryId ?? undefined,
    minOrderAmount: input.minOrderAmount ?? undefined,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    eligibility: input.eligibility,
    usageLimit: input.usageLimit ?? undefined,
    perCustomerLimit: input.perCustomerLimit ?? undefined,
    usageCount: 0,
    stackable: input.stackable,
    createdAt: now,
    updatedAt: now,
  };
  promotionsStore.items.push(copy);
  return okPromotion(copy);
}

// ── Lookups for forms ────────────────────────────────────────

export function getVendorPromotionFormContext() {
  const vendorId = ownerVendorId();
  return {
    products: getAvailableVendorProducts().map((p) => ({ id: p.id, title: p.title, price: p.price })),
    categories: getCategories().map((c) => ({ id: c.id, name: c.name })),
    limits: VENDOR_PROMOTION_LIMITS,
    vendorId: vendorId ?? null,
  };
}