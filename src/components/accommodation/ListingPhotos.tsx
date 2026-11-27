"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { describeHousingError } from "@/lib/accommodation-text";
import { MAX_LISTING_PHOTOS, type ListingPhoto } from "@/lib/agent-listings";
import { accommodationApi } from "@/services/accommodation";

/**
 * A listing's photos: each uploads as soon as it is chosen, can be removed, and can be made the cover (the first).
 * The parent keeps the list and sends it, in this order, when the listing is saved. Like the mobile ServiceImages.
 */
export function ListingPhotos({ value, onChange, onBusyChange }: { value: ListingPhoto[]; onChange: (photos: ListingPhoto[]) => void; onBusyChange: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const room = MAX_LISTING_PHOTOS - value.length;

  async function choose(files: File[]) {
    setProblem(null);
    setBusy(true);
    onBusyChange(true);
    // Add as many as fit; on the first failure stop, keeping the ones that went through.
    const added: ListingPhoto[] = [];
    try {
      for (const file of files.slice(0, room)) {
        const media = await accommodationApi.uploadListingImage(file);
        if (media.url) added.push({ id: media.id, url: media.url });
      }
    } catch (reason) {
      setProblem(describeHousingError(reason));
    } finally {
      if (added.length > 0) onChange([...value, ...added]);
      if (files.length > room) setProblem(`Only ${MAX_LISTING_PHOTOS} photos fit, so the rest were left out.`);
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-3">
        {value.map((p, i) => (
          <li key={p.id} className="relative h-24 w-32 overflow-hidden rounded-lg border border-kampmax-border bg-kampmax-muted">
            <Image src={p.url} alt={i === 0 ? "Cover photo" : `Photo ${i + 1}`} fill unoptimized sizes="128px" className="object-cover" />
            {i === 0 ? (
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] font-semibold text-white">Cover</span>
            ) : (
              <button type="button" disabled={busy} onClick={() => onChange([p, ...value.filter((x) => x.id !== p.id)])} className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] font-semibold text-white hover:bg-black/80">
                Make cover
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => onChange(value.filter((x) => x.id !== p.id))}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
        {room > 0 && (
          <li>
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="flex h-24 w-32 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-kampmax-border text-xs text-kampmax-text-secondary hover:border-kampmax-blue disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ImagePlus className="h-5 w-5" aria-hidden />}
              {busy ? "Uploading…" : "Add photos"}
            </button>
          </li>
        )}
      </ul>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) void choose(files);
        }}
      />
      <p className="mt-1 text-xs text-kampmax-text-secondary">{value.length}/{MAX_LISTING_PHOTOS}</p>
      {problem && <p role="alert" className="mt-1 text-xs text-red-700">{problem}</p>}
    </div>
  );
}
