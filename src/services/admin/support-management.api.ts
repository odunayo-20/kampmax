import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  Paginated,
  SupportAssignInput,
  SupportAssignee,
  SupportEscalateInput,
  SupportRespondInput,
  SupportSetPriorityInput,
  SupportSetStatusInput,
  SupportTicket,
  SupportTicketDetail,
  SupportTicketListQuery,
  SupportTicketMetrics,
} from "@/types/admin";
import type { AdminSupportManagementService } from "./support-management.service";

/**
 * Live /admin/support/tickets service backed by AdminSupportController
 * (GET /admin/support/tickets, /metrics, /assignable-staff, /:id;
 * POST /:id/reply, /:id/note; PATCH /:id/assign, /:id/status,
 * /:id/priority, /:id/escalate). The real ticket store — no more
 * in-memory dataset, no more `ctx` needed for campus scoping (the backend
 * derives everything from the authenticated session).
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
    throw new Error("You don't have permission to manage support tickets.");
  }
  throw new Error(error.message || fallback);
}

function queryString(query: SupportTicketListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | boolean | null | undefined) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("priority", query.priority);
  set("category", query.category);
  set("assigneeId", query.assigneeId);
  set("campusId", query.campusId);
  if (query.escalated) set("escalated", true);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiSupportManagementService(): AdminSupportManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<SupportTicket>>(
        `/admin/support/tickets${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load support tickets.");
      return {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      } satisfies Paginated<SupportTicket>;
    },

    async getById(id) {
      const { data, error } = await apiClient.get<SupportTicketDetail>(
        `/admin/support/tickets/${encodeURIComponent(id)}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the ticket.");
      return data;
    },

    async getMetrics() {
      const { data, error } = await apiClient.get<SupportTicketMetrics>(
        "/admin/support/tickets/metrics"
      );
      if (error) fail(error, "Couldn't load support metrics.");
      return data;
    },

    async getAssignableStaff() {
      const { data, error } = await apiClient.get<SupportAssignee[]>(
        "/admin/support/tickets/assignable-staff"
      );
      if (error) fail(error, "Couldn't load assignable staff.");
      return data;
    },

    async respond(id, input: SupportRespondInput) {
      const { data, error } = await apiClient.post<SupportRespondInput, SupportTicketDetail>(
        `/admin/support/tickets/${encodeURIComponent(id)}/reply`,
        input
      );
      if (error) fail(error, "Couldn't send the reply.");
      return data.ticket;
    },

    async addInternalNote(id, note) {
      const { data, error } = await apiClient.post<{ note: string }, SupportTicketDetail>(
        `/admin/support/tickets/${encodeURIComponent(id)}/note`,
        { note }
      );
      if (error) fail(error, "Couldn't add the note.");
      return data.ticket;
    },

    async assign(id, input: SupportAssignInput) {
      const { data, error } = await apiClient.patch<SupportAssignInput, SupportTicketDetail>(
        `/admin/support/tickets/${encodeURIComponent(id)}/assign`,
        input
      );
      if (error) fail(error, "Couldn't assign the ticket.");
      return data.ticket;
    },

    async setStatus(id, input: SupportSetStatusInput) {
      const { data, error } = await apiClient.patch<SupportSetStatusInput, SupportTicketDetail>(
        `/admin/support/tickets/${encodeURIComponent(id)}/status`,
        input
      );
      if (error) fail(error, "Couldn't update the status.");
      return data.ticket;
    },

    async setPriority(id, input: SupportSetPriorityInput) {
      const { data, error } = await apiClient.patch<SupportSetPriorityInput, SupportTicketDetail>(
        `/admin/support/tickets/${encodeURIComponent(id)}/priority`,
        input
      );
      if (error) fail(error, "Couldn't update the priority.");
      return data.ticket;
    },

    async escalate(id, input: SupportEscalateInput) {
      const { data, error } = await apiClient.patch<SupportEscalateInput, SupportTicketDetail>(
        `/admin/support/tickets/${encodeURIComponent(id)}/escalate`,
        input
      );
      if (error) fail(error, "Couldn't escalate the ticket.");
      return data.ticket;
    },
  };
}
