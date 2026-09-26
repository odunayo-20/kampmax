import type {
  AdminActingContext,
  ListQuery,
  ManagedVendor,
  ManagedVendorDetail,
  Paginated,
  VendorActivityEvent,
  VendorBucket,
  VendorStatusCounts,
} from "@/types/admin";

// ------------------------------------------------------------
// CONTRACT (NestJS resource: /admin/vendors, see ./vendor-management.api.ts)
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
  /** The live API requires a written reason; the in-memory fixture ignores it. */
  suspend(
    id: string,
    ctx?: AdminActingContext,
    reason?: string
  ): Promise<ManagedVendor>;
  activate(id: string, ctx?: AdminActingContext): Promise<ManagedVendor>;
  deactivate(id: string, ctx?: AdminActingContext): Promise<ManagedVendor>;
  getActivity(id: string): Promise<VendorActivityEvent[]>;
}
