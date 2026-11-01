"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/** Only secure web addresses are ever shown; anything else (javascript:, data:, http:) is refused. */
export function isSafeImageUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A larger look at a picture, inside the page. It never navigates anywhere: an
 * admin reviewing content stays in the console instead of being sent to the
 * image host's address. The console's own address isn't sent to the host either.
 */
export function ImagePreviewDialog({
  image,
  onClose,
}: {
  image: { url: string; title: string } | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = image !== null && isSafeImageUrl(image.url);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !image) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo of ${image.title}`}
    >
      <button
        type="button"
        aria-label="Close preview"
        tabIndex={-1}
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div className="relative max-h-full max-w-3xl">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-kampmax-text shadow-md hover:bg-kampmax-muted"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <img
          src={image.url}
          alt={`Photo of ${image.title}`}
          referrerPolicy="no-referrer"
          className="max-h-[85vh] w-auto max-w-full rounded-lg bg-white object-contain"
        />
      </div>
    </div>
  );
}
