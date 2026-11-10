import { apiClient, type ApiError } from "@/lib/api-client";
import type { Paginated } from "@/types/admin";
import type {
  AdminAgentDetail,
  AdminAgentListItem,
  AdminListingDetail,
  AdminListingItem,
  AdminPayment,
  AdminReport,
  PaymentReconciliation,
} from "@/types/accommodation";
import type {
  AdminAccommodationService,
  AgentsPage,
  AgentsQuery,
  ListingsPage,
  ExportRange,
  ListingsQuery,
  PaymentsPage,
  PaymentsQuery,
  ReportsPage,
  ReportsQuery,
} from "./accommodation.service";

/** Live service over AdminAccommodationController (/accommodation/admin). */

interface BackendMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function fail(error: ApiError, fallback: string): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to continue.");
  }
  if (error.status === 403) {
    throw new Error("You don't have permission to do that.");
  }
  if (error.status === 404) {
    throw new Error("That no longer exists. It may have been removed.");
  }
  // 400 and 409 carry the backend's own explanation (missing documents, already decided...).
  throw new Error(error.message || fallback);
}

function paged<T>(items: T[], meta: BackendMeta): Paginated<T> {
  return {
    items,
    page: meta.page,
    pageSize: meta.limit,
    total: meta.total,
    totalPages: Math.max(1, meta.totalPages),
  };
}

function agentQuery(query: AgentsQuery): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.search?.trim()) params.set("q", query.search.trim());
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("limit", String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function listingQuery(query: ListingsQuery): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("limit", String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function paymentQuery(query: PaymentsQuery): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("limit", String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function reportQuery(query: ReportsQuery): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("limit", String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

const DAY_MS = 86_400_000;

/**
 * The export range as the backend wants it: the start of the first day up to (not
 * including) the day after the last, so the end day the admin picked is included.
 */
function exportQuery(range: ExportRange): string {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) {
    const end = new Date(`${range.to}T00:00:00Z`);
    if (!Number.isNaN(end.getTime())) {
      params.set("to", new Date(end.getTime() + DAY_MS).toISOString().slice(0, 10));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiAccommodationService(): AdminAccommodationService {
  const base = "/accommodation/admin";
  const agent = (id: string) => `${base}/agents/${encodeURIComponent(id)}`;
  const listing = (id: string) => `${base}/listings/${encodeURIComponent(id)}`;

  /** A decision that returns the updated record. */
  async function decide<R>(path: string, body: Record<string, unknown>, fallback: string): Promise<R> {
    const { data, error } = await apiClient.patch<Record<string, unknown>, R>(path, body);
    if (error) fail(error, fallback);
    return data;
  }

  return {
    // ---- agents ----
    async listAgents(query = {}) {
      const { data, error } = await apiClient.get<{
        items: AdminAgentListItem[];
        meta: BackendMeta;
        counts: AgentsPage["counts"];
      }>(`${base}/agents${agentQuery(query)}`);
      if (error) fail(error, "Couldn't load the applications.");
      return { ...paged(data.items, data.meta), counts: data.counts };
    },

    async getAgent(id) {
      const { data, error } = await apiClient.get<AdminAgentDetail>(agent(id));
      if (error) fail(error, "Couldn't load the application.");
      return data;
    },

    async agentListings(id, page, pageSize) {
      const params = new URLSearchParams();
      if (page) params.set("page", String(page));
      if (pageSize) params.set("limit", String(pageSize));
      const qs = params.toString();
      const { data, error } = await apiClient.get<{ items: AdminListingItem[]; meta: BackendMeta }>(
        `${agent(id)}/listings${qs ? `?${qs}` : ""}`
      );
      if (error) fail(error, "Couldn't load the agent's listings.");
      return paged(data.items, data.meta);
    },

    approveAgent: (id) => decide(`${agent(id)}/approve`, {}, "Couldn't approve the agent."),
    rejectAgent: (id, reason) => decide(`${agent(id)}/reject`, { reason }, "Couldn't reject the application."),
    requestAgentInfo: (id, message) =>
      decide(`${agent(id)}/request-info`, { reason: message }, "Couldn't send the request."),
    suspendAgent: (id, reason) => decide(`${agent(id)}/suspend`, { reason }, "Couldn't suspend the agent."),
    restoreAgent: (id) => decide(`${agent(id)}/restore`, {}, "Couldn't restore the agent."),
    revokeAgent: (id, reason) => decide(`${agent(id)}/revoke`, { reason }, "Couldn't revoke the agent."),

    reviewAgentDocument: (agentId, documentId, decision, reason) =>
      decide(
        `${agent(agentId)}/documents/${encodeURIComponent(documentId)}`,
        { decision, ...(reason?.trim() ? { reason: reason.trim() } : {}) },
        "Couldn't save the document decision."
      ),

    async openAgentDocument(agentId, documentId) {
      const { blob, filename, error } = await apiClient.getBlob(
        `${agent(agentId)}/documents/${encodeURIComponent(documentId)}/file`
      );
      if (error || !blob) fail(error ?? (new Error("No file") as ApiError), "Couldn't open the document.");
      return { blob, filename };
    },

    // ---- listings ----
    async listListings(query = {}) {
      const { data, error } = await apiClient.get<{
        items: AdminListingItem[];
        meta: BackendMeta;
        counts: ListingsPage["counts"];
      }>(`${base}/listings${listingQuery(query)}`);
      if (error) fail(error, "Couldn't load the listings.");
      return { ...paged(data.items, data.meta), counts: data.counts };
    },

    async getListing(id) {
      const { data, error } = await apiClient.get<AdminListingDetail>(listing(id));
      if (error) fail(error, "Couldn't load the listing.");
      return data;
    },

    approveListing: (id) => decide(`${listing(id)}/approve`, {}, "Couldn't approve the listing."),
    rejectListing: (id, reason) => decide(`${listing(id)}/reject`, { reason }, "Couldn't reject the listing."),
    suspendListing: (id, reason) => decide(`${listing(id)}/suspend`, { reason }, "Couldn't suspend the listing."),
    restoreListing: (id) => decide(`${listing(id)}/restore`, {}, "Couldn't restore the listing."),

    // ---- payments ----
    async listPayments(query = {}) {
      const { data, error } = await apiClient.get<{
        items: AdminPayment[];
        meta: BackendMeta;
        counts: PaymentsPage["counts"];
      }>(`${base}/payments${paymentQuery(query)}`);
      if (error) fail(error, "Couldn't load the payments.");
      return { ...paged(data.items, data.meta), counts: data.counts };
    },

    async flagPaymentForRefund(id, reason) {
      await decide(
        `${base}/payments/${encodeURIComponent(id)}/flag-refund`,
        { reason },
        "Couldn't mark the payment for refund."
      );
    },

    async refundPayment(id) {
      const { error } = await apiClient.post<Record<string, never>>(
        `${base}/payments/${encodeURIComponent(id)}/refund`,
        {}
      );
      if (error) fail(error, "Couldn't send the refund.");
    },

    async paymentReconciliation() {
      const { data, error } = await apiClient.get<PaymentReconciliation>(`${base}/payments/reconciliation`);
      if (error) fail(error, "Couldn't load the reconciliation report.");
      return data;
    },

    // ---- reports ----
    async listReports(query = {}) {
      const { data, error } = await apiClient.get<{
        items: AdminReport[];
        meta: BackendMeta;
        counts: ReportsPage["counts"];
      }>(`${base}/reports${reportQuery(query)}`);
      if (error) fail(error, "Couldn't load the reports.");
      return { ...paged(data.items, data.meta), counts: data.counts };
    },

    async resolveReport(id, input) {
      const result = await decide<{ listingSuspended: boolean }>(
        `${base}/reports/${encodeURIComponent(id)}/resolve`,
        {
          decision: input.decision,
          resolution: input.resolution.trim(),
          // Dismissing never takes a listing down, whatever the box says.
          ...(input.decision === "RESOLVED" && input.suspendListing ? { suspendListing: true } : {}),
        },
        "Couldn't close the report."
      );
      return { listingSuspended: Boolean(result?.listingSuspended) };
    },

    async exportPayments(range = {}) {
      const { blob, filename, error } = await apiClient.getBlob(`${base}/payments/export${exportQuery(range)}`);
      if (error || !blob) fail(error ?? (new Error("No file") as ApiError), "Couldn't download the payments.");
      return { blob, filename };
    },
  };
}
