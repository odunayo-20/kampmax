import { apiClient, ApiError } from "@/lib/api-client";
import type {
  KycVerificationState,
  KycDocument,
  SubmitVerificationDto,
  KycStatus,
} from "@/types/verification";

// ============================================================
// DEFAULT / MOCK STATE FOR PROTOTYPE
// ============================================================

const mockVerificationStates: Record<string, KycVerificationState> = {
  vendor_default: {
    userId: "u1",
    role: "vendor",
    status: "unverified",
    ninVerified: false,
    bvnVerified: false,
    phoneVerified: true,
    emailVerified: true,
    documents: [],
    canTrade: false,
    canWithdraw: false,
  },
  freelancer_default: {
    userId: "u1",
    role: "freelancer",
    status: "unverified",
    ninVerified: false,
    bvnVerified: false,
    phoneVerified: true,
    emailVerified: true,
    documents: [],
    canTrade: false,
    canWithdraw: false,
  },
};

// ============================================================
// BACKEND API METHODS (Two-tier with mock fallback)
// ============================================================

/**
 * Fetch KYC verification status for the authenticated vendor.
 * GET /api/v1/vendors/me/verification/status
 */
export async function fetchVendorKycStatus(): Promise<{
  data: KycVerificationState;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.get<any>("/vendors/me/verification/status");
  if (error || !data) {
    return { data: mockVerificationStates.vendor_default, error };
  }

  const mapped: KycVerificationState = {
    userId: data.userId || "u1",
    role: "vendor",
    status: (data.status?.toLowerCase() as KycStatus) || "unverified",
    ninVerified: Boolean(data.ninVerified),
    bvnVerified: Boolean(data.bvnVerified),
    phoneVerified: Boolean(data.phoneVerified ?? true),
    emailVerified: Boolean(data.emailVerified ?? true),
    documents: data.documents || [],
    submittedAt: data.submittedAt,
    verifiedAt: data.verifiedAt,
    rejectionReason: data.rejectionReason,
    canTrade: data.status === "APPROVED" || data.status === "verified",
    canWithdraw: data.status === "APPROVED" || data.status === "verified",
  };

  mockVerificationStates.vendor_default = mapped;
  return { data: mapped, error: null };
}

/**
 * Submit vendor identity & KYC documents for review.
 * POST /api/v1/vendors/me/verification/submit
 */
export async function submitVendorKycVerification(
  dto: SubmitVerificationDto
): Promise<{ success: boolean; data?: KycVerificationState; error: ApiError | null }> {
  const { data, error } = await apiClient.post<SubmitVerificationDto, any>(
    "/vendors/me/verification/submit",
    dto
  );

  // Optimistic prototype update
  const current = mockVerificationStates.vendor_default;
  const updated: KycVerificationState = {
    ...current,
    status: "pending_review",
    ninVerified: Boolean(dto.nin),
    bvnVerified: Boolean(dto.bvn),
    submittedAt: new Date().toISOString(),
    documents: dto.documents
      ? dto.documents.map((d, i) => ({
          id: `doc_${Date.now()}_${i}`,
          type: d.type,
          name: d.name,
          url: d.url,
          status: "pending",
          uploadedAt: new Date().toISOString(),
        }))
      : current.documents,
  };
  mockVerificationStates.vendor_default = updated;

  if (error) {
    return { success: false, data: updated, error };
  }

  return { success: true, data: updated, error: null };
}

/**
 * Fetch KYC status for the authenticated freelancer.
 * GET /api/v1/freelancers/me
 */
export async function fetchFreelancerKycStatus(): Promise<{
  data: KycVerificationState;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.get<any>("/freelancers/me");
  if (error || !data) {
    return { data: mockVerificationStates.freelancer_default, error };
  }

  const isApproved = data.status === "APPROVED" || data.verificationStatus === "APPROVED";
  const mapped: KycVerificationState = {
    userId: data.userId || "u1",
    role: "freelancer",
    status: isApproved ? "verified" : data.status === "PENDING_REVIEW" ? "pending_review" : "unverified",
    ninVerified: Boolean(data.ninVerified),
    bvnVerified: Boolean(data.bvnVerified),
    phoneVerified: true,
    emailVerified: true,
    documents: data.documents || [],
    submittedAt: data.submittedAt,
    verifiedAt: data.verifiedAt,
    canTrade: isApproved,
    canWithdraw: isApproved,
  };

  mockVerificationStates.freelancer_default = mapped;
  return { data: mapped, error: null };
}

/**
 * Submit freelancer verification application (NIN/BVN/Govt ID).
 * POST /api/v1/freelancers/me/verification
 */
export async function submitFreelancerKycVerification(
  dto: SubmitVerificationDto
): Promise<{ success: boolean; data?: KycVerificationState; error: ApiError | null }> {
  const { data, error } = await apiClient.post<SubmitVerificationDto, any>(
    "/freelancers/me/verification",
    dto
  );

  const current = mockVerificationStates.freelancer_default;
  const updated: KycVerificationState = {
    ...current,
    status: "pending_review",
    ninVerified: Boolean(dto.nin),
    bvnVerified: Boolean(dto.bvn),
    submittedAt: new Date().toISOString(),
    documents: dto.documents
      ? dto.documents.map((d, i) => ({
          id: `doc_fl_${Date.now()}_${i}`,
          type: d.type,
          name: d.name,
          url: d.url,
          status: "pending",
          uploadedAt: new Date().toISOString(),
        }))
      : current.documents,
  };
  mockVerificationStates.freelancer_default = updated;

  if (error) {
    return { success: false, data: updated, error };
  }

  return { success: true, data: updated, error: null };
}

// ============================================================
// SYNCHRONOUS HELPERS FOR PROTOTYPE UI
// ============================================================

export function getVendorKycState(userId?: string): KycVerificationState {
  return mockVerificationStates.vendor_default;
}

export function getFreelancerKycState(userId?: string): KycVerificationState {
  return mockVerificationStates.freelancer_default;
}

export function simulateVerificationApproval(role: "vendor" | "freelancer"): void {
  const key = `${role}_default`;
  if (mockVerificationStates[key]) {
    mockVerificationStates[key] = {
      ...mockVerificationStates[key],
      status: "verified",
      ninVerified: true,
      bvnVerified: true,
      verifiedAt: new Date().toISOString(),
      canTrade: true,
      canWithdraw: true,
    };
  }
}
