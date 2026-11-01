"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { optimizedImageUrl } from "@/lib/image-url";

/** The service's pictures: a large one, and thumbnails to switch between them when there are several. */
export function ServiceGallery({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const current = images[Math.min(selected, images.length - 1)];

  return (
    <div className="space-y-2">
      <div className="aspect-[16/9] max-h-[420px] w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
        {current ? (
          <img src={optimizedImageUrl(current, { width: 1200 })} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400/40">
            <ImageIcon className="w-16 h-16" aria-hidden />
          </div>
        )}
      </div>

      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto" aria-label="More photos of this service">
          {images.map((url, i) => (
            <li key={url} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelected(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-current={i === selected ? "true" : undefined}
                className={cn(
                  "block h-16 w-24 overflow-hidden rounded-lg border-2 bg-neutral-100",
                  i === selected ? "border-primary-600" : "border-transparent hover:border-primary-300"
                )}
              >
                <img
                  src={optimizedImageUrl(url, { width: 200, aspect: "4:3" })}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
