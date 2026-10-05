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
  SupportTicketCategory,
  SupportTicketDetail,
} from "@/types/admin";

function fail(error: ApiError, fallback: string): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to continue.");
  }
  throw new Error(error.message || fallback);
}

function normalizeTicket<T extends SupportTicket>(ticket: T): T {
  if (!ticket) return ticket;
  return {
    ...ticket,
    category: ((ticket.category || "other").toLowerCase()) as SupportTicketCategory,
    status: ((ticket.status || "open").toLowerCase()) as typeof ticket.status,
  };
}

function normalizeDetail(detail: SupportTicketDetail | null): SupportTicketDetail | null {
  if (!detail || !detail.ticket) return detail;
  return {
    ...detail,
    ticket: normalizeTicket(detail.ticket),
  };
}

import { getCurrentAuthUser } from "@/lib/current-user-store";
import { pushUserNotification } from "@/services/notifications";

export const supportService: SupportCustomerService = {
  async listMine() {
    const { data, error } = await apiClient.get<SupportTicket[]>("/support/tickets");
    if (error) fail(error, "Couldn't load your support requests.");
    return (data || []).map(normalizeTicket);
  },

  async getMine(_userId, id) {
    const { data, error } = await apiClient.get<SupportTicketDetail>(
      `/support/tickets/${encodeURIComponent(id)}`
    );
    if (error?.status === 404) return null;
    if (error) fail(error, "Couldn't load this request.");
    return normalizeDetail(data);
  },

  async createForCustomer(_userId, input: SupportCustomerCreateInput) {
    // 1. Ensure category is uppercase enum (ACCOUNT, MARKETPLACE, PAYMENTS, etc.)
    const categoryUpper = (input.category || "OTHER").toUpperCase();

    // 2. Format description with related reference if provided
    let description = input.description.trim();
    if (input.related) {
      const refLabel =
        input.related.kind === "order"
          ? `Order #${input.related.id}`
          : `Transaction Ref: ${input.related.id}`;
      description = `${description}\n\n[Related Reference: ${refLabel}]`;
    }

    // 3. Build strictly whitelisted payload matching backend DTO (no `related` field)
    const payload: {
      category: string;
      subject: string;
      description: string;
      attachments?: typeof input.attachments;
    } = {
      category: categoryUpper,
      subject: input.subject.trim(),
      description,
    };

    if (input.attachments && input.attachments.length > 0) {
      payload.attachments = input.attachments;
    }

    const { data, error } = await apiClient.post<typeof payload, SupportTicketDetail>(
      "/support/tickets",
      payload
    );
    if (error) fail(error, "Couldn't submit your request.");

    const normalized = normalizeDetail(data)!;
    const ticketId = normalized?.ticket?.id || "new";
    const effectiveUserId = _userId || getCurrentAuthUser()?.id || "u1";

    // 4. Trigger in-app notification for Customer support bell
    pushUserNotification({
      userId: effectiveUserId,
      type: "system",
      category: "account",
      title: "Support Request Received",
      message: `Your request "${input.subject}" has been submitted (#${ticketId}).`,
      actionUrl: `/support/${ticketId}`,
    });

    if (effectiveUserId !== "u1") {
      pushUserNotification({
        userId: "u1",
        type: "system",
        category: "account",
        title: "Support Request Received",
        message: `Your request "${input.subject}" has been submitted (#${ticketId}).`,
        actionUrl: `/support/${ticketId}`,
      });
    }

    // 5. Trigger in-app notification for Admin support bell
    pushUserNotification({
      userId: "admin",
      type: "system",
      category: "account",
      title: "New Support Ticket",
      message: `Customer opened support ticket #${ticketId}: "${input.subject}"`,
      actionUrl: `/admin/support/${ticketId}`,
    });

    return normalized;
  },

  async replyForCustomer(_userId, id, input: SupportCustomerReplyInput) {
    const { data, error } = await apiClient.post<SupportCustomerReplyInput, SupportTicketDetail>(
      `/support/tickets/${encodeURIComponent(id)}/reply`,
      input
    );
    if (error?.status === 404) return null;
    if (error) fail(error, "Couldn't send your reply.");

    const effectiveUserId = _userId || getCurrentAuthUser()?.id || "u1";
    const snippet = input.body.length > 70 ? `${input.body.slice(0, 70)}…` : input.body;

    // Trigger in-app notification for customer bell
    pushUserNotification({
      userId: effectiveUserId,
      type: "message",
      category: "messages",
      title: "Support Message Sent",
      message: `Your message was sent on ticket #${id}.`,
      actionUrl: `/support/${id}`,
    });

    if (effectiveUserId !== "u1") {
      pushUserNotification({
        userId: "u1",
        type: "message",
        category: "messages",
        title: "Support Message Sent",
        message: `Your message was sent on ticket #${id}.`,
        actionUrl: `/support/${id}`,
      });
    }

    // Trigger in-app notification for admin bell
    pushUserNotification({
      userId: "admin",
      type: "message",
      category: "messages",
      title: `Customer Message on Ticket #${id}`,
      message: `New message on ticket #${id}: "${snippet}"`,
      actionUrl: `/admin/support/${id}`,
    });

    return normalizeDetail(data);
  },
};

export type {
  SupportCustomerService,
  SupportTicketDetail,
  SupportTicket,
  SupportMessage,
  SupportAttachment,
} from "@/types/admin";
