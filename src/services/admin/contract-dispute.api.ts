import { apiClient, type ApiError } from "@/lib/api-client";
import type { Engagement, EngagementDisputeOutcome } from "@/services/jobs";
import type { Paginated } from "@/types/admin";

/**
 * Live /admin/engagements dispute service (AdminEngagementsController). Unlike
 * shop-order disputes, a freelance contract dispute is ruled on right here:
 * the admin either pays the freelancer or refunds the employer, which moves
 * the escrowed money and closes the contract.
 */

export type ContractDisputeStatus = "open" | "resolved";

export interface ContractDisputeQuery {
  status?: ContractDisputeStatus | "all";
  page?: number;
  pageSize?: number;
}

export interface ContractDisputeCounts {
  all: number;
  byStatus: Record<ContractDisputeStatus, number>;
}

interface BackendPage<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function fail(error: ApiError, fallback: string): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to continue.");
  }
  if (error.status === 403) {
    throw new Error("You don't have permission to rule on contract disputes.");
  }
  throw new Error(error.message || fallback);
}

export interface ContractDisputeService {
  list(query?: ContractDisputeQuery): Promise<Paginated<Engagement>>;
  getCounts(): Promise<ContractDisputeCounts>;
  /** Pay the freelancer (RELEASE) or return the money to the employer (REFUND). */
  resolve(id: string, outcome: EngagementDisputeOutcome, note: string): Promise<Engagement>;
}

export function createApiContractDisputeService(): ContractDisputeService {
  return {
    async list(query = {}) {
      const params = new URLSearchParams();
      if (query.status && query.status !== "all") params.set("status", query.status);
      if (query.page) params.set("page", String(query.page));
      if (query.pageSize) params.set("limit", String(query.pageSize));
      const qs = params.toString();

      const { data, error } = await apiClient.get<BackendPage<Engagement>>(
        `/admin/engagements/disputes${qs ? `?${qs}` : ""}`
      );
      if (error) fail(error, "Couldn't load contract disputes.");
      return {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      };
    },

    async getCounts() {
      const { data, error } = await apiClient.get<ContractDisputeCounts>(
        "/admin/engagements/disputes/counts"
      );
      if (error) fail(error, "Couldn't load dispute counts.");
      return data;
    },

    async resolve(id, outcome, note) {
      const { data, error } = await apiClient.patch<{ outcome: EngagementDisputeOutcome; note: string }, Engagement>(
        `/admin/engagements/${id}/dispute/resolve`,
        { outcome, note }
      );
      if (error) fail(error, "Couldn't settle this dispute.");
      return data;
    },
  };
}
