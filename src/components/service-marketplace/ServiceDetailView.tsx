"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  ChevronRight,
  Clock,
  Flag,
  MapPin,
  Star,
  ShieldCheck,
  CalendarClock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type {
  MarketplaceProvider,
  MarketplaceService,
  MarketplaceServiceReview,
} from "@/types/service-marketplace";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { useCategoryTree } from "@/hooks/use-taxonomy";
import {
  categoryIdsFor,
  getOpenDaysLabel,
  getServiceCategories,
  getServiceCategoryName,
  getServiceDurationLabel,
  getServiceLocationLabel,
  getServicePriceDisplay,
} from "@/services/service-marketplace";
import { ServiceRatingStars } from "./ServiceRatingStars";
import { ServiceFavoriteButton } from "./ServiceFavoriteButton";
import { ServiceShareButton } from "./ServiceShareButton";
import { ServiceReportModal } from "./ServiceReportModal";
import { RequestQuoteModal } from "./RequestQuoteModal";
import { ServiceCard } from "./ServiceCard";
import { ProviderCard } from "./ProviderCard";

interface ServiceDetailViewProps {
  service: MarketplaceService;
  provider: MarketplaceProvider;
  relatedServices: MarketplaceService[];
  similarProviders: MarketplaceProvider[];
  /** Recent reviews of this service. */
  reviews: MarketplaceServiceReview[];
  /** Rating across the provider's finished bookings. */
  reviewSummary: { average: number; count: number };
}

export function ServiceDetailView({
  service,
  provider,
  relatedServices,
  similarProviders,
  reviews: serviceReviews,
  reviewSummary,
}: ServiceDetailViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isQuoteOnly = service.pricingModel === "quote";

  const { data: categoryTree } = useCategoryTree("SERVICE");
  const categories = useMemo(() => getServiceCategories(categoryTree ?? []), [categoryTree]);
  const serviceCategory = useMemo(() => {
    const root = (categoryTree ?? []).find((r) => categoryIdsFor(r).includes(service.categoryId));
    return root ? categories.find((c) => c.id === root.id) : undefined;
  }, [categoryTree, categories, service.categoryId]);
  const price = getServicePriceDisplay(service.pricingModel, service.price, service.priceMax);
  const openDaysLabel = getOpenDaysLabel(provider);
  const todayIndex = (new Date().getDay() + 6) % 7; // Map Sunday..Sat → Monday-first, matching backend dayIndex
  const today = provider.availability.days[todayIndex];
  const openToday = Boolean(today?.isAvailable);

  const rating = reviewSummary.count ? reviewSummary.average : provider.rating;
  const ratingCount = reviewSummary.count ? reviewSummary.count : provider.ratingCount;


  function requireLogin() {
    if (status === "authenticated") return true;
    router.push(`/login?returnTo=${encodeURIComponent(pathname || `/services/${service.id}`)}`);
    return false;
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-neutral-500">
        <Link href="/services" className="hover:text-primary-600 hover:underline">
          Services
        </Link>
        {serviceCategory && (
          <>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <Link
              href={`/services/categories/${serviceCategory.slug}`}
              className="hover:text-primary-600 hover:underline"
            >
              {serviceCategory.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="text-neutral-700 font-medium truncate">{service.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* ── Left: gallery + about ── */}
        <div className="space-y-6 min-w-0">
          <div className="aspect-[16/9] max-h-[420px] w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
            {service.imageUrl ? (
              <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400/40">
                <Sparkles className="w-16 h-16" aria-hidden />
              </div>
            )}
          </div>

          {/* Title + meta */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {service.isFeatured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 text-accent-700 px-2.5 py-0.5 text-[11px] font-semibold">
                  <Star className="h-3 w-3" aria-hidden />
                  Featured
                </span>
              )}
              {provider.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 px-2.5 py-0.5 text-[11px] font-semibold">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Verified provider
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 leading-tight tracking-tight">
              {service.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <ServiceRatingStars rating={rating} count={ratingCount} />
              <span className="inline-flex items-center gap-1 text-sm text-neutral-500">
                <Clock className="h-4 w-4 text-neutral-400" aria-hidden />
                {getServiceDurationLabel(service.durationMinutes)}
              </span>
              <span className="inline-flex items-center gap-1 text-sm text-neutral-500">
                <MapPin className="h-4 w-4 text-neutral-400" aria-hidden />
                {getServiceLocationLabel(service.locationType)}
              </span>
            </div>
          </div>

          {/* Description */}
          <section className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-sm font-bold text-neutral-900 mb-2">About this service</h2>
            <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
              {service.description}
            </p>
            {service.whatsIncluded && service.whatsIncluded.length > 0 && (
              <ul className="mt-4 space-y-2">
                {service.whatsIncluded.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 text-success-600 mt-0.5 shrink-0" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Availability */}
          <section className="bg-white rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-neutral-900">Availability</h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  openToday ? "bg-success-50 text-success-700" : "bg-neutral-100 text-neutral-500"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    openToday ? "bg-success-500" : "bg-neutral-300"
                  )}
                  aria-hidden
                />
                {openToday ? "Open today" : "Closed today"}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mb-3">{openDaysLabel}</p>
            <div className="flex gap-1.5 flex-wrap">
              {provider.availability.days.map((d) => (
                <div
                  key={d.dayIndex}
                  className={cn(
                    "text-center rounded-lg px-2.5 py-1.5 text-[11px] font-medium border",
                    d.isAvailable
                      ? "bg-primary-50 border-primary-100 text-primary-700"
                      : "bg-neutral-50 border-neutral-100 text-neutral-400"
                  )}
                  title={d.isAvailable ? `${d.openTime}–${d.closeTime}` : "Closed"}
                >
                  <div className="font-semibold">{d.label.slice(0, 3)}</div>
                  <div className="font-normal">{d.isAvailable ? d.openTime?.slice(0, 2) ?? "—" : "—"}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-neutral-100 text-xs text-neutral-500 space-y-1">
              <p>
                Booking preference:{" "}
                <span className="text-neutral-700 font-medium">
                  {provider.availability.bookingPreference === "instant" ? "Instant confirmation" : "Requests require approval"}
                </span>
              </p>
              {provider.availability.minAdvanceNoticeHours > 0 && (
                <p>
                  Advance notice:{" "}
                  <span className="text-neutral-700 font-medium">
                    at least {provider.availability.minAdvanceNoticeHours} hour
                    {provider.availability.minAdvanceNoticeHours > 1 ? "s" : ""}
                  </span>
                </p>
              )}
            </div>
          </section>

          {/* Reviews teaser */}
          {serviceReviews.length > 0 && (
            <section className="bg-white rounded-2xl border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-neutral-900">
                  Recent reviews · {getServiceCategoryName(service.categoryId)}
                </h2>
                <Link
                  href={`/services/providers/${provider.id}#reviews`}
                  className="text-xs font-medium text-primary-600 hover:underline"
                >
                  See all
                </Link>
              </div>
              <div className="space-y-4">
                {serviceReviews.map((r) => (
                  <div key={r.id} className="border-b border-neutral-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-neutral-900">{r.authorName}</span>
                      <span className="text-[11px] text-neutral-400">
                        {new Date(r.createdAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <ServiceRatingStars rating={r.rating} className="mb-1.5" />
                    <p className="text-sm text-neutral-600 leading-relaxed">{r.comment}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Right: sticky booking panel ── */}
        <aside className="lg:sticky lg:top-[72px] space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-2xl font-bold text-primary-900 tracking-tight">{price.label}</span>
            </div>
            <p className="text-xs text-neutral-500 mb-4">{price.hint}</p>

            <div className="space-y-2.5 text-sm mb-5">
              <div className="flex justify-between gap-3">
                <span className="text-neutral-500">
                  Duration: {getServiceDurationLabel(service.durationMinutes)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-500">Where: {getServiceLocationLabel(service.locationType)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-500">Located:</span>
                <span className="text-neutral-700 font-medium inline-flex items-center gap-1">
                  {provider.primaryCampusId.toUpperCase()}
                  {provider.additionalCampusIds.length > 0 && (
                    <span className="text-neutral-400 font-normal">
                      +{provider.additionalCampusIds.length} more
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {!isQuoteOnly && (
                <button
                  type="button"
                  onClick={() => {
                    if (requireLogin()) router.push(`/services/${service.id}/book`);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
                >
                  <CalendarClock className="h-4 w-4" aria-hidden />
                  Book this service
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (requireLogin()) setQuoteOpen(true);
                }}
                className={cn(
                  "w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-semibold",
                  isQuoteOnly
                    ? "bg-primary-600 text-white hover:bg-primary-700"
                    : "border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                )}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Request a quote
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <ServiceFavoriteButton serviceId={service.id} variant="panel" />
                <ServiceShareButton serviceId={service.id} serviceName={service.name} />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-100 space-y-1.5 text-xs text-neutral-500">
              <p className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary-600" aria-hidden />
                {provider.totalBookings}+ bookings completed
              </p>
              <p className="inline-flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-primary-600" aria-hidden />
                No upfront payment — request first
              </p>
            </div>

            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="mt-4 w-full inline-flex items-center justify-center gap-1 text-xs font-medium text-neutral-400 hover:text-error-600"
            >
              <Flag className="h-3.5 w-3.5" aria-hidden />
              Report this service
            </button>
          </div>

          {/* Provider mini card */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
              Provider
            </h2>
            <Link href={`/services/providers/${provider.id}`} className="flex items-center gap-3 group">
              {provider.logoUrl ? (
                <img
                  src={provider.logoUrl}
                  alt=""
                  loading="lazy"
                  className="w-12 h-12 rounded-xl object-cover border border-neutral-200"
                />
              ) : (
                <span className="w-12 h-12 rounded-xl bg-primary-50 border border-neutral-200 flex items-center justify-center text-primary-600 font-bold text-lg">
                  {provider.displayName.slice(0, 1)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-neutral-900 truncate group-hover:text-primary-600 transition-colors">
                    {provider.displayName}
                  </span>
                  {provider.verified && (
                    <BadgeCheck className="w-4 h-4 text-primary-600 shrink-0" aria-label="Verified provider" />
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 truncate">
                  {getServiceCategoryName(provider.primaryCategoryId)}
                </p>
                {provider.responseTime && (
                  <p className="text-[11px] text-neutral-400">
                    Responds {provider.responseTime}
                  </p>
                )}
              </div>
            </Link>
          </div>
        </aside>
      </div>

      {/* ── More from this provider / category ── */}
      {relatedServices.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-neutral-900">
            More from {provider.displayName}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {relatedServices.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </section>
      )}

      {/* ── Similar providers ── */}
      {similarProviders.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-neutral-900">Similar providers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {similarProviders.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        </section>
      )}

      {/* Modals */}
      <RequestQuoteModal
        isOpen={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        serviceId={service.id}
        serviceName={service.name}
        providerId={provider.id}
        providerDisplayName={provider.displayName}
      />
      <ServiceReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        serviceId={service.id}
        serviceName={service.name}
      />
    </div>
  );
}