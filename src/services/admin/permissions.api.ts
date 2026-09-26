import { apiClient, type ApiError } from "@/lib/api-client";

/**
 * Live /admin/permissions client (AdminPermissionsController).
 *
 * Roles and permissions are the real rows the API's permission guard reads,
 * so a saved change is enforced on the next request. Only SUPER_ADMIN can
 * change a role (`admin.roles.manage`), and only the staff roles ADMIN,
 * MODERATOR and SUPPORT are editable.
 */

export interface RoleSummary {
  /** Backend role name, e.g. "ADMIN". */
  key: string;
  name: string;
  description: string;
  membersCount: number;
  permissionsCount: number;
  totalPermissions: number;
  editable: boolean;
  lockedReason: string | null;
}

export interface RoleDetail extends RoleSummary {
  /** Permission slugs the role currently holds. */
  granted: string[];
  /** Slugs the role holds by default (used by "Reset to defaults"). */
  defaults: string[];
}

export interface PermissionCatalogItem {
  slug: string;
  name: string;
  module: string;
  description: string;
  /** Reserved for Super Admin; can never be granted to another role. */
  reserved: boolean;
}

function fail(error: ApiError, fallback: string): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to continue.");
  }
  if (error.status === 403) {
    throw new Error(error.message || "Only a Super Admin can change roles.");
  }
  throw new Error(error.message || fallback);
}

export const permissionsService = {
  async listRoles(): Promise<RoleSummary[]> {
    const { data, error } = await apiClient.get<RoleSummary[]>(
      "/admin/permissions/roles"
    );
    if (error) fail(error, "Couldn't load roles.");
    return data;
  },

  async getRole(key: string): Promise<RoleDetail | null> {
    const { data, error } = await apiClient.get<RoleDetail>(
      `/admin/permissions/roles/${encodeURIComponent(key)}`
    );
    if (error?.status === 404) return null;
    if (error) fail(error, "Couldn't load the role.");
    return data;
  },

  async getCatalog(): Promise<PermissionCatalogItem[]> {
    const { data, error } = await apiClient.get<PermissionCatalogItem[]>(
      "/admin/permissions/catalog"
    );
    if (error) fail(error, "Couldn't load the permission catalog.");
    return data;
  },

  async setPermissions(key: string, slugs: string[]): Promise<RoleDetail> {
    const { data, error } = await apiClient.put<
      { slugs: string[] },
      RoleDetail
    >(`/admin/permissions/roles/${encodeURIComponent(key)}/permissions`, {
      slugs,
    });
    if (error) fail(error, "Couldn't save the permissions.");
    return data;
  },

  async reset(key: string): Promise<RoleDetail> {
    const { data, error } = await apiClient.post<
      Record<string, never>,
      RoleDetail
    >(`/admin/permissions/roles/${encodeURIComponent(key)}/reset`, {});
    if (error) fail(error, "Couldn't reset the role.");
    return data;
  },
};
