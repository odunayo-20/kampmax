import { apiClient, type ApiError } from "@/lib/api-client";
import type { AdminContactMessage } from "@/types/contact-messages";
import type {
  AdminContactMessagesService,
  ContactMessagesPage,
  ContactMessagesQuery,
} from "./contact-messages.service";

/** Live service over AdminContactController (/admin/contact-messages). */

interface BackendPage {
  items: AdminContactMessage[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  counts: { new: number; handled: number };
}

function fail(error: ApiError, fallback: string): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to continue.");
  }
  if (error.status === 403) {
    throw new Error("You don't have permission to do that.");
  }
  if (error.status === 404) {
    throw new Error("That message no longer exists. It may have been deleted.");
  }
  throw new Error(error.message || fallback);
}

function queryString(query: ContactMessagesQuery): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.inquiryType) params.set("inquiryType", query.inquiryType);
  if (query.search?.trim()) params.set("q", query.search.trim());
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("limit", String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiContactMessagesService(): AdminContactMessagesService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage>(
        `/admin/contact-messages${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load the messages.");
      const page: ContactMessagesPage = {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
        counts: data.counts,
      };
      return page;
    },

    async setHandled(id, handled) {
      const { data, error } = await apiClient.patch<{ handled: boolean }, AdminContactMessage>(
        `/admin/contact-messages/${encodeURIComponent(id)}/handled`,
        { handled }
      );
      if (error) fail(error, "Couldn't update the message.");
      return data;
    },

    async remove(id) {
      const { error } = await apiClient.delete(
        `/admin/contact-messages/${encodeURIComponent(id)}`
      );
      if (error) fail(error, "Couldn't delete the message.");
    },
  };
}
