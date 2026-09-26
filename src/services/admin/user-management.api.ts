import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  ManagedUser,
  ManagedUserDetail,
  ManagedUserListItem,
  ManagedUserStatus,
  Paginated,
  UserActivityEvent,
  UserStatusCounts,
} from "@/types/admin";
import {
  getUserActionPolicy,
  type AdminUserManagementService,
  type ManagedUserListQuery,
  type UserCommandFailure,
  type UserReadFailure,
} from "./user-management.service";

/**
 * Live /admin/users service backed by the NestJS AdminUsersController
 * (GET /admin/users, /counts, /:id, /:id/activity; PATCH /:id and
 * /:id/status; POST /:id/reset-state). The backend is the authority for who
 * may manage whom; `getUserActionPolicy` only hides controls that would be
 * rejected.
 */

/** Console status -> backend UserStatus enum. */
const STATUS_TO_BACKEND: Record<ManagedUserStatus, string> = {
  active: "ACTIVE",
  suspended: "SUSPENDED",
  pending_verification: "PENDING_VERIFICATION",
  deactivated: "INACTIVE",
};

const STATUS_VERB: Record<ManagedUserStatus, string> = {
  active: "activated",
  suspended: "suspended",
  pending_verification: "moved to pending verification",
  deactivated: "deactivated",
};

interface BackendPage<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function readFailure(error: ApiError): UserReadFailure {
  if (error.status === 404) {
    return { ok: false, code: "NOT_FOUND", message: "User not found." };
  }
  if (error.status === 403) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: error.message || "You don't have access to this account.",
    };
  }
  throw new Error(error.message || "Couldn't load the account.");
}

function commandFailure(error: ApiError): UserCommandFailure {
  const message = error.message || "That change couldn't be saved.";
  switch (error.status) {
    case 404:
      return { ok: false, code: "NOT_FOUND", message: "User not found." };
    case 403:
      return {
        ok: false,
        code: message.includes("own account") ? "SELF_ACTION" : "FORBIDDEN",
        message,
      };
    case 409:
      return { ok: false, code: "EMAIL_TAKEN", message };
    default:
      return { ok: false, code: "REQUEST_FAILED", message };
  }
}

function queryString(query: ManagedUserListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("role", query.role);
  set("campusId", query.campusId);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** The directory never returns wallet balances for list rows. */
function withWallet(row: ManagedUserListItem): ManagedUser {
  return { ...row, walletBalance: 0 };
}

/** Campuses for the directory filter: [{ id, label: "FUTA" }]. */
export async function fetchUserCampusOptions(): Promise<
  { id: string; label: string }[]
> {
  const { data, error } = await apiClient.get<{ id: string; label: string }[]>(
    "/admin/users/campuses"
  );
  if (error) throw new Error(error.message || "Couldn't load campuses.");
  return data;
}

export function createApiUserManagementService(): AdminUserManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedUserListItem>>(
        `/admin/users${queryString(query)}`
      );
      if (error) throw new Error(error.message || "Couldn't load users.");
      const page: Paginated<ManagedUserListItem> = {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      };
      return page;
    },

    async getById(id, ctx) {
      const { data, error } = await apiClient.get<ManagedUserDetail>(
        `/admin/users/${id}`
      );
      if (error) return readFailure(error);
      return {
        ok: true,
        detail: data,
        policy: getUserActionPolicy(ctx.actor, data.user),
      };
    },

    async getCounts() {
      const { data, error } = await apiClient.get<UserStatusCounts>(
        "/admin/users/counts"
      );
      if (error) throw new Error(error.message || "Couldn't load user counts.");
      return data;
    },

    async update(id, patch) {
      const body: Record<string, string> = {};
      if (typeof patch.name === "string") body.name = patch.name.trim();
      if (typeof patch.email === "string") body.email = patch.email.trim();
      if (typeof patch.phone === "string" && patch.phone.trim()) {
        body.phone = patch.phone.trim().replace(/[\s()-]/g, "");
      }
      if (Object.keys(body).length === 0) {
        return {
          ok: false,
          code: "REQUEST_FAILED",
          message: "There was nothing to change.",
        };
      }
      const { data, error } = await apiClient.patch<
        Record<string, string>,
        ManagedUserListItem
      >(`/admin/users/${id}`, body);
      if (error) return commandFailure(error);
      return { ok: true, user: withWallet(data), message: "Profile updated." };
    },

    async setStatus(id, status) {
      const { error } = await apiClient.patch<
        Record<string, string>,
        { id: string; status: string }
      >(`/admin/users/${id}/status`, { status: STATUS_TO_BACKEND[status] });
      if (error) return commandFailure(error);
      const detail = await apiClient.get<ManagedUserDetail>(`/admin/users/${id}`);
      if (detail.error) return commandFailure(detail.error);
      return {
        ok: true,
        user: detail.data.user,
        message: `Account ${STATUS_VERB[status]}.`,
      };
    },

    async resetAccountState(id) {
      const { data, error } = await apiClient.post<
        Record<string, never>,
        ManagedUserListItem
      >(`/admin/users/${id}/reset-state`, {});
      if (error) return commandFailure(error);
      return {
        ok: true,
        user: withWallet(data),
        message: "Account state reset.",
      };
    },

    async getActivity(id) {
      const { data, error } = await apiClient.get<UserActivityEvent[]>(
        `/admin/users/${id}/activity`
      );
      if (error) return readFailure(error);
      return { ok: true, items: data };
    },
  };
}
