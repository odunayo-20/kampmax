import {
  ManagedPayout,
  ManagedPayoutDetail,
  ManagedPayoutFacets,
  ManagedPayoutListQuery,
  ManagedPayoutStatusCounts,
  Paginated,
  ResolvePayoutInput,
} from "@/types/admin";
import { apiDelay, paginate } from "@/lib/admin/api";
import {
  computePayoutCounts,
  filterPayoutRows,
  payoutDataset,
  payoutFacets,
  sortPayoutRows,
} from "@/data/admin/payout-management";

// ------------------------------------------------------------
// CONTRACT (future NestJS resource: /admin/payouts)
// ------------------------------------------------------------

export interface AdminPayoutManagementService {
  list(query?: ManagedPayoutListQuery): Promise<Paginated<ManagedPayout>>;
  getById(id: string): Promise<ManagedPayoutDetail | null>;
  getCounts(): Promise<ManagedPayoutStatusCounts>;
  getFacets(): Promise<ManagedPayoutFacets>;
  /** Records the real outcome of a pending bank-transfer withdrawal. */
  resolvePayout(id: string, input: ResolvePayoutInput): Promise<ManagedPayoutDetail>;
}

// ------------------------------------------------------------
// MOCK IMPLEMENTATION
//
// Derives the payout ledger once from the immutable wallet, vendor and
// freelancer payout stores (~7 rows), so nothing can drift from the owning
// stores. The console is intentionally read-only:
//   - there is no actor/ctx parameter because payout records are
//     platform-scoped. Access is gatekept at the nav layer: only
//     ADMIN/SUPER_ADMIN roles are granted the "payouts" section, so
//     CAMPUS_ADMIN operators never reach this service (defense in depth
//     via UI permissions, mirroring the backend boundary).
//   - there is no mutation surface because the prototype backend has no
//     payout-level actions (approve/process/retry/cancel/reverse live on
//     the disbursement backend, which is not wired in).
// ------------------------------------------------------------

export function createPayoutManagementService(): AdminPayoutManagementService {
  return {
    async list(query) {
      await apiDelay();
      const rows = sortPayoutRows(
        filterPayoutRows(payoutDataset.rows, query ?? {}),
        query?.sortBy,
        query?.sortDir ?? "desc"
      );
      return paginate(rows, query ?? {});
    },

    async getById(id) {
      await apiDelay();
      return payoutDataset.byId.get(id) ?? null;
    },

    async getCounts() {
      await apiDelay(60);
      return computePayoutCounts(payoutDataset.rows);
    },

    async getFacets() {
      await apiDelay(60);
      return payoutFacets(payoutDataset.rows);
    },

    async resolvePayout(id, input) {
      await apiDelay();
      const detail = payoutDataset.byId.get(id);
      if (!detail) throw new Error("Payout not found");
      if (detail.payout.method !== "bank_transfer" || detail.payout.status !== "pending") {
        throw new Error(
          "Only a pending bank-transfer withdrawal can be resolved — wallet settlements post automatically."
        );
      }
      const now = new Date().toISOString();
      const reason = input.reason?.trim() || null;
      detail.payout.status = input.outcome;
      detail.payout.processedAt = now;
      detail.payout.failedReason = input.outcome === "failed" ? reason ?? "Not recorded." : null;
      detail.payout.reversalReason = input.outcome === "reversed" ? reason ?? "Not recorded." : null;
      detail.actions = {
        supported: true,
        resolvable: false,
        note: `This withdrawal was already marked ${input.outcome}; resolution is one-way.`,
      };
      detail.timeline = [
        ...detail.timeline,
        {
          id: `${id}-resolved`,
          kind: input.outcome === "successful" ? "completed" : input.outcome,
          title: `Payout marked ${input.outcome} by an admin`,
          meta:
            input.outcome === "successful"
              ? "Confirmed delivered to the bank account on record"
              : reason ?? "Not recorded.",
          at: now,
        },
      ];
      return detail;
    },
  };
}