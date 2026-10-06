import { apiClient } from "@/lib/api-client";
import { uploadFileDirect } from "@/services/media";
import type { KycStatus } from "@/types/verification";

// ============================================================
// ACCOUNT VERIFICATION (live)
// ============================================================
//
// Vendors are verified by review of documents the platform requires for their
// business type (GET /vendors/me/verification/status lists them). Freelancers
// ask for a review of their profile (POST /freelancers/me/verification).
// Nothing here is simulated: a status is only what the server reports, a
// submission only counts once the server accepted it, and a failure throws.

export type VendorBusinessType = "INDIVIDUAL" | "BUSINESS";

export type VerificationDocStatus = "submitted" | "approved" | "rejected";

export interface VerificationDocument {
  id: string;
  type: string;
  filename: string;
  status: VerificationDocStatus;
  rejectionReason?: string;
  submittedAt: string;
}

export interface RequiredDocument {
  type: string;
  label: string;
  /** The most recent upload of this type, if any. */
  latest?: VerificationDocument;
}

export interface VendorVerification {
  status: KycStatus;
  businessType: VendorBusinessType;
  required: RequiredDocument[];
  documents: VerificationDocument[];
  /** Every required document has an upload that was not rejected. */
  documentsComplete: boolean;
  /** The vendor may (re)submit for review. */
  canSubmit: boolean;
}

export interface FreelancerVerification {
  status: KycStatus;
}

const DOCUMENT_LABELS: Record<string, string> = {
  GOVERNMENT_ID: "Government-issued ID",
  BUSINESS_REGISTRATION: "Business registration (CAC)",
  ADDRESS_PROOF: "Proof of address",
  TAX_CERTIFICATE: "Tax certificate",
  STORE_PHOTO: "Store photo",
};

export const documentLabel = (type: string): string =>
  DOCUMENT_LABELS[type] ??
  type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

interface BackendStatus {
  verificationStatus: string;
  requiredDocuments: string[];
}
interface BackendDocument {
  id: string;
  type: string;
  filename: string | null;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  submittedAt: string;
}
interface BackendProfile {
  profile: { businessType: VendorBusinessType };
}

function fail(error: { message?: string } | null, fallback: string): Error {
  return new Error(error?.message || fallback);
}

/** The backend's vendor status words → what the UI shows. */
export function vendorStatusFrom(raw: string): KycStatus {
  switch (raw.toUpperCase()) {
    case "VERIFIED":
      return "verified";
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "pending_review";
    case "REJECTED":
      return "rejected";
    case "SUSPENDED":
      return "suspended";
    default:
      return "unverified"; // PENDING: never submitted
  }
}

function toDocument(doc: BackendDocument): VerificationDocument {
  return {
    id: doc.id,
    type: doc.type,
    filename: doc.filename || documentLabel(doc.type),
    status: doc.status === "APPROVED" ? "approved" : doc.status === "REJECTED" ? "rejected" : "submitted",
    rejectionReason: doc.rejectionReason ?? undefined,
    submittedAt: doc.submittedAt,
  };
}

/** The vendor's real verification state. Failures throw; there is no demo fallback. */
export async function fetchVendorVerification(): Promise<VendorVerification> {
  const [status, docs, profile] = await Promise.all([
    apiClient.get<BackendStatus>("/vendors/me/verification/status"),
    apiClient.get<{ items: BackendDocument[] }>("/vendors/me/documents"),
    apiClient.get<BackendProfile>("/vendors/me/profile"),
  ]);
  if (status.error || !status.data) throw fail(status.error, "Could not load your verification status.");
  if (docs.error || !docs.data) throw fail(docs.error, "Could not load your documents.");
  if (profile.error || !profile.data) throw fail(profile.error, "Could not load your business profile.");

  const documents = docs.data.items.map(toDocument);
  const newestFirst = [...documents].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
  const required: RequiredDocument[] = status.data.requiredDocuments.map((type) => ({
    type,
    label: documentLabel(type),
    latest: newestFirst.find((d) => d.type === type),
  }));
  const documentsComplete =
    required.length > 0 && required.every((r) => r.latest && r.latest.status !== "rejected");
  const state = vendorStatusFrom(status.data.verificationStatus);

  return {
    status: state,
    businessType: profile.data.profile.businessType,
    required,
    documents: newestFirst,
    documentsComplete,
    canSubmit: documentsComplete && (state === "unverified" || state === "rejected"),
  };
}

/** Uploads a file and attaches it as one of the required documents. */
export async function uploadVendorDocument(type: string, file: File): Promise<void> {
  const { data: media, error: uploadError } = await uploadFileDirect(file, "kyc");
  if (uploadError || !media) throw fail(uploadError, "The file could not be uploaded.");
  const { error } = await apiClient.post<{ type: string; mediaId: string }, unknown>(
    "/vendors/me/documents",
    { type, mediaId: media.id }
  );
  if (error) throw fail(error, "The document could not be saved.");
}

/** Which documents are needed depends on the business type, so changing it changes the list. */
export async function setVendorBusinessType(businessType: VendorBusinessType): Promise<void> {
  const { error } = await apiClient.patch<{ businessType: VendorBusinessType }, unknown>(
    "/vendors/me/profile",
    { businessType }
  );
  if (error) throw fail(error, "Could not update your business type.");
}

/** Sends the documents for review. Resolves only once the server has accepted it. */
export async function submitVendorVerification(): Promise<void> {
  const { error } = await apiClient.post<Record<string, never>, unknown>(
    "/vendors/me/verification/submit",
    {}
  );
  if (error) throw fail(error, "Your verification could not be submitted.");
}

function freelancerStatusFrom(raw: string): KycStatus {
  switch (raw.toUpperCase()) {
    case "VERIFIED":
      return "verified";
    case "PENDING":
      return "pending_review";
    case "REJECTED":
      return "rejected";
    default:
      return "unverified";
  }
}

/** The freelancer's real verification state. */
export async function fetchFreelancerVerification(): Promise<FreelancerVerification> {
  const { data, error } = await apiClient.get<{ verificationStatus: string }>("/freelancers/me");
  if (error || !data) throw fail(error, "Could not load your verification status.");
  return { status: freelancerStatusFrom(data.verificationStatus ?? "") };
}

/** Asks for a review of the freelancer profile. */
export async function requestFreelancerVerification(): Promise<void> {
  const { error } = await apiClient.post<Record<string, never>, unknown>(
    "/freelancers/me/verification",
    {}
  );
  if (error) throw fail(error, "Your verification request could not be sent.");
}
