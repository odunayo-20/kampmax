import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Heart } from "lucide-react";
import type { PublicAccommodationListing } from "@/types/accommodation";
import { cn } from "@/lib/utils";
import { factsText, placeText, rentText } from "@/lib/accommodation-text";

/**
 * One place to live: photo, rent, area and the facts that decide whether to look closer. Clicking opens it.
 * With `onToggleSave` the card also carries a heart, as in the app.
 */
export function AccommodationListingCard({
  listing,
  saved = false,
  saving = false,
  onToggleSave,
}: {
  listing: PublicAccommodationListing;
  saved?: boolean;
  saving?: boolean;
  onToggleSave?: () => void;
}) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-kampmax-border bg-white shadow-sm">
      <Link
        href={`/accommodation/${listing.id}`}
        className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue"
      >
        <div className="relative aspect-[4/3] bg-kampmax-muted">
          {listing.coverImage ? (
            <Image
              src={listing.coverImage}
              alt=""
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-kampmax-text-secondary">
              Photos coming soon
            </div>
          )}
          {listing.category && (
            <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">
              {listing.category.name}
            </span>
          )}
        </div>
        <div className="space-y-1 p-4">
          <h2 className="line-clamp-2 font-semibold text-kampmax-text">{listing.title}</h2>
          <p className="text-lg font-bold text-kampmax-blue">{rentText(listing)}</p>
          <p className="truncate text-sm text-kampmax-text-secondary">{placeText(listing)}</p>
          <p className="text-sm text-kampmax-text-secondary">{factsText(listing)}</p>
          <p className="flex items-center gap-1 pt-0.5 text-xs font-semibold text-success-700">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            <span className="truncate">{listing.agent.name}</span>
          </p>
        </div>
      </Link>
      {onToggleSave && (
        <button
          type="button"
          onClick={onToggleSave}
          disabled={saving}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm hover:bg-white disabled:opacity-60"
        >
          <Heart className={cn("h-4 w-4", saved ? "fill-error-600 text-error-600" : "text-neutral-700")} aria-hidden />
        </button>
      )}
    </article>
  );
}
