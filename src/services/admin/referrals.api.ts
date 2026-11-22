import { apiClient } from "@/lib/api-client";
import type { AdminReferral, ReferralStatus, ReferralSummary } from "@/lib/admin/referrals";
import type { Paginated } from "@/types/admin";

export interface ReferralQuery {
  status?: ReferralStatus | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}

interface BackendPage {
  items: AdminReferral[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function explain(status: number | undefined, message: string | undefined, fallback: string): Error {
  if (status === 401) return new Error("You're signed out. Sign in again to continue.");
  if (status === 403) return new Error("You don't have permission to see invite credit.");
  return new Error(message || fallback);
}

/** GET /admin/referrals/summary */
export async function fetchReferralSummary(): Promise<ReferralSummary> {
  const { data, error } = await apiClient.get<ReferralSummary>("/admin/referrals/summary");
  if (error) throw explain(error.status, error.message, "Couldn't load the summary.");
  return data;
}

/** GET /admin/referrals */
export async function fetchReferrals(query: ReferralQuery): Promise<Paginated<AdminReferral>> {
  const params = new URLSearchParams();
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.search?.trim()) params.set("q", query.search.trim());
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("limit", String(query.pageSize));
  const qs = params.toString();
  const { data, error } = await apiClient.get<BackendPage>(`/admin/referrals${qs ? `?${qs}` : ""}`);
  if (error) throw explain(error.status, error.message, "Couldn't load the invites.");
  return {
    items: data.items,
    page: data.meta.page,
    pageSize: data.meta.limit,
    total: data.meta.total,
    totalPages: Math.max(1, data.meta.totalPages),
  };
}
