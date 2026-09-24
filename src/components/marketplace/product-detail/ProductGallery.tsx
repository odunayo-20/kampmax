"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[];
  title: string;
  hasDiscount?: boolean;
  discountPct?: number;
  onImageClick?: () => void;
  onBack?: () => void;
  showBack?: boolean;
}

// Legacy uploads stored on the local backend (http://localhost:...) aren't served
// and aren't an allowed next/image host, so they would crash the page.
const isLegacyLocalUrl = (src: string) => /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(src);

export function ProductGallery({ images: allImages, title, hasDiscount, discountPct, onImageClick, onBack, showBack }: ProductGalleryProps) {
  const images = allImages.filter((src) => !isLegacyLocalUrl(src));
  const [activeImage, setActiveImage] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (!images.length) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setActiveImage((i) => (i - 1 + images.length) % images.length);
    if (e.key === "ArrowRight") setActiveImage((i) => (i + 1) % images.length);
    if (e.key === "Escape") setLightbox(false);
  };

  return (
    <div className="relative bg-white lg:rounded-[10px] lg:border lg:border-neutral-200 lg:overflow-hidden" onKeyDown={handleKeyDown}>
      {/* Mobile top actions */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between lg:hidden">
        {showBack && onBack && (
          <button onClick={onBack} aria-label="Go back" className="h-9 w-9 flex items-center justify-center rounded-full bg-black/45 backdrop-blur text-white hover:bg-black/60 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <button
            aria-label="Save to wishlist"
            className="h-9 w-9 flex items-center justify-center rounded-full bg-black/45 backdrop-blur text-white hover:bg-black/60 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          </button>
          <button
            aria-label="Share"
            onClick={() => navigator.share?.({ title, url: window.location.href }).catch(() => {})}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-black/45 backdrop-blur text-white hover:bg-black/60 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          </button>
        </div>
      </div>

      {/* Main image */}
      <div className="relative aspect-square bg-neutral-50 overflow-hidden">
        <Image
          src={images[activeImage]}
          alt={title}
          fill
          className="object-cover cursor-zoom-in"
          sizes="(max-width: 1024px) 100vw, 560px"
          priority
          onClick={() => setLightbox(true)}
        />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
              aria-label="Previous image"
              className="hidden lg:flex absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-white/90 border border-neutral-200 text-neutral-700 hover:bg-white shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setActiveImage((i) => (i + 1) % images.length)}
              aria-label="Next image"
              className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-white/90 border border-neutral-200 text-neutral-700 hover:bg-white shadow-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        <div className="absolute bottom-3 right-3 lg:hidden bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-full">
          {activeImage + 1} / {images.length}
        </div>
        {hasDiscount && discountPct && (
          <div className="absolute bottom-3 left-3 bg-error-600 text-white text-xs font-bold px-2 py-1 rounded-md">
            {discountPct}% OFF
          </div>
        )}
        <button
          onClick={() => setLightbox(true)}
          className="hidden lg:flex absolute bottom-3 right-3 items-center gap-1.5 bg-white/90 border border-neutral-200 rounded-full px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-white shadow-sm"
        >
          <Eye className="h-3.5 w-3.5" /> Zoom
        </button>
      </div>

      {/* Thumbnails desktop */}
      {images.length > 1 && (
        <div className="hidden lg:flex gap-2 p-3 border-t border-neutral-200 bg-white overflow-x-auto">
          {images.map((src, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImage(idx)}
              aria-label={`View image ${idx + 1}`}
              aria-current={idx === activeImage}
              className={cn(
                "relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border-2 bg-neutral-50",
                idx === activeImage ? "border-primary-600" : "border-transparent hover:border-neutral-300"
              )}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}

      {/* Dots mobile */}
      {images.length > 1 && (
        <div className="flex lg:hidden items-center justify-center gap-1.5 py-3 bg-white">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImage(idx)}
              aria-label={`Go to image ${idx + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === activeImage ? "w-6 bg-primary-600" : "w-1.5 bg-neutral-300"
              )}
            />
          ))}
        </div>
      )}

      {/* Mobile swipe thumbnails */}
      <div className="lg:hidden -mt-2">
        <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 py-2">
          {images.map((src, idx) => (
            <button
              key={`swipe-${idx}`}
              onClick={() => setActiveImage(idx)}
              className={cn(
                "snap-start flex-shrink-0 h-14 w-14 rounded-md overflow-hidden border bg-neutral-50 relative",
                idx === activeImage ? "border-primary-600" : "border-neutral-200"
              )}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="56px" />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onKeyDown={handleKeyDown}>
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm font-medium">{activeImage + 1} / {images.length}</span>
            <button onClick={() => setLightbox(false)} aria-label="Close viewer" className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 relative flex items-center justify-center p-4">
            <button
              onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
              className="absolute left-4 h-10 w-10 hidden sm:flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="relative w-full max-w-3xl aspect-square">
              <Image src={images[activeImage]} alt={title} fill className="object-contain" sizes="800px" />
            </div>
            <button
              onClick={() => setActiveImage((i) => (i + 1) % images.length)}
              className="absolute right-4 h-10 w-10 hidden sm:flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
          <div className="flex gap-2 justify-center p-4 overflow-x-auto">
            {images.map((src, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={cn("relative h-14 w-14 rounded-md overflow-hidden border-2 flex-shrink-0", idx === activeImage ? "border-white" : "border-transparent opacity-60")}
              >
                <Image src={src} alt="" fill className="object-cover" sizes="56px" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}