/**
 * Customer support portal service — the CUSTOMER side of Module 56.
 *
 * Live HTTP client over the real ticket store (GET/POST /support/tickets),
 * ownership enforced server-side by the authenticated session. The admin
 * console talks to the same tickets via /admin/support/tickets — one
 * database, one record, one lifecycle — but each side now goes through its
 * own real endpoint rather than sharing an in-memory singleton.
 */
import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  SupportCustomerCreateInput,
  SupportCustomerReplyInput,
  SupportCustomerService,
  SupportTicket,
  SupportTicketDetail,
} from "@/types/admin";

function fail(error: ApiError, fallback: string): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to continue.");
  }
  throw new Error(error.message || fallback);
}

export const supportService: SupportCustomerService = {
  async listMine() {
    const { data, error } = await apiClient.get<SupportTicket[]>("/support/tickets");
    if (error) fail(error, "Couldn't load your support requests.");
    return data;
  },

  async getMine(_userId, id) {
    const { data, error } = await apiClient.get<SupportTicketDetail>(
      `/support/tickets/${encodeURIComponent(id)}`
    );
    if (error?.status === 404) return null;
    if (error) fail(error, "Couldn't load this request.");
    return data;
  },

  async createForCustomer(_userId, input: SupportCustomerCreateInput) {
    const { data, error } = await apiClient.post<SupportCustomerCreateInput, SupportTicketDetail>(
      "/support/tickets",
      input
    );
    if (error) fail(error, "Couldn't submit your request.");
    return data;
  },

  async replyForCustomer(_userId, id, input: SupportCustomerReplyInput) {
    const { data, error } = await apiClient.post<SupportCustomerReplyInput, SupportTicketDetail>(
      `/support/tickets/${encodeURIComponent(id)}/reply`,
      input
    );
    if (error?.status === 404) return null;
    if (error) fail(error, "Couldn't send your reply.");
    return data;
  },
};

export type {
  SupportCustomerService,
  SupportTicketDetail,
  SupportTicket,
  SupportMessage,
  SupportAttachment,
} from "@/types/admin";
