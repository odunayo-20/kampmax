import { apiClient, type ApiError } from "@/lib/api-client";
import type { AdminCampusPlace } from "@/types/campus-places";
import type {
  AdminCampusPlacesService,
  CampusPlacesPage,
  CampusPlacesQuery,
} from "./campus-places.service";

/** Live service over AdminCampusPlacesController (/admin/campus-places). */

interface BackendPage {
  items: AdminCampusPlace[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  counts: CampusPlacesPage["counts"];
}

function fail(error: ApiError, fallback: string): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to continue.");
  }
  if (error.status === 403) {
    throw new Error("You don't have permission to do that.");
  }
  if (error.status === 404) {
    throw new Error("That place no longer exists. It may have been deleted.");
  }
  // 400 and 409 carry the backend's own explanation (too far from campus, already on the map...).
  throw new Error(error.message || fallback);
}

function queryString(query: CampusPlacesQuery): string {
  const params = new URLSearchParams();
  if (query.campusId) params.set("campusId", query.campusId);
  if (query.status) params.set("status", query.status);
  if (query.type) params.set("type", query.type);
  if (query.search?.trim()) params.set("q", query.search.trim());
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("limit", String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiCampusPlacesService(): AdminCampusPlacesService {
  const base = "/admin/campus-places";
  const one = (id: string) => `${base}/${encodeURIComponent(id)}`;

  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage>(`${base}${queryString(query)}`);
      if (error) fail(error, "Couldn't load the places.");
      const page: CampusPlacesPage = {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
        counts: data.counts,
      };
      return page;
    },

    async create(input) {
      // An empty description is left out rather than sent blank.
      const { data, error } = await apiClient.post<
        Omit<typeof input, "description"> & { description?: string },
        AdminCampusPlace
      >(base, { ...input, description: input.description.trim() || undefined });
      if (error) fail(error, "Couldn't add the place.");
      return data;
    },

    async update(id, patch) {
      const { data, error } = await apiClient.patch<typeof patch, AdminCampusPlace>(one(id), patch);
      if (error) fail(error, "Couldn't save the place.");
      return data;
    },

    async approve(id) {
      const { data, error } = await apiClient.post<Record<string, never>, AdminCampusPlace>(
        `${one(id)}/approve`,
        {}
      );
      if (error) fail(error, "Couldn't approve the suggestion.");
      return data;
    },

    async reject(id, reason) {
      const { data, error } = await apiClient.post<{ reason: string }, AdminCampusPlace>(
        `${one(id)}/reject`,
        { reason }
      );
      if (error) fail(error, "Couldn't reject the suggestion.");
      return data;
    },

    async remove(id) {
      const { error } = await apiClient.delete(one(id));
      if (error) fail(error, "Couldn't delete the place.");
    },
  };
}
