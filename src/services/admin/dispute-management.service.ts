import { CommunitySectionCounts, DisputeListQuery, ManagedDispute, ManagedDisputeStatus, Paginated } from "@/types/admin";

// ------------------------------------------------------------
// CONTRACT (/admin/disputes)
// ------------------------------------------------------------
// A dispute has no record of its own — it IS an order
// (orders.disputedAt/disputeReason/disputeResolvedAt/disputeResolution).
// Opening and resolving one is real on the Orders console already
// (orderManagementService.openDispute / resolveDispute); this console is a
// read-only, filtered case log for finding disputes to act on there.
// ------------------------------------------------------------

export interface AdminDisputeManagementService {
  list(query?: DisputeListQuery): Promise<Paginated<ManagedDispute>>;
  getCounts(): Promise<CommunitySectionCounts<ManagedDisputeStatus>>;
}
