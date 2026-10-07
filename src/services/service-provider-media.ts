import { apiClient } from "@/lib/api-client";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { uploadFileDirect } from "@/services/media";

// ============================================================
// SERVICE PROVIDER IMAGES (live)
// ============================================================
//
// A provider's logo, cover image and portfolio. A picture is uploaded to the
// media service first (POST /media/upload); the profile and the portfolio then
// refer to it by its media id, and the server only accepts images the signed-in
// provider uploaded themselves.
//   PATCH  /service-provider/profile/me     { logoMediaId, coverMediaId }
//   GET    /service-provider/portfolio/me
//   POST   /service-provider/portfolio      { mediaId, title, description?, categoryId? }
//   PATCH  /service-provider/portfolio/:id
//   DELETE /service-provider/portfolio/:id

export type ProviderImageKind = "avatar" | "logo" | "coverImage" | "portfolio";

export const MAX_PORTFOLIO_ITEMS = 10;
const MAX_IMAGE_MB: Record<ProviderImageKind, number> = { avatar: 5, logo: 5, coverImage: 5, portfolio: 10 };

export interface UploadedProviderImage {
  mediaId: string;
  url: string;
}

export interface ProviderPortfolioItem {
  id: string;
  image: string;
  mediaId: string;
  title: string;
  description: string;
  categoryId: string;
}

/** Why a file can't be used, in plain words; null when it's fine. */
export function imageProblem(file: File, kind: ProviderImageKind): string | null {
  if (!file.type.startsWith("image/")) return "Please choose an image file (JPG, PNG or WebP).";
  const max = MAX_IMAGE_MB[kind];
  if (file.size > max * 1024 * 1024) return `That image is too large. The limit is ${max}MB.`;
  return null;
}

/** Uploads one picture for the profile; throws with a readable message if it didn't go through. */
export async function uploadProviderImage(file: File, kind: ProviderImageKind): Promise<UploadedProviderImage> {
  const problem = imageProblem(file, kind);
  if (problem) throw new Error(problem);
  const { data, error } = await uploadFileDirect(file, kind);
  if (error || !data) throw new Error(getFriendlyErrorMessage(error ?? new Error("Upload failed")));
  if (!data.url) throw new Error("The upload finished but the image has no address yet. Please try again.");
  return { mediaId: data.id, url: data.url };
}

/** Shows (or, with null, takes down) the logo and cover on my public profile. */
export async function setMyProviderImages(
  images: { logoMediaId?: string | null; coverMediaId?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await apiClient.patch("/service-provider/profile/me", images);
  return error ? { ok: false, error: getFriendlyErrorMessage(error) } : { ok: true };
}

export async function fetchMyPortfolio(): Promise<ProviderPortfolioItem[]> {
  const { data, error } = await apiClient.get<ProviderPortfolioItem[]>("/service-provider/portfolio/me");
  if (error) throw error;
  return data ?? [];
}

export async function addMyPortfolioItem(input: {
  mediaId: string;
  title: string;
  description?: string;
  categoryId?: string;
}): Promise<{ ok: true; item: ProviderPortfolioItem } | { ok: false; error: string }> {
  const body = {
    mediaId: input.mediaId,
    title: input.title.trim(),
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
  };
  const { data, error } = await apiClient.post<typeof body, ProviderPortfolioItem>("/service-provider/portfolio", body);
  return error || !data ? { ok: false, error: getFriendlyErrorMessage(error) } : { ok: true, item: data };
}

export async function updateMyPortfolioItem(
  id: string,
  patch: { mediaId?: string; title?: string; description?: string; categoryId?: string }
): Promise<{ ok: true; item: ProviderPortfolioItem } | { ok: false; error: string }> {
  const { data, error } = await apiClient.patch<typeof patch, ProviderPortfolioItem>(
    `/service-provider/portfolio/${encodeURIComponent(id)}`,
    patch
  );
  return error || !data ? { ok: false, error: getFriendlyErrorMessage(error) } : { ok: true, item: data };
}

export async function removeMyPortfolioItem(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await apiClient.delete(`/service-provider/portfolio/${encodeURIComponent(id)}`);
  return error ? { ok: false, error: getFriendlyErrorMessage(error) } : { ok: true };
}
