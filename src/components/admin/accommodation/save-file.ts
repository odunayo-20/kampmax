import type { DownloadedFile } from "@/types/accommodation";

/**
 * Offers a fetched file for saving. The file came from a signed-in request, so a
 * plain link cannot be used: it is saved from an object URL, released again at once.
 */
export function saveFile(file: DownloadedFile, fallbackName: string): void {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename?.trim() || fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
