import {
  ManagedVerificationCounts,
  ManagedVerificationDetail,
  ManagedVerificationListQuery,
  ManagedVerificationRow,
  ManagedVerificationType,
  Paginated,
} from "@/types/admin";
import { apiDelay, paginate } from "@/lib/admin/api";
import {
  buildVerificationDataset,
  computeVerificationCounts,
  filterVerificationRows,
  sortVerificationRows,
} from "@/data/admin/verification-management";
import { createVendorManagementService } from "./vendor-management.mock";
import type { AdminActingContext, AdminProfile } from "@/types/admin";

// ------------------------------------------------------------
// CONTRACT (future NestJS resource: /admin/verifications)
// ------------------------------------------------------------

/** Acting operator identity — campus scope is enforced in the service. */
export interface VerificationActingContext {
  actor?: { id?: string; name?: string; role?: string; campusId?: string | null };
}

export interface AdminVerificationManagementService {
  list(
    query?: ManagedVerificationListQuery,
    ctx?: VerificationActingContext
  ): Promise<Paginated<ManagedVerificationRow>>;
  getById(id: string, ctx?: VerificationActingContext): Promise<ManagedVerificationDetail | null>;
  getCounts(ctx?: VerificationActingContext): Promise<ManagedVerificationCounts>;
  getTypes(ctx?: VerificationActingContext): Promise<ManagedVerificationType[]>;
  /** Only supported for vendor verification (delegated to the vendor service). */
  approve(id: string, ctx?: VerificationActingContext): Promise<ManagedVerificationRow>;
  reject(id: string, reason: string, ctx?: VerificationActingContext): Promise<ManagedVerificationRow>;
}

// ------------------------------------------------------------
// MOCK IMPLEMENTATION
//
// Re-derives the dataset from the real vendor/employer/freelancer
// stores on every call (~15 rows — cheap), so verification rows always
// reflect the live owning-store state. Campus-scoped operators are
// confined to their own campus rows (least privilege). Decisions exist
// only where a real backend path does — vendor approve/reject — and are
// delegated to the vendor management service so the shared overlay keeps
// the two consoles consistent (approving here = approving in /admin/vendors).
// ------------------------------------------------------------

export function createVerificationManagementService(): AdminVerificationManagementService {
  const vendorService = createVendorManagementService();

  function fresh() {
    return buildVerificationDataset();
  }

  function scopeCampusId(ctx?: VerificationActingContext): string | null {
    if (ctx?.actor?.role === "CAMPUS_ADMIN") return ctx.actor.campusId ?? null;
    return null;
  }

  /**
   * Bridges to the vendor service so decisions carry the real operator.
   * The hook path always carries the full session profile; the cast mirrors
   * the backend session resolver that will populate it server-side. When no
   * named actor is present (legacy/test callers) the vendor service falls
   * back to the documented Platform Admin surrogate.
   */
  function toVendorActingContext(ctx?: VerificationActingContext): AdminActingContext | undefined {
    const a = ctx?.actor;
    if (!a?.name) return undefined;
    return { actor: a as AdminProfile };
  }

  function visibleRows(campusScope: string | null): ManagedVerificationRow[] {
    const rows = fresh().rows;
    if (!campusScope) return rows;
    return rows.filter((r) => r.campusId === campusScope);
  }

  function findRow(id: string, ctx?: VerificationActingContext): ManagedVerificationRow {
    const campusScope = scopeCampusId(ctx);
    const row = visibleRows(campusScope).find((r) => r.id === id);
    if (!row) throw new Error("Verification not found");
    return row;
  }

  function requireVendorApplicant(
    row: ManagedVerificationRow,
    action: "approve" | "reject"
  ): void {
    if (row.applicantType !== "vendor") {
      const verb = action === "approve" ? "Approval" : "Rejection";
      throw new Error(
        `${verb} is only supported for vendor verification in this backend. Review ${row.applicantName} from the ${row.applicantType} console instead.`
      );
    }
  }

  return {
    async list(query, ctx) {
      await apiDelay();
      const rows = sortVerificationRows(
        filterVerificationRows(visibleRows(scopeCampusId(ctx)), query ?? {}),
        query?.sortBy,
        query?.sortDir ?? "asc"
      );
      return paginate(rows, query ?? {});
    },

    async getById(id, ctx) {
      await apiDelay();
      const campusScope = scopeCampusId(ctx);
      const detail = fresh().byId.get(id);
      if (!detail) return null;
      if (campusScope && detail.verification.campusId !== campusScope) return null;
      return detail;
    },

    async getCounts(ctx) {
      await apiDelay(60);
      return computeVerificationCounts(visibleRows(scopeCampusId(ctx)));
    },

    async getTypes(ctx) {
      await apiDelay(60);
      return Array.from(
        new Set(
          visibleRows(scopeCampusId(ctx))
            .map((r) => r.verificationType)
            .filter((t): t is ManagedVerificationType => t !== null)
        )
      ).sort();
    },

    async approve(id, ctx) {
      await apiDelay();
      const row = findRow(id, ctx);
      requireVendorApplicant(row, "approve");
      await vendorService.approve(row.applicantId, toVendorActingContext(ctx));
      return findRow(id, ctx);
    },

    async reject(id, reason, ctx) {
      await apiDelay();
      const row = findRow(id, ctx);
      requireVendorApplicant(row, "reject");
      const message = reason.trim();
      if (!message) throw new Error("A rejection reason is required.");
      await vendorService.reject(row.applicantId, message, toVendorActingContext(ctx));
      return findRow(id, ctx);
    },
  };
}