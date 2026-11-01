"use client";

import { useRef } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useProviderImageUpload } from "@/hooks/useProviderImageUpload";
import { optimizedImageUrl } from "@/lib/image-url";
import { PortfolioPhotoChooser } from "./PortfolioPhotoChooser";
import { MAX_SERVICE_GALLERY } from "@/services/service-provider-media";

export interface GalleryImage {
  mediaId: string;
  url: string;
}

/**
 * More photos of a service, shown after its main one on the service page. Each is
 * uploaded as soon as it is chosen; the parent keeps the list and sends the media
 * ids, in this order, when the service is saved.
 */
export function ServiceGalleryPicker({
  images,
  onChange,
}: {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const { upload, busy, error } = useProviderImageUpload();
  const room = MAX_SERVICE_GALLERY - images.length;

  async function choose(files: File[]) {
    // Add as many as fit. On the first failure stop (so its message stays on screen)
    // but keep the ones that already went through.
    const added: GalleryImage[] = [];
    for (const file of files.slice(0, room)) {
      const uploaded = await upload(file, "coverImage");
      if (!uploaded) break;
      added.push(uploaded);
    }
    if (added.length > 0) onChange([...images, ...added]);
  }

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-kampmax-text">
        More photos{" "}
        <span className="text-xs font-normal text-kampmax-text-secondary">
          ({images.length}/{MAX_SERVICE_GALLERY})
        </span>
      </p>
      <ul className="flex flex-wrap gap-3">
        {images.map((image, i) => (
          <li
            key={image.mediaId}
            className="relative aspect-[4/3] w-28 overflow-hidden rounded-lg border border-kampmax-border bg-neutral-100"
          >
            <img
              src={optimizedImageUrl(image.url, { width: 240, aspect: "4:3" })}
              alt={`Service photo ${i + 2}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(images.filter((x) => x.mediaId !== image.mediaId))}
              aria-label={`Remove photo ${i + 2}`}
              disabled={busy}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
        {room > 0 && (
          <li>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="flex aspect-[4/3] w-28 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-neutral-300 text-xs font-medium text-kampmax-text-secondary hover:border-primary-400 hover:text-primary-600 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-label="Uploading photos" />
              ) : (
                <ImagePlus className="h-5 w-5" aria-hidden />
              )}
              {busy ? "Uploading…" : "Add photos"}
            </button>
          </li>
        )}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-kampmax-error">
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-kampmax-text-secondary">
        Show the result, the tools or the place. Customers see these on your service page.
      </p>
      {room > 0 && (
        <div className="mt-3">
          <PortfolioPhotoChooser
            onPick={(image) => onChange([...images, image])}
            exclude={images.map((i) => i.mediaId)}
            disabled={busy}
          />
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label="Choose more service photos"
        onChange={(e) => {
          void choose(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}
