import { CV_ALLOWED_EXTENSIONS, CV_MAX_BYTES } from "@/config/cv";

/** "120 KB", "2.4 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Why a file cannot be a CV, or null when it can. Checks the name and size
 * only; the server also checks the file's real content.
 */
export function validateCvFile(file: { name: string; size: number }): string | null {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (!(CV_ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return "A CV must be a PDF or a Word (.docx) file.";
  }
  if (file.size === 0) return "That file is empty.";
  if (file.size > CV_MAX_BYTES) {
    return `That file is ${formatFileSize(file.size)}. A CV can be up to ${formatFileSize(CV_MAX_BYTES)}.`;
  }
  return null;
}
