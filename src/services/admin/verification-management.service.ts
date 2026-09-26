import type {
  ManagedVerificationCounts,
  ManagedVerificationDetail,
  ManagedVerificationListQuery,
  ManagedVerificationRow,
  ManagedVerificationType,
  Paginated,
} from "@/types/admin";

// ------------------------------------------------------------
// CONTRACT (NestJS resource: /admin/verifications, see ./verification-management.api.ts)
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
  /** Delegated to the applicant's own console endpoint (vendor / employer / freelancer). */
  approve(id: string, ctx?: VerificationActingContext): Promise<ManagedVerificationRow>;
  reject(id: string, reason: string, ctx?: VerificationActingContext): Promise<ManagedVerificationRow>;
}
