import type {
  AdminActingContext,
  ManagedFreelancer,
  ManagedFreelancerDetail,
} from "@/types/admin";
import { apiDelay, applySort } from "@/lib/admin/api";
import { buildFreelancerDataset, filterFreelancers, computeFreelancerCounts, type FreelancerDataset } from "@/data/admin/freelancer-management";
import { DEFAULT_ADMIN_ACTOR, recordAdminAuditEvent } from "@/data/admin/audit-trail";
import type { AdminFreelancerManagementService } from "./freelancer-management.service";

// ------------------------------------------------------------
// In-memory implementation of AdminFreelancerManagementService.
//
// NOT used by /admin/freelancers anymore (it talks to the API through
// ./freelancer-management.api.ts). Kept as a fixture for the audit-trail
// unit tests.
// ------------------------------------------------------------

export function createFreelancerManagementService(
  seed?: FreelancerDataset
): AdminFreelancerManagementService {
  const dataset = seed ?? buildFreelancerDataset();
  const freelancers = dataset.freelancers.map((f) => ({ ...f }));
  const details = new Map<string, ManagedFreelancerDetail>();

  for (const [id, detail] of dataset.details) {
    details.set(id, { ...detail, freelancer: { ...detail.freelancer } });
  }

  // Ensure detail freelancer refs match list freelancers
  for (const fl of freelancers) {
    const d = details.get(fl.id);
    if (d) {
      d.freelancer = fl;
    }
  }

  function auditActor(ctx?: AdminActingContext) {
    if (!ctx?.actor) return DEFAULT_ADMIN_ACTOR;
    return {
      type: "admin" as const,
      id: ctx.actor.id,
      name: ctx.actor.name,
      role: ctx.actor.role,
    };
  }

  return {
    async list(query = {}) {
      await apiDelay();
      const {
        search,
        sortBy,
        sortDir = "desc",
        page = 1,
        pageSize = 10,
        status = "all",
        categoryId,
      } = query;

      const filtered = filterFreelancers(freelancers, { search, status, categoryId, page, pageSize });

      const sorted = applySort(
        filtered.items,
        sortBy,
        sortDir,
        {
          joinedAt: (v) => new Date(v.joinedAt).getTime(),
          totalBookings: (v) => v.totalBookings,
          rating: (v) => v.rating,
          servicesCount: (v) => v.servicesCount,
          displayName: (v) => v.displayName,
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
      return details.get(id) ?? null;
    },

    async getCounts() {
      await apiDelay();
      return computeFreelancerCounts(freelancers);
    },

    async getCategories() {
      await apiDelay();
      const cats = new Set<string>();
      for (const f of freelancers) {
        for (const c of f.categories) cats.add(c);
      }
      return Array.from(cats).sort();
    },

    async suspend(id, ctx) {
      await apiDelay();
      const idx = freelancers.findIndex((f) => f.id === id);
      if (idx === -1) throw new Error(`Freelancer ${id} not found`);
      const prev = freelancers[idx];
      const updated = { ...prev, status: "suspended" as const };
      freelancers[idx] = updated;
      const d = details.get(id);
      if (d) {
        d.freelancer = updated;
        d.profile = { ...d.profile, status: "suspended" };
      }
      recordAdminAuditEvent({
        action: "FREELANCER_SUSPENDED",
        actor: auditActor(ctx),
        resource: { type: "freelancer", id, label: prev.displayName },
        metadata: { previousStatus: prev.status, newStatus: "suspended" },
      });
      return updated;
    },

    async activate(id, ctx) {
      await apiDelay();
      const idx = freelancers.findIndex((f) => f.id === id);
      if (idx === -1) throw new Error(`Freelancer ${id} not found`);
      const prev = freelancers[idx];
      const updated = { ...prev, status: "approved" as const };
      freelancers[idx] = updated;
      const d = details.get(id);
      if (d) {
        d.freelancer = updated;
        d.profile = { ...d.profile, status: "approved" };
      }
      recordAdminAuditEvent({
        action: "FREELANCER_ACTIVATED",
        actor: auditActor(ctx),
        resource: { type: "freelancer", id, label: prev.displayName },
        metadata: { previousStatus: prev.status, newStatus: "approved" },
      });
      return updated;
    },

    async deactivate(id, ctx) {
      await apiDelay();
      const idx = freelancers.findIndex((f) => f.id === id);
      if (idx === -1) throw new Error(`Freelancer ${id} not found`);
      const prev = freelancers[idx];
      const updated = { ...prev, status: "rejected" as const };
      freelancers[idx] = updated;
      const d = details.get(id);
      if (d) {
        d.freelancer = updated;
        d.profile = { ...d.profile, status: "rejected" };
      }
      recordAdminAuditEvent({
        action: "FREELANCER_DEACTIVATED",
        actor: auditActor(ctx),
        resource: { type: "freelancer", id, label: prev.displayName },
        metadata: { previousStatus: prev.status, newStatus: "rejected" },
      });
      return updated;
    },

    async feature(id, ctx) {
      await apiDelay();
      const idx = freelancers.findIndex((f) => f.id === id);
      if (idx === -1) throw new Error(`Freelancer ${id} not found`);
      const prev = freelancers[idx];
      const updated = { ...prev, featured: true };
      freelancers[idx] = updated;
      const d = details.get(id);
      if (d) {
        d.freelancer = updated;
      }
      recordAdminAuditEvent({
        action: "FREELANCER_FEATURED",
        actor: auditActor(ctx),
        resource: { type: "freelancer", id, label: prev.displayName },
        metadata: { previousStatus: prev.featured ? "featured" : "not_featured", newStatus: "featured" },
      });
      return updated;
    },

    async unfeature(id, ctx) {
      await apiDelay();
      const idx = freelancers.findIndex((f) => f.id === id);
      if (idx === -1) throw new Error(`Freelancer ${id} not found`);
      const prev = freelancers[idx];
      const updated = { ...prev, featured: false };
      freelancers[idx] = updated;
      const d = details.get(id);
      if (d) {
        d.freelancer = updated;
      }
      recordAdminAuditEvent({
        action: "FREELANCER_UNFEATURED",
        actor: auditActor(ctx),
        resource: { type: "freelancer", id, label: prev.displayName },
        metadata: { previousStatus: prev.featured ? "featured" : "not_featured", newStatus: "not_featured" },
      });
      return updated;
    },

    async getActivity(id) {
      await apiDelay(150);
      const d = details.get(id);
      if (!d) return [];
      return d.activity;
    },
  };
}