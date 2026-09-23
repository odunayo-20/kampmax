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
