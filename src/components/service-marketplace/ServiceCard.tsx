"use client";

import Link from "next/link";
import { BadgeCheck, Clock, MapPin, Wrench, Star } from "lucide-react";
import type { MarketplaceProvider, MarketplaceService } from "@/types/service-marketplace";
import {
  getServicePriceDisplay,
  getServiceDurationLabel,
  getServiceLocationLabel,
} from "@/services/service-marketplace";
import { cn } from "@/lib/utils";
import { ServiceFavoriteButton } from "./ServiceFavoriteButton";

interface ServiceCardProps {
  service: MarketplaceService;
  provider?: MarketplaceProvider;
  className?: string;
}

export function ServiceCard({ service, provider, className }: ServiceCardProps) {
  const price = getServicePriceDisplay(service.pricingModel, service.price, service.priceMax);

  return (
    <article
      className={cn(
        "bg-white rounded-2xl border border-neutral-200/90 overflow-hidden group flex flex-col",
        "hover:border-primary-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200",
        className
      )}
    >
      <Link
        href={`/services/${service.id}`}
        className="relative aspect-[4/3] bg-neutral-100/80 overflow-hidden block shrink-0"
      >
        {service.imageUrl ? (
          <img
            src={service.imageUrl}
            alt={service.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400/40">
            <Wrench className="w-10 h-10" aria-hidden />
          </div>
        )}

        <div className="absolute top-2.5 right-2.5">
          <ServiceFavoriteButton serviceId={service.id} />
        </div>

        {service.tags?.[0] && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-neutral-900/80 backdrop-blur-xs text-white">
              {service.tags[0]}
            </span>
          </div>
        )}
      </Link>

      <div className="p-3.5 flex flex-col flex-1">
        {provider && (
          <div className="flex items-center gap-1 mb-1">
            <Link
              href={`/services/providers/${provider.id}`}
              className="text-[11px] font-medium text-neutral-500 truncate hover:text-primary-600"
              onClick={(e) => e.stopPropagation()}
            >
              {provider.displayName}
            </Link>
            {provider.verified && (
              <BadgeCheck className="w-3.5 h-3.5 text-primary-600 shrink-0" aria-label="Verified provider" />
            )}
          </div>
        )}

        <Link
          href={`/services/${service.id}`}
          className="text-xs sm:text-sm font-bold text-neutral-900 line-clamp-2 leading-snug mb-1 group-hover:text-primary-600 transition-colors"
        >
          {service.name}
        </Link>

        {provider?.rating && (
          <div className="flex items-center gap-1 mb-2 text-[11px]">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
            <span className="font-bold text-neutral-900">{provider.rating}</span>
            {provider.ratingCount && (
              <span className="text-neutral-400">({provider.ratingCount})</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-sm sm:text-base font-extrabold text-neutral-900 tracking-tight">
              {price.label}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400">
            <span className="inline-flex items-center gap-0.5">
              <Clock className="w-3 h-3" aria-hidden />
              {getServiceDurationLabel(service.durationMinutes)}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-0.5 truncate">
              <MapPin className="w-3 h-3" aria-hidden />
              <span>{getServiceLocationLabel(service.locationType)}</span>
            </span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-neutral-100">
            <Link
              href={`/services/${service.id}`}
              className="inline-flex items-center justify-center w-full h-8 rounded-xl bg-primary-50 text-primary-700 text-xs font-bold hover:bg-primary-600 hover:text-white transition-colors shadow-2xs"
            >
              Book Service
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}