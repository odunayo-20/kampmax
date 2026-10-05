"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { blogAdminApi } from "@/services/admin/blog-management.api";
import { BUTTON_SECONDARY } from "./blog-meta";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 10 * 1024 * 1024;

interface ImageFieldProps {
  label: string;
  hint?: string;
  url: string | null;
  disabled?: boolean;
  /** Called with the uploaded file's URL and media id, or nulls when removed. */
  onChange: (value: { url: string | null; mediaId: string | null }) => void;
  onError: (message: string) => void;
}

/** Upload/replace/remove image control with a preview. Validates type and size before sending. */
export function ImageField({ label, hint, url, disabled, onChange, onError }: ImageFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) return onError("Use a JPG, PNG, WebP or GIF image.");
    if (file.size > MAX_BYTES) return onError("That image is larger than 10 MB. Choose a smaller one.");
    setUploading(true);
    try {
      const media = await blogAdminApi.uploadCover(file);
      onChange({ url: media.url, mediaId: media.id });
    } catch (error) {
      onError(error instanceof Error ? error.message : "The upload failed. Try again.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-kampmax-text">{label}</p>
      {url ? (
        <div className="overflow-hidden rounded-lg border border-kampmax-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`${label} preview`} className="aspect-[16/9] w-full bg-kampmax-muted object-cover" />
        </div>
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center rounded-lg border border-dashed border-kampmax-border-strong bg-kampmax-muted/50 text-xs text-kampmax-text-muted">
          No image
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <input ref={input} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-label={`${label} file`} onChange={(e) => void handleFile(e.target.files?.[0])} />
        <button type="button" disabled={disabled || uploading} onClick={() => input.current?.click()} className={BUTTON_SECONDARY}>
          {uploading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <ImagePlus aria-hidden className="h-4 w-4" />}
          {uploading ? "Uploading…" : url ? "Replace" : "Upload"}
        </button>
        {url && !uploading && (
          <button type="button" disabled={disabled} onClick={() => onChange({ url: null, mediaId: null })} className={BUTTON_SECONDARY}>
            <Trash2 aria-hidden className="h-4 w-4" /> Remove
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-kampmax-text-muted">{hint}</p>}
    </div>
  );
}
