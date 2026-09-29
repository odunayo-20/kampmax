import { apiClient } from "@/lib/api-client";
import type { Campus, CampusStatus, ManagedCampus, Paginated } from "@/types/admin";
import type { AdminCampusService } from "./campuses.service";

function toCampus(c: ManagedCampus): Campus {
  return {
    id: c.id,
    name: c.name,
    shortName: c.shortName || c.name,
    city: c.city || "",
    state: c.state || "",
    status: (c.status === "active" ? "active" : "inactive") as CampusStatus,
    studentCount: c.usersCount ?? 0,
    activeVendors: c.vendorsCount ?? 0,
    activeListings: c.productsCount ?? 0,
    ordersThisMonth: c.ordersCount ?? 0,
    gmvThisMonth: c.revenue ?? 0,
    launchDate: c.createdAt,
  };
}

/**
 * Live /admin campuses service backed by the real AdminCampusesController
 * (GET /admin/campuses, /:id, PATCH /:id/status).
 */
export function createApiCampusService(): AdminCampusService {
  return {
    async list(): Promise<Campus[]> {
      const { data, error } = await apiClient.get<Paginated<ManagedCampus>>(
        "/admin/campuses?limit=100&status=active"
      );
      if (error || !data?.items) return [];

      return data.items.map(toCampus);
    },

    async getById(id: string): Promise<Campus | null> {
      const { data, error } = await apiClient.get<ManagedCampus>(
        `/admin/campuses/${encodeURIComponent(id)}`
      );
      if (error || !data) return null;

      return toCampus(data);
    },

    async setStatus(id: string, status: CampusStatus): Promise<Campus> {
      const { data, error } = await apiClient.patch<Record<string, unknown>, ManagedCampus>(
        `/admin/campuses/${encodeURIComponent(id)}/status`,
        { status }
      );
      if (error || !data) throw new Error(error?.message || "Failed to update campus status");

      return toCampus(data);
    },
  };
}
