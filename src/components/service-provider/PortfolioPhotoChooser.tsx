"use client";

import { useState } from "react";
import { Images, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { optimizedImageUrl } from "@/lib/image-url";
import { fetchMyPortfolio } from "@/services/service-provider-media";
import type { ProviderPortfolioItem, UploadedProviderImage } from "@/services/service-provider-media";

/**
 * Lets a provider reuse a photo already in their portfolio instead of uploading it
 * again. `exclude` hides photos that are already chosen.
 */
export function PortfolioPhotoChooser({
  onPick,
  exclude = [],
  disabled,
}: {
  onPick: (image: UploadedProviderImage) => void;
  exclude?: readonly string[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ProviderPortfolioItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (open) return setOpen(false);
    setOpen(true);
    setError(null);
    setLoading(true);
    try {
      setItems(await fetchMyPortfolio());
    } catch (e) {
      setError(getFriendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const available = (items ?? []).filter((item) => !exclude.includes(item.mediaId));

  return (
    <div>
      <Button type="button" variant="outline" onClick={toggle} disabled={disabled} aria-expanded={open}>
        <Images className="mr-1.5 h-4 w-4" aria-hidden />
        From my portfolio
      </Button>

      {open && (
        <div className="mt-3 rounded-lg border border-kampmax-border bg-white p-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary-600" aria-label="Loading portfolio" />
            </div>
          ) : error ? (
            <p role="alert" className="text-sm text-kampmax-error">
              {error}
            </p>
          ) : available.length === 0 ? (
            <p className="text-sm text-kampmax-text-secondary">
              {items && items.length > 0
                ? "All your portfolio photos are already used here."
                : "No portfolio photos yet. Add some on the Portfolio page, then choose one here."}
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Your portfolio photos">
              {available.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick({ mediaId: item.mediaId, url: item.image });
                      setOpen(false);
                    }}
                    aria-label={`Use "${item.title}"`}
                    className="block aspect-[4/3] w-full overflow-hidden rounded-lg border-2 border-transparent bg-neutral-100 hover:border-primary-400 focus-visible:border-primary-600 focus-visible:outline-none"
                  >
                    <img
                      src={optimizedImageUrl(item.image, { width: 240, aspect: "4:3" })}
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
      )}
    </div>
  );
}
