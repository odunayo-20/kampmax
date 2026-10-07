import type { ApiError } from "@/lib/api-client";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAccessToken } from "@/lib/auth-storage";

// ============================================================
// MEDIA UPLOAD SERVICE
// ============================================================

/** Categories the backend accepts (it validates size and MIME type per category). */
export type MediaUploadCategory =
  | "avatar"
  | "logo"
  | "banner"
  | "coverImage"
  | "product"
  | "post"
  | "message"
  | "campus"
  | "category"
  | "kyc"
  | "portfolio"
  | "jobAttachment"
  | "proposalAttachment";

export interface UploadedMedia {
  id: string;
  url: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

interface BackendMedia {
  id: string;
  url: string | null;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number | string;
}

function uploadError(status: number, message: string): ApiError {
  return { name: "ApiError", message, status, code: "UPLOAD_FAILED" } as ApiError;
}

/**
 * Why an uploaded file's address can't work for visitors, or null if it can.
 * A server whose storage is set up for development hands out addresses like
 * http://localhost:4000/media/...: the upload "works", then the picture never
 * loads for anyone else.
 */
export function mediaUrlProblem(url: string, pageHostname?: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "the server saved your file without a full web address";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "the server saved your file at an unsupported address";
  const local = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(parsed.hostname);
  const viewingLocally = !pageHostname || /^(localhost|127\.0\.0\.1)$/.test(pageHostname);
  if (local && !viewingLocally) return "the server saved your file at a private address (" + parsed.host + ") that visitors can't open";
  return null;
}

/**
 * Multipart upload to POST /api/v1/media/upload. The browser must set the
 * multipart boundary itself, so this bypasses the JSON api client. A failed
 * upload is reported as an error — never faked as a success, because callers
 * attach the returned media id to jobs/proposals.
 */
export async function uploadFileDirect(
  file: File,
  category: MediaUploadCategory
): Promise<{ data: UploadedMedia | null; error: ApiError | null }> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    const token = getAccessToken();
    const res = await fetch(new URL("/api/v1/media/upload", getApiBaseUrl()).toString(), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = json?.message;
      const message = Array.isArray(raw) ? raw.join(", ") : raw;
      return {
        data: null,
        error: uploadError(res.status, message || `Upload failed with status ${res.status}`),
      };
    }

    const media = (json?.data ?? json) as BackendMedia;
    if (media.url) {
      const problem = mediaUrlProblem(media.url, typeof window === "undefined" ? undefined : window.location.hostname);
      if (problem) {
        return {
          data: null,
          error: uploadError(502, `Your file was uploaded but ${problem}. Ask the site administrator to check the media storage settings.`),
        };
      }
    }
    return {
      data: {
        id: media.id,
        url: media.url ?? null,
        filename: media.originalFilename,
        mimeType: media.mimeType,
        sizeBytes: Number(media.sizeBytes),
      },
      error: null,
    };
  } catch {
    return { data: null, error: uploadError(0, "Couldn't reach the server. Check your connection and try again.") };
  }
}
