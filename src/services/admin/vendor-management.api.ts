import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  ManagedVendor,
  ManagedVendorDetail,
  Paginated,
  VendorActivityEvent,
  VendorStatusCounts,
} from "@/types/admin";
import type {
  AdminVendorManagementService,
  ManagedVendorListQuery,
} from "./vendor-management.service";

/**
 * Live /admin/vendors service.
 *
 * Reads come from AdminVendorsController (GET /admin/vendors, /counts,
 * /categories, /:id, /:id/activity). Lifecycle actions use the existing
 * audited endpoints: PATCH /admin/vendors/:id/{approve,reject,suspend,
 * reactivate} for verification and suspension, and PATCH /:id/status
 * (ACTIVE | INACTIVE) to deactivate a store or bring it back.
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

function queryString(query: ManagedVendorListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("queue", query.queue);
  set("campusId", query.campusId);
  set("category", query.category);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Campuses for the directory filter: [{ id, label: "FUTA" }]. */
export async function fetchVendorCampusOptions(): Promise<
  { id: string; label: string }[]
> {
  const { data, error } = await apiClient.get<{ id: string; label: string }[]>(
    "/admin/vendors/campuses"
  );
  if (error) fail(error, "Couldn't load campuses.");
  return data;
}

async function fetchDetail(id: string): Promise<ManagedVendorDetail | null> {
  const { data, error } = await apiClient.get<ManagedVendorDetail>(
    `/admin/vendors/${id}`
  );
  if (error?.status === 404) return null;
  if (error) fail(error, "Couldn't load the store.");
  return data;
}

/** Approve or reject one KYC document (PATCH /admin/vendors/:id/documents/:docId/...). */
export async function reviewVendorDocument(
  vendorId: string,
  documentId: string,
  decision: "approve" | "reject",
  reason?: string
): Promise<ManagedVendor> {
  if (decision === "reject" && !reason?.trim()) {
    throw new Error("A reason is required to reject a document.");
  }
  await patch(
    `/admin/vendors/${vendorId}/documents/${documentId}/${decision}`,
    decision === "reject" ? { reason: reason!.trim() } : {},
    "Couldn't review the document."
  );
  return currentVendor(vendorId);
}

async function currentVendor(id: string): Promise<ManagedVendor> {
  const detail = await fetchDetail(id);
  if (!detail) throw new Error("Store not found. It may have been removed.");
  return detail.vendor;
}

async function patch(
  path: string,
  body: Record<string, string>,
  fallback: string
): Promise<void> {
  const { error } = await apiClient.patch<Record<string, string>, unknown>(
    path,
    body
  );
  if (error) fail(error, fallback);
}

export function createApiVendorManagementService(): AdminVendorManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedVendor>>(
        `/admin/vendors${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load stores.");
      const page: Paginated<ManagedVendor> = {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      };
      return page;
    },

    getById: (id) => fetchDetail(id),

    async getCounts() {
      const { data, error } = await apiClient.get<VendorStatusCounts>(
        "/admin/vendors/counts"
      );
      if (error) fail(error, "Couldn't load store counts.");
      return data;
    },

    async getCategories() {
      const { data, error } = await apiClient.get<string[]>(
        "/admin/vendors/categories"
      );
      if (error) fail(error, "Couldn't load categories.");
      return data;
    },

    async approve(id) {
      await patch(`/admin/vendors/${id}/approve`, {}, "Couldn't approve the store.");
      return currentVendor(id);
    },

    async reject(id, reason) {
      if (!reason.trim()) throw new Error("A rejection reason is required.");
      await patch(
        `/admin/vendors/${id}/reject`,
        { reason: reason.trim() },
        "Couldn't reject the store."
      );
      return currentVendor(id);
    },

    async suspend(id, _ctx, reason) {
      if (!reason?.trim()) throw new Error("A suspension reason is required.");
      await patch(
        `/admin/vendors/${id}/suspend`,
        { reason: reason.trim() },
        "Couldn't suspend the store."
      );
      return currentVendor(id);
    },

    async activate(id) {
      const vendor = await currentVendor(id);
      if (vendor.storeStatus === "active") {
        throw new Error("Store is already active.");
      }
      if (vendor.storeStatus === "suspended") {
        await patch(
          `/admin/vendors/${id}/reactivate`,
          {},
          "Couldn't reactivate the store."
        );
      } else {
        await patch(
          `/admin/vendors/${id}/status`,
          { status: "ACTIVE" },
          "Couldn't activate the store."
        );
      }
      return currentVendor(id);
    },

    async deactivate(id) {
      await patch(
        `/admin/vendors/${id}/status`,
        { status: "INACTIVE" },
        "Couldn't deactivate the store."
      );
      return currentVendor(id);
    },

    async getActivity(id) {
      const { data, error } = await apiClient.get<VendorActivityEvent[]>(
        `/admin/vendors/${id}/activity`
      );
      if (error) fail(error, "Couldn't load activity.");
      return data;
    },
  };
}
