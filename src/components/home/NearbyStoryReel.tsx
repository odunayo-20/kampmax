"use client";

import Link from "next/link";
import { BadgeCheck, ChevronRight } from "lucide-react";
import type { Vendor } from "@/types";
import { Avatar } from "@/components/atoms/Avatar";

interface NearbyStoryReelProps {
  /** Live campus stores; the reel is hidden when there are none. */
  vendors: Vendor[];
  campusAbbreviation?: string;
}

/** A quick-scroll row of real stores on the selected campus. */
export function NearbyStoryReel({ vendors, campusAbbreviation }: NearbyStoryReelProps) {
  if (vendors.length === 0) return null;

  return (
    <section aria-label="Popular stores" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-neutral-900 tracking-tight">
          {campusAbbreviation ? `Popular at ${campusAbbreviation}` : "Popular stores"}
        </h2>
        <Link
          href="/nearby"
          className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-0.5 transition-colors"
        >
          See nearby <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex items-center gap-3.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {vendors.map((vendor) => (
          <Link
            key={vendor.id}
            href={vendor.slug ? `/store/${vendor.slug}` : `/marketplace?vendor=${vendor.id}`}
            className="group flex flex-col items-center gap-1.5 shrink-0 w-[72px] text-center focus:outline-none"
          >
            <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-amber-400 via-primary-500 to-indigo-600 transition-transform duration-200 group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-primary-600">
              <Avatar
                name={vendor.storeName}
                src={vendor.logo}
                size="lg"
                className="h-14 w-14 border-2 border-white"
              />
              {vendor.verified && (
                <BadgeCheck
                  className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-white text-primary-600"
                  aria-label="Verified store"
                />
              )}
            </div>
            <div className="w-full">
              <p className="text-[11px] font-semibold text-neutral-800 truncate leading-tight group-hover:text-primary-600">
                {vendor.storeName}
              </p>
              <p className="text-[9px] text-neutral-500 truncate leading-tight">
                {vendor.rating > 0 ? `★ ${Number(vendor.rating).toFixed(1)}` : "New store"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
