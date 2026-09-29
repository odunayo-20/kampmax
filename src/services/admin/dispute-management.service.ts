import {
  CommunitySectionCounts,
  DisputeListQuery,
  ListQuery,
  ManagedDispute,
  ManagedDisputeStatus,
  Paginated,
} from "@/types/admin";
import { apiDelay, applySearch, applySort, paginate } from "@/lib/admin/api";

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

const MOCK_DISPUTES: ManagedDispute[] = [
  {
    id: "KMP-1001",
    orderId: "KMP-1001",
    customerId: "u1",
    customerName: "Ada Obi",
    vendorId: "v8",
    vendorName: "Adebayo's Gadgets",
    campusId: "unilag",
    reason: "Item never arrived after the delivery window closed",
    amount: 45000,
    status: "open",
    resolutionOutcome: null,
    resolutionNote: null,
    openedAt: "2026-02-01T09:00:00Z",
    resolvedAt: null,
    createdAt: "2026-01-28T14:00:00Z",
  },
  {
    id: "KMP-0988",
    orderId: "KMP-0988",
    customerId: "u2",
    customerName: "Chidi Okafor",
    vendorId: "v3",
    vendorName: "Campus Bites",
    campusId: "ui",
    reason: "Wrong item delivered",
    amount: 12000,
    status: "resolved",
    resolutionOutcome: "refunded",
    resolutionNote: "Order cancelled: confirmed wrong item via photos",
    openedAt: "2026-01-20T09:00:00Z",
    resolvedAt: "2026-01-22T10:00:00Z",
    createdAt: "2026-01-18T09:00:00Z",
  },
];

/** Frontend-only mock, superseded by the live /admin/disputes API. */
export function createMockDisputeManagementService(): AdminDisputeManagementService {
  const disputes = MOCK_DISPUTES.map((d) => ({ ...d }));

  return {
    async list(query = {}) {
      await apiDelay();
      const { search, status = "all", campusId = "all", ...rest } = query;

      let rows = disputes.filter(
        (d) =>
          (status === "all" || d.status === status) &&
          (campusId === "all" || d.campusId === campusId)
      );
      rows = applySearch(rows, search, (d) => [
        d.id,
        d.customerName,
        d.vendorName,
        d.reason,
      ]);
      rows = applySort(
        rows,
        rest.sortBy,
        rest.sortDir ?? "desc",
        {
          createdAt: (d) => new Date(d.createdAt).getTime(),
          amount: (d) => d.amount,
        },
        "createdAt"
      );
      return paginate(rows, rest as ListQuery);
    },

    async getCounts() {
      await apiDelay(80);
      const open = disputes.filter((d) => d.status === "open").length;
      return {
        all: disputes.length,
        byStatus: { open, resolved: disputes.length - open },
      };
    },
  };
}
