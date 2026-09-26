import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  CampusActivityEvent,
  CampusStatusCounts,
  ManagedCampus,
  ManagedCampusDetail,
  Paginated,
} from "@/types/admin";
import type {
  AdminCampusManagementService,
  ManagedCampusListQuery,
} from "./campus-management.service";

/**
 * Live /admin/campuses service backed by AdminCampusesController
 * (GET /admin/campuses, /counts, /states, /:id, /:id/activity;
 * POST /; PATCH /:id and /:id/status).
 *
 * Campus admins are read-only here: they are ADMIN-role users scoped to a
 * campus, so they're managed from the Users console, not by inviting an
 * email from this page.
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
    throw new Error("You don't have permission to do that.");
  }
  throw new Error(error.message || fallback);
}

function queryString(query: ManagedCampusListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("state", query.state);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiCampusManagementService(): AdminCampusManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedCampus>>(
        `/admin/campuses${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load campuses.");
      const page: Paginated<ManagedCampus> = {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      };
      return page;
    },

    async getById(id) {
      const { data, error } = await apiClient.get<ManagedCampusDetail>(
        `/admin/campuses/${id}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the campus.");
      return data;
    },

    async getCounts() {
      const { data, error } = await apiClient.get<CampusStatusCounts>(
        "/admin/campuses/counts"
      );
      if (error) fail(error, "Couldn't load campus counts.");
      return data;
    },

    async getStates() {
      const { data, error } = await apiClient.get<string[]>(
        "/admin/campuses/states"
      );
      if (error) fail(error, "Couldn't load states.");
      return data;
    },

    async create(input) {
      const { data, error } = await apiClient.post<
        Record<string, unknown>,
        ManagedCampus
      >("/admin/campuses", { ...input });
      if (error) fail(error, "Couldn't create the campus.");
      return data;
    },

    async update(id, patch) {
      const { data, error } = await apiClient.patch<
        Record<string, unknown>,
        ManagedCampus
      >(`/admin/campuses/${id}`, { ...patch });
      if (error) fail(error, "Couldn't update the campus.");
      return data;
    },

    async setStatus(id, status) {
      const { data, error } = await apiClient.patch<
        Record<string, string>,
        ManagedCampus
      >(`/admin/campuses/${id}/status`, { status });
      if (error) fail(error, "Couldn't change the campus status.");
      return data;
    },

    async getActivity(id) {
      const { data, error } = await apiClient.get<CampusActivityEvent[]>(
        `/admin/campuses/${id}/activity`
      );
      if (error) fail(error, "Couldn't load activity.");
      return data;
    },
  };
}
