"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MapPin, MessageCircle, Flag, Zap } from "lucide-react";
import { Storefront } from "@/types/storefront";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/atoms/Avatar";
import { StarRatingDisplay } from "@/components/reviews/StarRating";
import { StoreVerificationBadge, StoreAvailabilityBadge } from "./StoreBadges";
import { FollowButton } from "./FollowButton";
import { ShareStoreButton } from "./ShareStoreButton";
import { ContactStoreModal } from "./ContactStoreModal";
import { ReportStoreModal } from "./ReportStoreModal";

interface StoreHeaderProps {
  store: Storefront;
}

/** Cover, store identity, primary customer actions and a stats strip. */
export function StoreHeader({ store }: StoreHeaderProps) {
  const { status, user } = useAuth();
  const router = useRouter();
  const [contactOpen, setContactOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const hasRating = store.rating > 0;
  const followers = store.attestation.followers;

  function requireAuth(action: () => void) {
    if (status !== "authenticated") {
      router.push(`/login?returnTo=${encodeURIComponent(`/store/${store.slug}`)}`);
      return;
    }
    action();
  }

  const stats = [
    { label: "Products", value: store.productsCount.toLocaleString() },
    { label: "Followers", value: followers.toLocaleString() },
    {
      label: hasRating ? `Rating · ${store.reviewCount} review${store.reviewCount === 1 ? "" : "s"}` : "Rating",
      value: hasRating ? store.rating.toFixed(1) : "New",
    },
    ...(store.responseTime ? [{ label: "Replies", value: store.responseTime }] : []),
  ];

  return (
    <header className="overflow-hidden rounded-2xl border border-kampmax-border bg-white shadow-sm">
      {/* Cover */}
      <div className="relative h-40 sm:h-56 lg:h-64 bg-kampmax-navy">
        {store.coverImage ? (
          <Image
            src={store.coverImage}
            alt={`${store.storeName} cover`}
            fill
            priority
            className="object-cover"
            sizes="(min-width: 1280px) 1248px, 100vw"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-kampmax-navy via-kampmax-blue to-kampmax-blue-light"
            aria-hidden
          >
            <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-kampmax-gold/20 blur-3xl" />
          </div>
        )}
        <div
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent"
          aria-hidden
        />
        {store.availabilityStatus !== "active" && (
          <div className="absolute left-4 top-4">
            <StoreAvailabilityBadge status={store.availabilityStatus} className="bg-white shadow-sm" />
          </div>
        )}
      </div>

      <div className="px-4 pb-5 sm:px-8">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end">
          {/* Logo */}
          {store.logo ? (
            <Image
              src={store.logo}
              alt={`${store.storeName} logo`}
              width={112}
              height={112}
              className="h-24 w-24 shrink-0 rounded-2xl bg-white object-cover shadow-md ring-4 ring-white sm:h-28 sm:w-28"
            />
          ) : (
            <Avatar
              name={store.storeName}
              size="lg"
              className="h-24 w-24 shrink-0 rounded-2xl text-3xl shadow-md ring-4 ring-white sm:h-28 sm:w-28"
            />
          )}

          {/* Identity */}
          <div className="min-w-0 flex-1 sm:pb-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-kampmax-text sm:text-3xl">
                {store.storeName}
              </h1>
              {store.availabilityStatus === "active" && (
                <StoreVerificationBadge status={store.verificationStatus} />
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-kampmax-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                {hasRating ? (
                  <>
                    <StarRatingDisplay rating={store.rating} size="sm" />
                    <span className="font-semibold text-kampmax-text">{store.rating.toFixed(1)}</span>
                  </>
                ) : (
                  <span className="rounded-full bg-kampmax-gold/15 px-2 py-0.5 text-xs font-semibold text-kampmax-navy">
                    New on Kampmax
                  </span>
                )}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {store.campusName}
              </span>
              {store.responseTime && (
                <span className="inline-flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" aria-hidden />
                  {store.responseTime}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:pb-1">
            <FollowButton vendorId={store.vendorId} storeSlug={store.slug} />
            {store.contactSupported && (
              <button
                type="button"
                onClick={() => requireAuth(() => setContactOpen(true))}
                className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-4 py-2 text-sm font-semibold text-kampmax-text transition-colors hover:bg-kampmax-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Contact
              </button>
            )}
            <ShareStoreButton storeSlug={store.slug} storeName={store.storeName} />
            <button
              type="button"
              onClick={() => requireAuth(() => setReportOpen(true))}
              aria-label="Report this store"
              title="Report this store"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-kampmax-text-muted transition-colors hover:bg-kampmax-muted hover:text-kampmax-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            >
              <Flag className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {(store.tagline || store.description) && (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-kampmax-text-secondary sm:text-[15px]">
            {store.tagline || store.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <dl
        className={
          "grid grid-cols-2 gap-px border-t border-kampmax-border bg-kampmax-border [&>*:last-child:nth-child(odd)]:col-span-2 " +
          (stats.length === 3 ? "sm:grid-cols-3 sm:[&>*:last-child:nth-child(odd)]:col-span-1" : "sm:grid-cols-4")
        }
        aria-label="Store statistics"
      >
        {stats.map((s) => (
          <div key={s.label} className="bg-white px-5 py-3.5 sm:px-8">
            <dd className="text-lg font-bold leading-none text-kampmax-text">{s.value}</dd>
            <dt className="mt-1 text-xs text-kampmax-text-secondary">{s.label}</dt>
          </div>
        ))}
      </dl>

      {contactOpen && (
        <ContactStoreModal
          isOpen
          onClose={() => setContactOpen(false)}
          vendorId={store.vendorId}
          storeName={store.storeName}
        />
      )}
      <ReportStoreModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        vendorId={store.vendorId}
        userId={user?.id || ""}
        storeName={store.storeName}
      />
    </header>
  );
}
