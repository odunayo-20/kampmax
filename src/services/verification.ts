import { apiClient, ApiError } from "@/lib/api-client";
import type {
  KycVerificationState,
  KycDocument,
  SubmitVerificationDto,
  KycStatus,
} from "@/types/verification";
import { pushUserNotification } from "@/services/notifications";

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

  const statusRaw = String(data.status || data.verificationStatus || "unverified").toLowerCase();
  const status: KycStatus =
    statusRaw === "approved" || statusRaw === "verified"
      ? "verified"
      : statusRaw === "pending_review" || statusRaw === "pending"
      ? "pending_review"
      : statusRaw === "rejected"
      ? "rejected"
      : "unverified";

  const mapped: KycVerificationState = {
    userId: data.userId || "u1",
    role: "vendor",
    status,
    ninVerified: Boolean(data.ninVerified || status === "verified"),
    bvnVerified: Boolean(data.bvnVerified || status === "verified"),
    phoneVerified: Boolean(data.phoneVerified ?? true),
    emailVerified: Boolean(data.emailVerified ?? true),
    documents: data.documents || [],
    submittedAt: data.submittedAt,
    verifiedAt: data.verifiedAt,
    rejectionReason: data.rejectionReason,
    canTrade: status === "verified",
    canWithdraw: status === "verified",
  };

  mockVerificationStates.vendor_default = mapped;
  return { data: mapped, error: null };
}

/**
 * Submit vendor identity & KYC documents for review.
 * Connects to:
 *   1. POST /vendors/me/bank-accounts (if bank info provided)
 *   2. POST /vendors/me/documents (for each KYC document)
 *   3. POST /vendors/me/verification/submit
 */
export async function submitVendorKycVerification(
  dto: SubmitVerificationDto
): Promise<{ success: boolean; data?: KycVerificationState; error: ApiError | null }> {
  // 1. Submit bank account if provided
  if (dto.bankCode && dto.accountNumber) {
    await apiClient.post("/vendors/me/bank-accounts", {
      bankCode: dto.bankCode,
      accountNumber: dto.accountNumber,
      accountName: dto.accountName || "Vendor Payout Account",
      isPrimary: true,
    }).catch(() => null);
  }

  // 2. Submit documents if provided
  if (dto.documents && dto.documents.length > 0) {
    for (const doc of dto.documents) {
      await apiClient.post("/vendors/me/documents", {
        type: doc.type,
        name: doc.name,
        mediaId: doc.url,
      }).catch(() => null);
    }
  }

  // 3. Trigger KYC review submission
  const { data, error } = await apiClient.post<SubmitVerificationDto, any>(
    "/vendors/me/verification/submit",
    dto
  );

  // Optimistic prototype update
  const current = mockVerificationStates.vendor_default;
  const updatedDocs: KycDocument[] = dto.documents
    ? dto.documents.map((d, i) => ({
        id: `doc_${Date.now()}_${i}`,
        type: d.type,
        name: d.name,
        url: d.url,
        status: "pending",
        uploadedAt: new Date().toISOString(),
      }))
    : current.documents;

  const updated: KycVerificationState = {
    ...current,
    status: "pending_review",
    ninVerified: Boolean(dto.nin),
    bvnVerified: Boolean(dto.bvn),
    submittedAt: new Date().toISOString(),
    documents: updatedDocs,
  };
  mockVerificationStates.vendor_default = updated;

  // In-app notification record
  try {
    pushUserNotification({
      userId: current.userId,
      type: "system",
      category: "account",
      title: "Vendor Verification Submitted",
      message: "Your NIN, BVN, and store credentials have been submitted for compliance review.",
      actionUrl: "/vendor/verification",
    });
  } catch {
    // optional notification dispatch
  }

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
    ninVerified: Boolean(data.ninVerified || isApproved),
    bvnVerified: Boolean(data.bvnVerified || isApproved),
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
  const updatedDocs: KycDocument[] = dto.documents
    ? dto.documents.map((d, i) => ({
        id: `doc_fl_${Date.now()}_${i}`,
        type: d.type,
        name: d.name,
        url: d.url,
        status: "pending",
        uploadedAt: new Date().toISOString(),
      }))
    : current.documents;

  const updated: KycVerificationState = {
    ...current,
    status: "pending_review",
    ninVerified: Boolean(dto.nin),
    bvnVerified: Boolean(dto.bvn),
    submittedAt: new Date().toISOString(),
    documents: updatedDocs,
  };
  mockVerificationStates.freelancer_default = updated;

  // In-app notification record
  try {
    pushUserNotification({
      userId: current.userId,
      type: "system",
      category: "account",
      title: "Freelancer Pro Verification Submitted",
      message: "Your NIN, BVN, and identity documents are under review by the compliance team.",
      actionUrl: "/freelancer/verification",
    });
  } catch {
    // optional notification dispatch
  }

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

    try {
      pushUserNotification({
        userId: mockVerificationStates[key].userId,
        type: "system",
        category: "account",
        title: role === "vendor" ? "Store Verification Approved!" : "Freelancer Pro Badge Approved!",
        message: "Your identity and documents have been verified. Full trading and payout privileges are active.",
        actionUrl: role === "vendor" ? "/vendor/verification" : "/freelancer/verification",
      });
    } catch {
      // optional
    }
  }
}
