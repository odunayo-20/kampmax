"use client";

import { useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { uploadFileDirect } from "@/services/media";

export const inputClass =
  "w-full rounded-xl border border-kampmax-border bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-kampmax-blue disabled:bg-neutral-50";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="mt-0.5 block text-[11px] font-normal text-error-700">
      {message}
    </span>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-kampmax-text">
      <span className="mb-1 block">{label}</span>
      {children}
      <FieldError message={error} />
    </label>
  );
}

/** The event cover: shows the current image and uploads a replacement. */
export function CoverUpload({
  value,
  onChange,
  onBusy,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  onBusy?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    onBusy?.(true);
    setFailed(false);
    const { data } = await uploadFileDirect(file, "banner");
    setUploading(false);
    onBusy?.(false);
    if (data?.url) onChange(data.url);
    else setFailed(true);
  }

  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-kampmax-text">Cover image (optional)</p>
      <label className="relative flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-kampmax-border-strong bg-kampmax-muted text-kampmax-text-muted">
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Cover preview" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs">
            <ImagePlus className="h-6 w-6" /> Upload a cover
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => void upload(e.target.files?.[0])}
        />
      </label>
      {failed && <p role="alert" className="mt-1 text-xs text-error-700">Couldn&apos;t upload that image. Try another one.</p>}
    </div>
  );
}
