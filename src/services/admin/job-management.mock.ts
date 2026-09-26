// ============================================================
// JOB MANAGEMENT MOCK (Module 40) - kept for service tests
// ============================================================
//
// Read-only admin service over the real jobs marketplace. Per the
// Module 40 API-contract audit, the opportunity store (the backend
// surrogate) exposes NO admin moderation transitions and NO job-reports
// store, so this console intentionally implements no mutations — every
// pipeline the backend does not provide is surfaced as an honest gap.
// ============================================================

import type {
  ManagedJobActivityEvent,
  ManagedJobDetail,
  ManagedJobFacets,
  ManagedJobListQuery,
  ManagedJobRow,
  ManagedJobStatusCounts,
  ManagedJobSortField,
  Paginated,
} from "@/types/admin";
import type { AdminJobManagementService } from "./job-management.service";
import {
  buildJobDataset,
  computeJobCounts,
  computeJobFacets,
  filterJobs,
} from "@/data/admin/job-management";

export function createJobManagementService(): AdminJobManagementService {
  return {
    async list(query = {}) {
      const { rows } = buildJobDataset();
      const result = filterJobs(rows, query);
      return {
        items: result.items,
        total: result.total,
        page: result.page,
        pageSize: Math.max(1, query.pageSize ?? 10),
        totalPages: result.totalPages,
      };
    },

    async getById(id) {
      const { details } = buildJobDataset();
      return details.get(id) ?? null;
    },

    async getCounts() {
      const { rows } = buildJobDataset();
      return computeJobCounts(rows);
    },

    async getFacets() {
      const { rows } = buildJobDataset();
      return computeJobFacets(rows);
    },

    async getActivity(id) {
      const { details } = buildJobDataset();
      return details.get(id)?.activity ?? [];
    },
  };
}
