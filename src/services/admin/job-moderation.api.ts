import { apiClient, type ApiError } from "@/lib/api-client";
import type { CvLink } from "@/services/job-applications";
import type {
  AdminApplicationDetail,
  AdminJobReport,
  ResolveReportInput,
  ResolveReportResult,
} from "@/types/job-moderation";
import type {
  AdminJobModerationService,
  JobReportsPage,
  JobReportsQuery,
} from "./job-moderation.service";

/**
 * Live moderation service over AdminJobModerationController
 * (/admin/job-reports and /admin/applications). One backend permission covers
 * all of it: the one that lets an admin take a posting down.
 */

interface BackendReports {
  items: AdminJobReport[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  counts: { open: number; resolved: number };
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

function queryString(query: JobReportsQuery): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.targetType) params.set("targetType", query.targetType);
  if (query.jobId) params.set("jobId", query.jobId);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("limit", String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiJobModerationService(): AdminJobModerationService {
  return {
    async listReports(query = {}) {
      const { data, error } = await apiClient.get<BackendReports>(
        `/admin/job-reports${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load the reports.");
      const page: JobReportsPage = {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
        counts: data.counts,
      };
      return page;
    },

    async getReport(id) {
      const { data, error } = await apiClient.get<AdminJobReport>(`/admin/job-reports/${id}`);
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the report.");
      return data;
    },

    async resolveReport(id, input) {
      const { data, error } = await apiClient.post<ResolveReportInput, ResolveReportResult>(
        `/admin/job-reports/${id}/resolve`,
        input
      );
      if (error) fail(error, "Couldn't resolve the report.");
      return data;
    },

    async getApplication(id) {
      const { data, error } = await apiClient.get<AdminApplicationDetail>(
        `/admin/applications/${id}`
      );
      if (error) fail(error, "Couldn't load the application.");
      return data;
    },

    async getApplicationCvLink(id) {
      const { data, error } = await apiClient.post<undefined, CvLink>(
        `/admin/applications/${id}/cv-link`
      );
      if (error) fail(error, "Couldn't open the CV.");
      return data;
    },
  };
}
