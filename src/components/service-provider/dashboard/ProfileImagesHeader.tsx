"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useProviderImageUpload } from "@/hooks/useProviderImageUpload";
import { setMyProviderImages } from "@/services/service-provider-media";

interface ProfileImagesHeaderProps {
  displayName: string;
  logo?: string | null;
  coverImage?: string | null;
  /** Shown next to the logo (the verification badge). */
  badge?: React.ReactNode;
  /** Called after the server has saved a change, so the page can reload the profile. */
  onChanged: () => void;
}

/** The provider's cover and logo, with controls to change or take them down. */
export function ProfileImagesHeader({ displayName, logo, coverImage, badge, onChanged }: ProfileImagesHeaderProps) {
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const { upload, busy, error: uploadError, clearError } = useProviderImageUpload();
  const [working, setWorking] = useState<"logo" | "cover" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function choose(file: File | undefined, field: "logo" | "cover") {
    if (!file) return;
    setSaveError(null);
    setWorking(field);
    const uploaded = await upload(file, field === "logo" ? "logo" : "coverImage");
    if (uploaded) {
      const res = await setMyProviderImages(
        field === "logo" ? { logoMediaId: uploaded.mediaId } : { coverMediaId: uploaded.mediaId }
      );
      if (res.ok) onChanged();
      else setSaveError(res.error ?? "We couldn't save that picture.");
    }
    setWorking(null);
  }

  async function remove(field: "logo" | "cover") {
    clearError();
    setSaveError(null);
    setWorking(field);
    const res = await setMyProviderImages(field === "logo" ? { logoMediaId: null } : { coverMediaId: null });
    if (res.ok) onChanged();
    else setSaveError(res.error ?? "We couldn't remove that picture.");
    setWorking(null);
  }

  const error = saveError ?? uploadError;
  const disabled = busy || working !== null;

  return (
    <div className="overflow-hidden rounded-xl border border-kampmax-border bg-white">
      <div className="relative h-36 w-full bg-gradient-to-r from-primary-600/20 to-kampmax-gold/30 sm:h-44">
        {coverImage && <img src={coverImage} alt="Cover" className="h-full w-full object-cover" />}
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            type="button"
            onClick={() => coverInput.current?.click()}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-kampmax-text shadow-sm hover:bg-white disabled:opacity-60"
          >
            {working === "cover" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Upload className="h-3.5 w-3.5" aria-hidden />}
            {coverImage ? "Change cover" : "Add cover"}
          </button>
          {coverImage && (
            <button
              type="button"
              onClick={() => void remove("cover")}
              disabled={disabled}
              aria-label="Remove cover image"
              className="rounded-lg bg-white/90 p-1.5 text-kampmax-text shadow-sm hover:bg-white disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
      <div className="px-5 pb-5">
        <div className="-mt-10 flex items-end gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-primary-100 text-primary-600 shadow-sm">
            {logo ? (
              <img src={logo} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-10 w-10" aria-hidden />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {badge}
            <button
              type="button"
              onClick={() => logoInput.current?.click()}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-lg border border-kampmax-border bg-white px-3 py-1.5 text-xs font-semibold text-kampmax-text hover:bg-neutral-50 disabled:opacity-60"
            >
              {working === "logo" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Upload className="h-3.5 w-3.5" aria-hidden />}
              {logo ? "Change photo" : "Add photo"}
            </button>
            {logo && (
              <button
                type="button"
                onClick={() => void remove("logo")}
                disabled={disabled}
                className="rounded-lg border border-kampmax-border bg-white px-3 py-1.5 text-xs font-semibold text-kampmax-text hover:bg-neutral-50 disabled:opacity-60"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-xs text-kampmax-error">
            {error}
          </p>
        )}
      </div>

      <input
        ref={logoInput}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Choose a profile photo"
        onChange={(e) => {
          void choose(e.target.files?.[0], "logo");
          e.target.value = "";
        }}
      />
      <input
        ref={coverInput}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Choose a cover image"
        onChange={(e) => {
          void choose(e.target.files?.[0], "cover");
          e.target.value = "";
        }}
      />
    </div>
  );
}
