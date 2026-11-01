"use client";

import Link from "next/link";
import { BadgeCheck, User } from "lucide-react";
import type { MarketplaceProvider } from "@/types/service-marketplace";
import { getServiceCategoryName } from "@/services/service-marketplace";
import { cn } from "@/lib/utils";
import { ProviderCampus } from "./ProviderCampus";
import { ServiceRatingStars } from "./ServiceRatingStars";

interface ProviderCardProps {
  provider: MarketplaceProvider;
  serviceCount?: number;
  className?: string;
}

/** Compact provider card used in "Similar providers" and category landing blocks. */
export function ProviderCard({ provider, serviceCount, className }: ProviderCardProps) {
  return (
    <Link
      href={`/services/providers/${provider.id}`}
      className={cn(
        "bg-white rounded-[10px] border border-neutral-200 p-4 block group",
        "hover:border-neutral-300 hover:shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition-all duration-200",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {provider.logoUrl ? (
          <img
            src={provider.logoUrl}
            alt=""
            loading="lazy"
            className="w-12 h-12 rounded-xl object-cover border border-neutral-200 flex-shrink-0"
          />
        ) : (
          <span className="w-12 h-12 rounded-xl bg-primary-50 border border-neutral-200 flex items-center justify-center flex-shrink-0 text-primary-600">
            <User className="h-5 w-5" aria-hidden />
          </span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="text-sm font-semibold text-neutral-900 truncate group-hover:text-primary-600 transition-colors">
              {provider.displayName}
            </h3>
            {provider.verified && (
              <BadgeCheck className="w-4 h-4 text-primary-600 shrink-0" aria-label="Verified provider" />
            )}
          </div>
          <p className="text-[11px] text-neutral-500 truncate mb-1.5">
            {getServiceCategoryName(provider.primaryCategoryId)}
          </p>
          <ServiceRatingStars rating={provider.rating} count={provider.ratingCount} />
        </div>
      </div>

      {provider.tagline && (
        <p className="mt-3 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
          {provider.tagline}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
        <ProviderCampus campusId={provider.primaryCampusId} />
        {typeof serviceCount === "number" && (
          <span>{serviceCount} service{serviceCount === 1 ? "" : "s"}</span>
        )}
      </div>
    </Link>
  );
}