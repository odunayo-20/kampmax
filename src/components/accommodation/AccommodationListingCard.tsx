import Image from "next/image";
import Link from "next/link";
import type { PublicAccommodationListing } from "@/types/accommodation";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AccommodationListingCard({
  listing,
}: {
  listing: PublicAccommodationListing;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-kampmax-border bg-white shadow-sm">
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
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="line-clamp-2 font-semibold text-kampmax-text">{listing.title}</h2>
            {listing.category && (
              <span className="shrink-0 rounded-full bg-kampmax-muted px-2 py-1 text-[11px] text-kampmax-text-secondary">
                {listing.category.name}
              </span>
            )}
          </div>
          <p className="text-sm text-kampmax-text-secondary">
            {[listing.neighbourhood, listing.city, listing.state].filter(Boolean).join(", ")}
          </p>
          <p className="text-lg font-bold text-kampmax-blue">
            {money(listing.rentAmount, listing.currency)}
            <span className="ml-1 text-xs font-normal text-kampmax-text-secondary">
              / {listing.paymentFrequency.toLowerCase()}
            </span>
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-kampmax-text-secondary">
            <span>{listing.bedrooms} bedrooms</span>
            <span>{listing.bathrooms} bathrooms</span>
            <span>{listing.furnishingStatus.replaceAll("_", " ").toLowerCase()}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
