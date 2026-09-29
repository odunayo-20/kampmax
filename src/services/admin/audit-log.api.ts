import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  AdminAuditLogService,
  ManagedAuditLogActor,
  ManagedAuditLogChainStatus,
  ManagedAuditLogEntry,
  ManagedAuditLogMetrics,
  ManagedAuditLogQuery,
  Paginated,
} from "@/types/admin";

/**
 * Live audit-log service backed by AuditService via AdminController
 * (GET /admin/audit-logs, /metrics, /actors, /verify, /:id). Backs both
 * /admin/audit-logs and /admin/security — there is no separate security
 * event store; the Security Center is a re-slice of this same real,
 * tamper-evident audit trail.
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
    throw new Error("You don't have permission to view audit logs.");
  }
  throw new Error(error.message || fallback);
}

function queryString(query: ManagedAuditLogQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | boolean | null | undefined) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("action", query.action);
  set("resourceType", query.resourceType);
  set("actorId", query.actorId);
  set("severity", query.severity);
  set("result", query.result);
  set("securityOnly", query.securityOnly);
  set("dateFrom", query.dateFrom);
  set("dateTo", query.dateTo);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiAuditLogService(): AdminAuditLogService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedAuditLogEntry>>(
        `/admin/audit-logs${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load audit logs.");
      return {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      } satisfies Paginated<ManagedAuditLogEntry>;
    },

    async getById(id) {
      const { data, error } = await apiClient.get<ManagedAuditLogEntry>(
        `/admin/audit-logs/${encodeURIComponent(id)}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the audit log entry.");
      return data;
    },

    async getMetrics() {
      const { data, error } = await apiClient.get<ManagedAuditLogMetrics>("/admin/audit-logs/metrics");
      if (error) fail(error, "Couldn't load audit metrics.");
      return data;
    },

    async getActorOptions() {
      const { data, error } = await apiClient.get<ManagedAuditLogActor[]>("/admin/audit-logs/actors");
      if (error) fail(error, "Couldn't load audit actors.");
      return data;
    },

    async verifyChain() {
      const { data, error } = await apiClient.get<ManagedAuditLogChainStatus>("/admin/audit-logs/verify");
      if (error) fail(error, "Couldn't verify the audit chain.");
      return data;
    },
  };
}
