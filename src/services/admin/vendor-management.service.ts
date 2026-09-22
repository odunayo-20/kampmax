import { apiClient } from "@/lib/api-client";
import {
  AdminActingContext,
  ListQuery,
  ManagedVendor,
  ManagedVendorDetail,
  Paginated,
  VendorActivityEvent,
  VendorBucket,
  VendorStatusCounts,
} from "@/types/admin";
import { apiDelay, applySearch, applySort, paginate } from "@/lib/admin/api";
import {
  applyStoreVerdict,
  applyVerificationVerdict,
  bucketOf,
  buildManagedVendorDataset,
} from "@/data/admin/vendor-management";
import { DEFAULT_ADMIN_ACTOR, recordAdminAuditEvent } from "@/data/admin/audit-trail";

// ------------------------------------------------------------
// CONTRACT (future NestJS resource: /admin/vendors)
// ------------------------------------------------------------

export type ManagedVendorSortField =
  | "storeName"
  | "registeredAt"
  | "productsCount"
  | "ordersCount"
  | "totalSales"
  | "rating";

export interface ManagedVendorListFilters {
  queue?: VendorBucket | "all";
  campusId?: string | "all";
  category?: string | "all";
}

export interface ManagedVendorListQuery extends ListQuery, ManagedVendorListFilters {}

export interface AdminVendorManagementService {
  list(query?: ManagedVendorListQuery): Promise<Paginated<ManagedVendor>>;
  getById(id: string): Promise<ManagedVendorDetail | null>;
  getCounts(): Promise<VendorStatusCounts>;
  getCategories(): Promise<string[]>;
  approve(id: string, ctx?: AdminActingContext): Promise<ManagedVendor>;
  reject(id: string, reason: string, ctx?: AdminActingContext): Promise<ManagedVendor>;
  suspend(id: string, ctx?: AdminActingContext): Promise<ManagedVendor>;
  activate(id: string, ctx?: AdminActingContext): Promise<ManagedVendor>;
  deactivate(id: string, ctx?: AdminActingContext): Promise<ManagedVendor>;
  getActivity(id: string): Promise<VendorActivityEvent[]>;
}

// ------------------------------------------------------------
// MOCK IMPLEMENTATION
//
// Reads a fresh dataset derived from the real vendor stores on
// every call (8 vendors — cheap). Mutations are applied through
// the data module's overlay and cascade through to the storefront
// and platform-vendor records they semantically affect, so the
// admin console stays consistent with the rest of the prototype.
// ------------------------------------------------------------

export function createVendorManagementService(): AdminVendorManagementService {
  function fresh() {
    return buildManagedVendorDataset();
  }

  function findVendor(id: string): ManagedVendor {
    const vendor = fresh().vendors.find((v) => v.id === id);
    if (!vendor) throw new Error(`Vendor ${id} not found`);
    return vendor;
  }

  function auditActor(ctx?: AdminActingContext) {
    if (!ctx?.actor) return DEFAULT_ADMIN_ACTOR;
    return {
      type: "admin" as const,
      id: ctx.actor.id,
      name: ctx.actor.name,
      role: ctx.actor.role,
    };
  }

  return {
    async list(query = {}) {
      await apiDelay();
      const {
        search,
        sortBy,
        sortDir = "desc",
        page = 1,
        pageSize = 10,
        queue = "all",
        campusId = "all",
        category = "all",
      } = query;

      let rows = fresh().vendors.filter(
        (v) =>
          (queue === "all" || bucketOf(v.verificationStatus, v.storeStatus) === queue) &&
          (campusId === "all" || v.campusId === campusId) &&
          (category === "all" || v.category === category)
      );

      rows = applySearch(rows, search, (v) => [
        v.storeName,
        v.owner.name,
        v.owner.email,
        v.category,
        v.id,
      ]);

      rows = applySort(
        rows,
        sortBy,
        sortDir,
        {
          storeName: (v) => v.storeName.toLowerCase(),
          registeredAt: (v) => {
            const t = new Date(v.registeredAt).getTime();
            return Number.isFinite(t) ? t : 0;
          },
          productsCount: (v) => v.productsCount,
          ordersCount: (v) => v.ordersCount,
          totalSales: (v) => v.totalSales ?? 0,
          rating: (v) => v.rating,
        },
        "registeredAt"
      );

      return paginate(rows, { page, pageSize });
    },

    async getById(id) {
      await apiDelay(160);
      return fresh().details.get(id) ?? null;
    },

    async getCounts() {
      await apiDelay(80);
      const vendors = fresh().vendors;
      const by = (bucket: VendorBucket) =>
        vendors.filter(
          (v) => bucketOf(v.verificationStatus, v.storeStatus) === bucket
        ).length;
      return {
        all: vendors.length,
        pending_verification: by("pending_verification"),
        verified: by("verified"),
        rejected: by("rejected"),
        suspended: by("suspended"),
        deactivated: by("deactivated"),
      };
    },

    async getCategories() {
      await apiDelay(60);
      return [...new Set(fresh().vendors.map((v) => v.category))].sort();
    },

    async approve(id, ctx) {
      await apiDelay();
      const vendor = findVendor(id);
      if (vendor.verificationStatus !== "pending_verification") {
        throw new Error("Only pending stores can be approved.");
      }
      applyVerificationVerdict(id, "verified", ctx?.actor?.name ?? "Platform Admin");
      recordAdminAuditEvent({
        action: "VENDOR_APPROVED",
        actor: auditActor(ctx),
        resource: { type: "vendor", id, label: vendor.storeName },
        metadata: { previousStatus: vendor.verificationStatus, newStatus: "verified" },
      });
      return findVendor(id);
    },

    async reject(id, reason, ctx) {
      await apiDelay();
      const vendor = findVendor(id);
      if (!reason.trim()) throw new Error("A rejection reason is required.");
      if (vendor.verificationStatus !== "pending_verification") {
        throw new Error("Only pending stores can be rejected.");
      }
      applyVerificationVerdict(id, "rejected", ctx?.actor?.name ?? "Platform Admin", reason.trim());
      recordAdminAuditEvent({
        action: "VENDOR_REJECTED",
        actor: auditActor(ctx),
        resource: { type: "vendor", id, label: vendor.storeName },
        metadata: {
          reason: reason.trim(),
          previousStatus: vendor.verificationStatus,
          newStatus: "rejected",
        },
      });
      return findVendor(id);
    },

    async suspend(id, ctx) {
      await apiDelay();
      const vendor = findVendor(id);
      if (vendor.verificationStatus !== "verified") {
        throw new Error("Only verified stores can be suspended.");
      }
      if (vendor.storeStatus !== "active") {
        throw new Error(`Store is already ${vendor.storeStatus}.`);
      }
      applyStoreVerdict(id, "suspended");
      recordAdminAuditEvent({
        action: "VENDOR_SUSPENDED",
        actor: auditActor(ctx),
        resource: { type: "vendor", id, label: vendor.storeName },
        metadata: { previousStatus: vendor.storeStatus, newStatus: "suspended" },
      });
      return findVendor(id);
    },

    async activate(id, ctx) {
      await apiDelay();
      const vendor = findVendor(id);
      if (vendor.verificationStatus !== "verified") {
        throw new Error("Verify the vendor before activating the store.");
      }
      if (vendor.storeStatus === "active") {
        throw new Error("Store is already active.");
      }
      applyStoreVerdict(id, "active");
      recordAdminAuditEvent({
        action: "VENDOR_ACTIVATED",
        actor: auditActor(ctx),
        resource: { type: "vendor", id, label: vendor.storeName },
        metadata: { previousStatus: vendor.storeStatus, newStatus: "active" },
      });
      return findVendor(id);
    },

    async deactivate(id, ctx) {
      await apiDelay();
      const vendor = findVendor(id);
      if (vendor.verificationStatus !== "verified") {
        throw new Error("Unverified vendors are managed through the verification queue.");
      }
      if (vendor.storeStatus === "deactivated") {
        throw new Error("Store is already deactivated.");
      }
      applyStoreVerdict(id, "deactivated");
      recordAdminAuditEvent({
        action: "VENDOR_DEACTIVATED",
        actor: auditActor(ctx),
        resource: { type: "vendor", id, label: vendor.storeName },
        metadata: { previousStatus: vendor.storeStatus, newStatus: "deactivated" },
      });
      return findVendor(id);
    },

    async getActivity(id) {
      await apiDelay(120);
      return fresh().details.get(id)?.activity ?? [];
    },
  };
}
