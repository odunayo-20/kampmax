import {
  ListQuery,
  ManagedProduct,
  ManagedProductDetail,
  Paginated,
  ProductActivityEvent,
  ProductFacets,
  ProductStatusCounts,
} from "@/types/admin";

// ------------------------------------------------------------
// CONTRACT (live implementation: product-management.api.ts)
// ------------------------------------------------------------

export type ManagedProductSortField =
  | "title"
  | "price"
  | "stock"
  | "salesCount"
  | "revenue"
  | "rating"
  | "createdAt";

export type ProductStockFilter = "any" | "in_stock" | "low_stock" | "out_of_stock";

export interface ManagedProductListFilters {
  status?: ManagedProduct["status"] | "all";
  categoryId?: string | "all";
  campusId?: string | "all";
  vendorId?: string | "all";
  priceMin?: number | null;
  priceMax?: number | null;
  stock?: ProductStockFilter;
}

export interface ManagedProductListQuery
  extends ListQuery,
    ManagedProductListFilters {}

export interface AdminProductManagementService {
  list(query?: ManagedProductListQuery): Promise<Paginated<ManagedProduct>>;
  getById(id: string): Promise<ManagedProductDetail | null>;
  getCounts(): Promise<ProductStatusCounts>;
  getFacets(): Promise<ProductFacets>;
  approve(id: string): Promise<ManagedProduct>;
  reject(id: string, reason: string): Promise<ManagedProduct>;
  suspend(id: string, reason: string): Promise<ManagedProduct>;
  archive(id: string): Promise<ManagedProduct>;
  restore(id: string): Promise<ManagedProduct>;
  getActivity(id: string): Promise<ProductActivityEvent[]>;
}
