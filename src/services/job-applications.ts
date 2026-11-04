// ============================================================
// CVs & JOB APPLICATIONS SERVICE
// ============================================================
//
// Async wrappers over the NestJS backend for vacancies and internships, which
// are applied to with a CV instead of a bid:
//
//  CV LIBRARY (a few named, private CVs per person)
//    GET    /cvs                       → my CVs
//    POST   /cvs                       → add a CV (multipart: file, label)
//    PATCH  /cvs/:id                   → rename
//    DELETE /cvs/:id                   → delete
//    POST   /cvs/:id/link              → a few-minutes download address
//
//  APPLICATIONS
//    POST   /jobs/:id/apply            → apply with a saved CV
//    GET    /applications/me           → my applications (?jobId= for one posting)
//    POST   /applications/:id/withdraw → take one back
//    GET    /jobs/me/:id/applications  → applicants to my posting (employer)
//    PATCH  /applications/:id/status   → shortlist, reject or hire (employer)
//    POST   /applications/:id/cv-link  → a few-minutes download address for the CV
//
// SECURITY: a CV has no public address. Every download goes through a signed
// link the server only hands to the applicant or the employer who owns the
// posting, and which stops working after a few minutes.

import { apiClient } from "@/lib/api-client";
import type { ApiError } from "@/lib/api-client";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAccessToken } from "@/lib/auth-storage";
import type { PaginatedResult } from "@/services/jobs";

// ── Shapes ──────────────────────────────────────────────────

export interface Cv {
  id: string;
  label: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  /** How many applications point at this CV's file. */
  applicationCount: number;
}

export interface CvLink {
  /** Relative to the API root, e.g. /cv-files/<token>. */
  path: string;
  expiresAt: string;
}

/** Backend JobApplicationStatus, exactly as the API returns it. */
export type ApplicationStatus =
  | "SUBMITTED"
  | "VIEWED"
  | "SHORTLISTED"
  | "REJECTED"
  | "HIRED"
  | "WITHDRAWN";

/** What an employer can do to an application. */
export type ApplicationDecision = "SHORTLISTED" | "REJECTED" | "HIRED";

export interface MyApplication {
  id: string;
  status: ApplicationStatus;
  cvLabel: string;
  coverNote: string | null;
  employerNote: string | null;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  job: {
    id: string;
    title: string;
    slug: string;
    opportunityType: string;
    status: string;
    expiresAt: string | null;
    employerName: string;
    city: string | null;
    state: string | null;
  };
}

export interface Applicant {
  id: string;
  status: ApplicationStatus;
  cvLabel: string;
  /** False once the CV file has been removed. */
  cvAvailable: boolean;
  coverNote: string | null;
  answers: { questionId: string; question: string; answer: string }[];
  employerNote: string | null;
  createdAt: string;
  viewedAt: string | null;
  decidedAt: string | null;
  applicant: { id: string; name: string; username: string; avatar: string | null };
}

export interface JobApplicants extends PaginatedResult<Applicant> {
  job: { id: string; title: string; openings: number; hired: number };
  /** Applicants per status (withdrawn ones are never shown), plus the total. */
  counts: Record<ApplicationStatus | "ALL", number>;
}

export interface ApplyInput {
  cvId: string;
  coverNote?: string;
  screeningAnswers?: { questionId: string; answer: string }[];
}

type Failed = { error: ApiError };

// ── CV library ──────────────────────────────────────────────

/** Endpoint: GET /cvs */
export async function listCvs(): Promise<{ cvs: Cv[]; error: ApiError | null }> {
  const { data, error } = await apiClient.get<Cv[]>("/cvs");
  return error ? { cvs: [], error } : { cvs: data ?? [], error: null };
}

function uploadError(status: number, message: string): ApiError {
  return { name: "ApiError", message, status, code: "UPLOAD_FAILED" } as ApiError;
}

/**
 * Multipart upload to POST /api/v1/cvs. The browser must set the multipart
 * boundary itself, so this bypasses the JSON api client. A failure comes back as
 * an error with the server's own reason (wrong type, too big, library full).
 */
export async function uploadCv(
  file: File,
  label?: string
): Promise<{ cv: Cv | null; error: ApiError | null }> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    if (label?.trim()) formData.append("label", label.trim());

    const token = getAccessToken();
    const res = await fetch(new URL("/api/v1/cvs", getApiBaseUrl()).toString(), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = json?.message;
      const message = Array.isArray(raw) ? raw.join(", ") : raw;
      // The media rules answer with { errors: [{ message }] } for a bad file.
      const detail = Array.isArray(json?.errors) ? json.errors[0]?.message : undefined;
      return {
        cv: null,
        error: uploadError(res.status, detail || message || `Upload failed with status ${res.status}`),
      };
    }
    return { cv: (json?.data ?? json) as Cv, error: null };
  } catch {
    return { cv: null, error: uploadError(0, "Couldn't reach the server. Check your connection and try again.") };
  }
}

/** Endpoint: PATCH /cvs/:id */
export async function renameCv(id: string, label: string): Promise<{ cv: Cv | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<{ label: string }, Cv>(`/cvs/${id}`, { label });
  return error ? { cv: null, error } : { cv: data, error: null };
}

/** Endpoint: DELETE /cvs/:id. `fileKept` is true while an application still holds the file. */
export async function deleteCv(id: string): Promise<{ fileKept: boolean; error: ApiError | null }> {
  const { data, error } = await apiClient.delete<{ fileKept: boolean }>(`/cvs/${id}`);
  return error ? { fileKept: false, error } : { fileKept: !!data?.fileKept, error: null };
}

/** Endpoint: POST /cvs/:id/link */
export async function getCvLink(id: string): Promise<{ link: CvLink | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<undefined, CvLink>(`/cvs/${id}/link`);
  return error ? { link: null, error } : { link: data, error: null };
}

// ── Applying ────────────────────────────────────────────────

/** Endpoint: POST /jobs/:id/apply */
export async function applyToJob(
  jobId: string,
  input: ApplyInput
): Promise<{ application: MyApplication | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<ApplyInput, MyApplication>(`/jobs/${jobId}/apply`, input);
  return error ? { application: null, error } : { application: data, error: null };
}

/** Endpoint: GET /applications/me */
export async function listMyApplications(
  query: { page?: number; limit?: number; jobId?: string } = {}
): Promise<{
  applications: MyApplication[];
  total: number;
  page: number;
  totalPages: number;
  error: ApiError | null;
}> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.jobId) params.set("jobId", query.jobId);
  const qs = params.toString();
  const { data, error } = await apiClient.get<PaginatedResult<MyApplication>>(
    `/applications/me${qs ? `?${qs}` : ""}`
  );
  if (error) return { applications: [], total: 0, page: 1, totalPages: 1, error };
  return {
    applications: data?.items ?? [],
    total: data?.meta?.total ?? 0,
    page: data?.meta?.page ?? 1,
    totalPages: data?.meta?.totalPages ?? 1,
    error: null,
  };
}

/** Endpoint: POST /applications/:id/withdraw */
export async function withdrawApplication(
  id: string
): Promise<{ application: MyApplication | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<undefined, MyApplication>(`/applications/${id}/withdraw`);
  return error ? { application: null, error } : { application: data, error: null };
}

// ── Employer ────────────────────────────────────────────────

/** Endpoint: GET /jobs/me/:id/applications */
export async function listJobApplicants(
  jobId: string,
  query: { status?: ApplicationStatus; page?: number; limit?: number } = {}
): Promise<{ result: JobApplicants | null; error: ApiError | null }> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  const { data, error } = await apiClient.get<JobApplicants>(
    `/jobs/me/${jobId}/applications${qs ? `?${qs}` : ""}`
  );
  return error ? { result: null, error } : { result: data, error: null };
}

/** Endpoint: PATCH /applications/:id/status */
export async function setApplicationStatus(
  id: string,
  status: ApplicationDecision,
  note?: string
): Promise<{ applicant: Applicant | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<{ status: ApplicationDecision; note?: string }, Applicant>(
    `/applications/${id}/status`,
    { status, ...(note?.trim() ? { note: note.trim() } : {}) }
  );
  return error ? { applicant: null, error } : { applicant: data, error: null };
}

/** Endpoint: POST /applications/:id/cv-link */
export async function getApplicationCvLink(
  id: string
): Promise<{ link: CvLink | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<undefined, CvLink>(`/applications/${id}/cv-link`);
  return error ? { link: null, error } : { link: data, error: null };
}

// ── Downloading ─────────────────────────────────────────────

/** The full address of a CV link (the API root, its /api/v1 prefix, then the link's path). */
export function cvLinkUrl(link: CvLink): string {
  return new URL(`/api/v1${link.path}`, getApiBaseUrl()).toString();
}

/**
 * Asks for a fresh link and starts the download. The link is made at the
 * moment of the click and used straight away: it only lasts a few minutes, so
 * it is never stored or shown.
 */
export async function downloadCv(
  getLink: () => Promise<{ link: CvLink | null; error: ApiError | null }>
): Promise<Failed | { error: null }> {
  const { link, error } = await getLink();
  if (error || !link) {
    return { error: error ?? uploadError(0, "The CV could not be opened.") };
  }
  window.location.assign(cvLinkUrl(link));
  return { error: null };
}
