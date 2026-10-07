"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  MapPin,
  ShieldCheck,
  Briefcase,
  CalendarClock,
  Clock,
  Globe,
  Star,
  CheckCircle2,
} from "lucide-react";
import type {
  MarketplaceProvider,
  MarketplaceService,
  MarketplaceServiceReview,
} from "@/types/service-marketplace";
import { cn } from "@/lib/utils";
import {
  getServiceCategoryName,
  getOpenDaysLabel,
} from "@/services/service-marketplace";
import { ServiceRatingStars } from "./ServiceRatingStars";
import { ServiceCard } from "./ServiceCard";
import { ProviderCard } from "./ProviderCard";

interface ProviderProfileViewProps {
  provider: MarketplaceProvider;
  services: MarketplaceService[];
  reviews: MarketplaceServiceReview[];
  reviewSummary: {
    average: number;
    count: number;
    distribution: { star: number; count: number }[];
  };
  relatedProviders: MarketplaceProvider[];
}

export function ProviderProfileView({
  provider,
  services,
  reviews,
  reviewSummary,
  relatedProviders,
}: ProviderProfileViewProps) {
  const openDaysLabel = useMemo(() => getOpenDaysLabel(provider), [provider]);
  const todayIndex = (new Date().getDay() + 6) % 7; // Monday-first, matches backend dayIndex
  const today = provider.availability.days[todayIndex];
  const openToday = Boolean(today?.isAvailable);

  const maxDist = useMemo(
    () => Math.max(...reviewSummary.distribution.map((d) => d.count), 1),
    [reviewSummary.distribution]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div
          className={cn(
            "h-28 sm:h-32 w-full",
            provider.coverUrl
              ? "bg-cover bg-center"
              : "bg-gradient-to-r from-primary-600 to-primary-400"
          )}
          style={provider.coverUrl ? { backgroundImage: `url(${provider.coverUrl})` } : undefined}
          aria-hidden
        />
        <div className="px-5 sm:px-6 pb-6">
          <div className="-mt-10 flex items-end gap-4 flex-wrap">
            {provider.logoUrl ? (
              <img
                src={provider.logoUrl}
                alt={provider.displayName}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-sm bg-white"
              />
            ) : (
              <span className="w-20 h-20 rounded-2xl bg-primary-50 border-4 border-white shadow-sm flex items-center justify-center text-primary-600 font-bold text-2xl">
                {provider.displayName.slice(0, 1)}
              </span>
            )}
            <div className="pb-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                  {provider.displayName}
                </h1>
                {provider.verified && (
                  <BadgeCheck className="h-5 w-5 text-primary-600" aria-label="Verified provider" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <ServiceRatingStars rating={reviewSummary.average} count={reviewSummary.count} />
                <span className="text-xs text-neutral-500">
                  {getServiceCategoryName(provider.primaryCategoryId)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                  <MapPin className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                  {provider.serviceCities?.join(", ") || "Kampmax"}
                </span>
              </div>
            </div>
          </div>

          {provider.tagline && (
            <p className="mt-4 text-sm text-neutral-600 leading-relaxed max-w-2xl">
              {provider.tagline}
            </p>
          )}
          {provider.description && (
            <p className="mt-2 text-sm text-neutral-500 leading-relaxed max-w-2xl whitespace-pre-line">
              {provider.description}
            </p>
          )}

          {/* Stats + trust */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
              <p className="text-lg font-bold text-neutral-900">{services.length}</p>
              <p className="text-[11px] text-neutral-500">Active services</p>
            </div>
            <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
              <p className="text-lg font-bold text-neutral-900">{provider.totalBookings}</p>
              <p className="text-[11px] text-neutral-500">Bookings completed</p>
            </div>
            <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
              <p className="text-lg font-bold text-neutral-900">{provider.joinedYear}</p>
              <p className="text-[11px] text-neutral-500">Joined Kampmax</p>
            </div>
            <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
              <p className="text-sm font-bold text-neutral-900 truncate">
                {provider.responseTime ?? "—"}
              </p>
              <p className="text-[11px] text-neutral-500">Avg. response</p>
            </div>
          </div>

          {/* CTA row */}
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="#services"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
            >
              <Briefcase className="h-4 w-4" aria-hidden />
              Browse services
            </a>
            <a
              href="#availability"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-neutral-200 text-neutral-700 text-sm font-semibold hover:bg-neutral-100"
            >
              <CalendarClock className="h-4 w-4" aria-hidden />
              Check availability
            </a>
          </div>
        </div>
      </section>

      {/* Trust chips */}
      <section className="flex flex-wrap gap-2" aria-label="Provider trust signals">
        {provider.verified && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-100 px-3 py-1.5 text-xs font-semibold text-primary-700">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Verification approved
          </span>
        )}
        {provider.specialties.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 border border-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600">
            <CheckCircle2 className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
            {provider.specialties.slice(0, 3).join(" · ")}
          </span>
        )}
        {provider.languages && provider.languages.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 border border-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600">
            <Globe className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
            {provider.languages.join(", ")}
          </span>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Services */}
        <section id="services" className="lg:col-span-2 space-y-4 scroll-mt-20">
          <h2 className="text-lg font-bold text-neutral-900">Services</h2>
          {services.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
              <p className="text-sm text-neutral-500">
                This provider has no available services right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((s) => (
                <ServiceCard key={s.id} service={s} provider={provider} />
              ))}
            </div>
          )}
        </section>

        {/* Availability */}
        <aside id="availability" className="space-y-4 scroll-mt-20">
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
                    "text-center rounded-lg px-2 py-1.5 text-[11px] font-medium border",
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

          {/* Policies */}
          {provider.policies.length > 0 && (
            <section className="bg-white rounded-2xl border border-neutral-200 p-5">
              <h2 className="text-sm font-bold text-neutral-900 mb-3">Policies</h2>
              <div className="space-y-2.5">
                {provider.policies.map((p) => (
                  <div key={p.title}>
                    <p className="text-xs font-semibold text-neutral-800">{p.title}</p>
                    <p className="text-xs text-neutral-500 leading-relaxed">{p.body}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Portfolio */}
          {provider.portfolio.length > 0 && (
            <section className="bg-white rounded-2xl border border-neutral-200 p-5">
              <h2 className="text-sm font-bold text-neutral-900 mb-3">Portfolio</h2>
              <div className="grid grid-cols-3 gap-2">
                {provider.portfolio.slice(0, 6).map((item) => (
                  <img
                    key={item.id}
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="aspect-square w-full object-cover rounded-lg border border-neutral-100"
                  />
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* Reviews */}
      <section id="reviews" className="scroll-mt-20 space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">Reviews</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-end gap-3 mb-4">
              <span className="text-5xl font-extrabold text-neutral-900 leading-none">
                {reviewSummary.average.toFixed(1)}
              </span>
              <div className="pb-1">
                <ServiceRatingStars rating={reviewSummary.average} />
                <p className="text-xs text-neutral-500 mt-1">
                  {reviewSummary.count} review{reviewSummary.count === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {reviewSummary.distribution.map((d) => (
                <div key={d.star} className="flex items-center gap-2 text-xs">
                  <span className="w-8 flex items-center gap-0.5 text-neutral-500 font-medium">
                    {d.star} <Star className="h-3 w-3 text-accent-500 fill-accent-500" aria-hidden />
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent-400"
                      style={{ width: `${(d.count / maxDist) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-neutral-400">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {reviews.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
                <p className="text-sm text-neutral-500">
                  No reviews yet. Be the first to recommend {provider.displayName}.
                </p>
              </div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-neutral-200 p-5">
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
                  <p className="mt-2 text-[11px] text-neutral-400 inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden />
                    {getServiceCategoryName(provider.primaryCategoryId)} service
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Similar providers */}
      {relatedProviders.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-neutral-900">Similar providers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {relatedProviders.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        </section>
      )}

      {/* Back link */}
      <div className="pt-2">
        <Link
          href="/services"
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          ← Back to all services
        </Link>
      </div>
    </div>
  );
}