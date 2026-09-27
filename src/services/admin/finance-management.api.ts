import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  FinanceManagementService,
  ManagedFinanceOverview,
  ManagedFinanceReport,
  ManagedReconciliationResult,
} from "@/types/admin";

/**
 * Live /admin/finance service backed by AdminFinanceController
 * (GET /admin/finance/overview, /reconciliation, /reports/:id).
 *
 * Read-only: every figure is computed by the API from the orders,
 * payments, wallet and top-up tables. Requires analytics.financial.read.
 */

function fail(error: ApiError, fallback: string): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to continue.");
  }
  if (error.status === 403) {
    throw new Error("You don't have permission to view finance data.");
  }
  throw new Error(error.message || fallback);
}

export function createApiFinanceConsoleService(): FinanceManagementService {
  return {
    async getOverview() {
      const { data, error } = await apiClient.get<ManagedFinanceOverview>(
        "/admin/finance/overview"
      );
      if (error) fail(error, "Couldn't load the finance overview.");
      return data;
    },

    async getReconciliation() {
      const { data, error } = await apiClient.get<ManagedReconciliationResult>(
        "/admin/finance/reconciliation"
      );
      if (error) fail(error, "Couldn't load reconciliation checks.");
      return data;
    },

    async getReport(id) {
      const { data, error } = await apiClient.get<ManagedFinanceReport>(
        `/admin/finance/reports/${encodeURIComponent(id)}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the report.");
      return data;
    },
  };
}
