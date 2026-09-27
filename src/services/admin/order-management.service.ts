import type {
  ManagedOrder,
  ManagedOrderDetail,
  OrderFacets,
  OrderListQuery,
  OrderSortField,
  OrderStatusCounts,
  Paginated,
} from "@/types/admin";

// Read-only contract for the /admin/orders console. The live
// implementation is order-management.api.ts.
export interface AdminOrderManagementService {
  list(query?: OrderListQuery): Promise<Paginated<ManagedOrder>>;
  /** Looks an order up by its order number (or internal id). */
  getById(id: string): Promise<ManagedOrderDetail | null>;
  getCounts(): Promise<OrderStatusCounts>;
  getFacets(): Promise<OrderFacets>;
}

export type { OrderSortField };
