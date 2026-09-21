// ============================================================
// IDENTITY & COMPLIANCE VERIFICATION TYPES
// ============================================================

export type KycStatus = "unverified" | "pending_review" | "verified" | "rejected";

export type KycDocumentType =
  | "NIN_SLIP"
  | "NATIONAL_ID"
  | "STUDENT_ID"
  | "PASSPORT"
  | "DRIVERS_LICENSE"
  | "CAC_DOCUMENT"
  | "PROOF_OF_ADDRESS"
  | "CERTIFICATE";

export interface KycDocument {
  id: string;
  type: KycDocumentType;
  name: string;
  url: string;
  status: "pending" | "approved" | "rejected";
  uploadedAt: string;
  rejectionReason?: string;
}

export interface NinVerificationPayload {
  nin: string;
  documentUrl?: string;
  fullName?: string;
}

export interface BvnVerificationPayload {
  bvn: string;
  bankCode: string;
  accountNumber: string;
  accountName?: string;
}

export interface KycVerificationState {
  userId: string;
  role: "vendor" | "freelancer" | "service_provider" | "student";
  status: KycStatus;
  ninVerified: boolean;
  bvnVerified: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  documents: KycDocument[];
  submittedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  canTrade: boolean;
  canWithdraw: boolean;
}

export interface SubmitVerificationDto {
  nin?: string;
  bvn?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  documents?: Array<{
    type: KycDocumentType;
    name: string;
    url: string;
  }>;
  notes?: string;
}
