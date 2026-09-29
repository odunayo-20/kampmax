import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  TrustSafetyReportCounts,
  TrustSafetyReportDetail,
  TrustSafetyReportFacets,
  TrustSafetyReportListQuery,
  TrustSafetyReportRow,
  UpdateSafetyReportStatusInput,
  Paginated,
} from "@/types/admin";
import type { AdminTrustSafetyService } from "./report-management.service";

/**
 * Live /admin/safety service backed by AdminSafetyController
 * (GET /admin/safety, /counts, /facets, /:id, PATCH /:id/status). One
 * ledger over the two real stores that record someone flagging something:
 * flagged reviews (`reviews`) and campus-post reports (`post_reports`).
 */

interface BackendPage<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function fail(error: ApiError, fallback: string): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to continue.");
  }
  if (error.status === 403) {
    throw new Error("You don't have permission to view reports.");
  }
  throw new Error(error.message || fallback);
}

function queryString(query: TrustSafetyReportListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null | undefined) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("source", query.source);
  set("reason", query.reason);
  set("targetType", query.targetType);
  set("campusId", query.campusId);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiTrustSafetyService(): AdminTrustSafetyService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<TrustSafetyReportRow>>(
        `/admin/safety${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load reports.");
      return {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      } satisfies Paginated<TrustSafetyReportRow>;
    },

    async getById(id) {
      const { data, error } = await apiClient.get<TrustSafetyReportDetail>(
        `/admin/safety/${encodeURIComponent(id)}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the report.");
      return data;
    },

    async getCounts() {
      const { data, error } = await apiClient.get<TrustSafetyReportCounts>(
        "/admin/safety/counts"
      );
      if (error) fail(error, "Couldn't load report counts.");
      return data;
    },

    async getFacets() {
      const { data, error } = await apiClient.get<TrustSafetyReportFacets>(
        "/admin/safety/facets"
      );
      if (error) fail(error, "Couldn't load report filters.");
      return data;
    },

    async getReasonOptions() {
      const { data, error } = await apiClient.get<TrustSafetyReportFacets>(
        "/admin/safety/facets"
      );
      if (error) fail(error, "Couldn't load reason options.");
      return data.reasons;
    },

    async setReportStatus(id, input) {
      const { data, error } = await apiClient.patch<
        UpdateSafetyReportStatusInput,
        TrustSafetyReportDetail
      >(`/admin/safety/${encodeURIComponent(id)}/status`, input);
      if (error?.status === 400) {
        throw new Error(error.message || "This report can't be moved through review.");
      }
      if (error) fail(error, "Couldn't update the report.");
      return data;
    },
  };
}
