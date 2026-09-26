import type {
  AdminActingContext,
  ManagedEmployer,
  ManagedEmployerDetail,
  EmployerBucket,
} from "@/types/admin";
import type { AdminEmployerManagementService } from "./employer-management.service";
import { apiDelay, applySort } from "@/lib/admin/api";
import {
  buildEmployerDataset,
  filterEmployers,
  computeEmployerCounts,
  employerIndustries,
} from "@/data/admin/employer-management";
import {
  setEmployerAdminStatus,
} from "@/data/employer";
import { EMPLOYER_ONBOARDING_STATUS } from "@/types/employer";
import { DEFAULT_ADMIN_ACTOR, recordAdminAuditEvent } from "@/data/admin/audit-trail";

// ------------------------------------------------------------
// In-memory implementation of AdminEmployerManagementService.
//
// NOT used by /admin/employers anymore (it talks to the API through
// ./employer-management.api.ts). Kept as a fixture for the audit-trail and
// employer-management unit tests.
// ------------------------------------------------------------

function auditActorFor(ctx?: AdminActingContext) {
  if (!ctx?.actor) return DEFAULT_ADMIN_ACTOR;
  return {
    type: "admin" as const,
    id: ctx.actor.id,
    name: ctx.actor.name,
    role: ctx.actor.role,
  };
}

// ------------------------------------------------------------
// MOCK IMPLEMENTATION
// ------------------------------------------------------------
//
// The employer store is the single source of truth. Every read derives
// a fresh projection so suspending/restoring an employer is reflected
// immediately in every downstream surface (owner dashboard, public
// profile, admin consoles). Status transitions are enforced by the
// store — the service never decides them itself.
// ------------------------------------------------------------

function resolveManagedEmployer(id: string): ManagedEmployer {
  const dataset = buildEmployerDataset();
  const employer = dataset.employers.find((e) => e.id === id);
  if (!employer) throw new Error(`Employer ${id} not found`);
  return employer;
}

function reloadManagedEmployer(id: string): ManagedEmployer {
  const dataset = buildEmployerDataset();
  const employer = dataset.employers.find((e) => e.id === id);
  if (!employer) throw new Error(`Employer ${id} not found`);
  return employer;
}

export function createEmployerManagementService(): AdminEmployerManagementService {
  return {
    async list(query = {}) {
      await apiDelay();
      const dataset = buildEmployerDataset();
      const {
        search,
        sortBy,
        sortDir = "desc",
        page = 1,
        pageSize = 10,
        status = "all" as EmployerBucket,
        verification,
        campusId,
        industry,
      } = query;

      const filtered = filterEmployers(dataset.employers, {
        search,
        status,
        verification,
        campusId,
        industry,
        page,
        pageSize,
      });

      const sorted = applySort(
        filtered.items,
        sortBy,
        sortDir,
        {
          name: (v) => v.name,
          joinedAt: (v) => new Date(v.joinedAt).getTime(),
          activeJobs: (v) => v.activeJobs,
          applicationsReceived: (v) => v.applicationsReceived,
          rating: (v) => v.rating,
        },
        "joinedAt"
      );

      return {
        ...filtered,
        items: sorted,
        pageSize,
      };
    },

    async getById(id) {
      await apiDelay(120);
      const dataset = buildEmployerDataset();
      return dataset.details.get(id) ?? null;
    },

    async getCounts() {
      await apiDelay();
      const dataset = buildEmployerDataset();
      return computeEmployerCounts(dataset.employers);
    },

    async getIndustries() {
      await apiDelay();
      const dataset = buildEmployerDataset();
      return employerIndustries(dataset.employers);
    },

    async suspend(id, ctx) {
      await apiDelay();
      const employer = resolveManagedEmployer(id);
      if (!employer.userId) {
        throw new Error(`${employer.name} has no Kampmax employer profile to suspend.`);
      }
      const res = setEmployerAdminStatus(
        employer.userId,
        EMPLOYER_ONBOARDING_STATUS.SUSPENDED,
        "Your employer profile was suspended by an administrator."
      );
      if (!res.ok) throw new Error(res.message);
      recordAdminAuditEvent({
        action: "EMPLOYER_SUSPENDED",
        actor: auditActorFor(ctx),
        resource: { type: "employer", id, label: employer.name },
        metadata: { previousStatus: employer.status, newStatus: "suspended" },
      });
      return reloadManagedEmployer(id);
    },

    async restore(id, ctx) {
      await apiDelay();
      const employer = resolveManagedEmployer(id);
      if (!employer.userId) {
        throw new Error(`${employer.name} has no Kampmax employer profile to restore.`);
      }
      const res = setEmployerAdminStatus(
        employer.userId,
        EMPLOYER_ONBOARDING_STATUS.APPROVED
      );
      if (!res.ok) throw new Error(res.message);
      recordAdminAuditEvent({
        action: "EMPLOYER_RESTORED",
        actor: auditActorFor(ctx),
        resource: { type: "employer", id, label: employer.name },
        metadata: { previousStatus: employer.status, newStatus: "active" },
      });
      return reloadManagedEmployer(id);
    },

    async approve(id, ctx) {
      await apiDelay();
      const employer = resolveManagedEmployer(id);
      if (!employer.userId) {
        throw new Error(`${employer.name} has no Kampmax employer profile to approve.`);
      }
      const res = setEmployerAdminStatus(
        employer.userId,
        EMPLOYER_ONBOARDING_STATUS.APPROVED
      );
      if (!res.ok) throw new Error(res.message);
      recordAdminAuditEvent({
        action: "EMPLOYER_APPROVED",
        actor: auditActorFor(ctx),
        resource: { type: "employer", id, label: employer.name },
        metadata: { previousStatus: employer.status, newStatus: "active" },
      });
      return reloadManagedEmployer(id);
    },

    async reject(id, reason, ctx) {
      await apiDelay();
      const employer = resolveManagedEmployer(id);
      if (!employer.userId) {
        throw new Error(`${employer.name} has no Kampmax employer profile to reject.`);
      }
      const finalReason = reason?.trim()
        ? reason.trim()
        : "Your employer profile was rejected by an administrator.";
      const res = setEmployerAdminStatus(
        employer.userId,
        EMPLOYER_ONBOARDING_STATUS.REJECTED,
        finalReason
      );
      if (!res.ok) throw new Error(res.message);
      recordAdminAuditEvent({
        action: "EMPLOYER_REJECTED",
        actor: auditActorFor(ctx),
        resource: { type: "employer", id, label: employer.name },
        metadata: { reason: finalReason, previousStatus: employer.status, newStatus: "rejected" },
      });
      return reloadManagedEmployer(id);
    },

    async getActivity(id) {
      await apiDelay(150);
      const dataset = buildEmployerDataset();
      const detail = dataset.details.get(id);
      if (!detail) return [];
      return detail.activity;
    },
  };
}