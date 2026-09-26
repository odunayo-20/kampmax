import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  ManagedVerificationCounts,
  ManagedVerificationDetail,
  ManagedVerificationListQuery,
  ManagedVerificationRow,
  ManagedVerificationType,
  Paginated,
} from "@/types/admin";
import type { AdminVerificationManagementService } from "./verification-management.service";

/**
 * Live /admin/verifications service.
 *
 * Reads come from AdminVerificationsController: one normalized row per
 * vendor, employer and freelancer, ids shaped `<type>:<uuid>`. Decisions are
 * delegated to the applicant's own console endpoint so its audit trail and
 * emails stay in one place:
 *   vendor     -> PATCH /admin/vendors/:id/{approve,reject}
 *   employer   -> PATCH /admin/employers/:id/{approve,reject}
 *   freelancer -> PATCH /admin/freelancers/:id/{activate,deactivate}
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

function queryString(query: ManagedVerificationListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("applicantType", query.applicantType);
  set("verificationType", query.verificationType);
  set("campusId", query.campusId);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Route params may arrive URL-encoded ("vendor%3A…"). */
function normalizeId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

function parseId(id: string): { type: string; applicantId: string } {
  const match = /^(vendor|employer|freelancer):(.+)$/i.exec(normalizeId(id));
  if (!match) throw new Error("Verification not found.");
  return { type: match[1].toLowerCase(), applicantId: match[2] };
}

async function fetchDetail(id: string): Promise<ManagedVerificationDetail | null> {
  const { data, error } = await apiClient.get<ManagedVerificationDetail>(
    `/admin/verifications/${encodeURIComponent(normalizeId(id))}`
  );
  if (error?.status === 404) return null;
  if (error) fail(error, "Couldn't load the verification.");
  return data;
}

async function decide(
  id: string,
  decision: "approve" | "reject",
  reason?: string
): Promise<ManagedVerificationRow> {
  const { type, applicantId } = parseId(id);
  const base = `/admin/${type === "freelancer" ? "freelancers" : `${type}s`}/${applicantId}`;
  const action =
    type === "freelancer"
      ? decision === "approve"
        ? "activate"
        : "deactivate"
      : decision;
  const body: Record<string, string> =
    decision === "reject" ? { reason: reason ?? "" } : {};
  const { error } = await apiClient.patch<Record<string, string>, unknown>(
    `${base}/${action}`,
    body
  );
  if (error) {
    fail(
      error,
      decision === "approve"
        ? "Couldn't approve this applicant."
        : "Couldn't reject this applicant."
    );
  }
  const detail = await fetchDetail(id);
  if (!detail) throw new Error("Verification not found.");
  return detail.verification;
}

export function createApiVerificationManagementService(): AdminVerificationManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<
        BackendPage<ManagedVerificationRow>
      >(`/admin/verifications${queryString(query)}`);
      if (error) fail(error, "Couldn't load verifications.");
      const page: Paginated<ManagedVerificationRow> = {
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
      const { data, error } = await apiClient.get<ManagedVerificationCounts>(
        "/admin/verifications/counts"
      );
      if (error) fail(error, "Couldn't load verification counts.");
      return data;
    },

    async getTypes() {
      const { data, error } = await apiClient.get<ManagedVerificationType[]>(
        "/admin/verifications/types"
      );
      if (error) fail(error, "Couldn't load verification types.");
      return data;
    },

    approve: (id) => decide(id, "approve"),

    async reject(id, reason) {
      if (!reason.trim()) throw new Error("A rejection reason is required.");
      return decide(id, "reject", reason.trim());
    },
  };
}
