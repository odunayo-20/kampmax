"use client";

import { useRef } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useProviderImageUpload } from "@/hooks/useProviderImageUpload";
import { optimizedImageUrl } from "@/lib/image-url";
import { PortfolioPhotoChooser } from "./PortfolioPhotoChooser";
import type { UploadedProviderImage } from "@/services/service-provider-media";

/**
 * The photo customers see for a service, on its card and its page. The picture is
 * uploaded as soon as it is chosen; the parent keeps its media id and sends it with
 * the service. `imageUrl` is what to preview (a saved or just-uploaded picture).
 */
export function ServiceImagePicker({
  imageUrl,
  onChange,
}: {
  imageUrl?: string | null;
  onChange: (image: UploadedProviderImage | null) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const { upload, busy, error } = useProviderImageUpload();

  async function choose(file: File | undefined) {
    if (!file) return;
    const uploaded = await upload(file, "coverImage");
    if (uploaded) onChange(uploaded);
  }

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-kampmax-text">Photo</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-kampmax-border bg-neutral-100 sm:w-48">
          {imageUrl ? (
            <img
              src={optimizedImageUrl(imageUrl, { width: 400, aspect: "4:3" })}
              alt="Service photo preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-400">
              <ImagePlus className="h-8 w-8" aria-hidden />
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-primary-600" aria-label="Uploading photo" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-kampmax-text-secondary">
            Shown on your service card. A clear, well-lit photo gets more bookings. JPG, PNG or WebP, up to 5MB.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}>
              <ImagePlus className="mr-1.5 h-4 w-4" aria-hidden />
              {imageUrl ? "Replace photo" : "Add a photo"}
            </Button>
            {imageUrl && (
              <Button type="button" variant="outline" onClick={() => onChange(null)} disabled={busy}>
                <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                Remove
              </Button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-kampmax-error">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3">
        <PortfolioPhotoChooser onPick={onChange} disabled={busy} />
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Choose a service photo"
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
