import type {
  ManagedOrder,
  ManagedOrderDetail,
  OrderFacets,
  OrderListQuery,
  OrderSortField,
  OrderStatusCounts,
  Paginated,
} from "@/types/admin";

// Contract for the /admin/orders console: inspection plus cancel / advance. The live
// implementation is order-management.api.ts.
export interface AdminOrderManagementService {
  list(query?: OrderListQuery): Promise<Paginated<ManagedOrder>>;
  /** Looks an order up by its order number (or internal id). */
  getById(id: string): Promise<ManagedOrderDetail | null>;
  getCounts(): Promise<OrderStatusCounts>;
  getFacets(): Promise<OrderFacets>;
  /**
   * Cancels an undelivered order. A paid order is refunded to the customer's
   * Kampmax wallet. Returns the refreshed detail.
   */
  cancel(id: string, reason: string): Promise<ManagedOrderDetail>;
  /** Moves an order forward through fulfilment. Returns the refreshed detail. */
  advance(
    id: string,
    status: AdvanceOrderStatus,
    note?: string
  ): Promise<ManagedOrderDetail>;
  /** Opens a dispute; the vendor payout is held until it is resolved. */
  openDispute(id: string, reason: string): Promise<ManagedOrderDetail>;
  /**
   * Resolves an open dispute. "refund" cancels an undelivered order and
   * refunds it in full; for a delivered order (or a buyer's escalated refund
   * request) it refunds `amount` (by default the buyer's request, or the whole
   * order) and releases the rest of the payout. "dismiss" closes it (and
   * releases a held payout).
   */
  resolveDispute(
    id: string,
    outcome: DisputeOutcome,
    note: string,
    amount?: number
  ): Promise<ManagedOrderDetail>;
}

export type DisputeOutcome = "refund" | "dismiss";

export type AdvanceOrderStatus =
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered";

export type { OrderSortField };
