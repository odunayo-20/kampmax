"use client";

import { MapPin, Store, Truck } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface CampusDeliveryProps {
  campus: {
    id: string;
    name: string;
    abbreviation: string;
    location: string;
  };
  productLocation?: string;
  /** What this listing's seller offers; undefined is treated as offered. */
  allowPickup?: boolean;
  allowDelivery?: boolean;
  deliveryFee?: number;
}

/** How the buyer can receive this item, from the listing's own settings. */
export function CampusDelivery({
  campus,
  productLocation,
  allowPickup = true,
  allowDelivery = true,
  deliveryFee = 0,
}: CampusDeliveryProps) {
  return (
    <div className="space-y-4">
      {campus.name && (
        <div className="rounded-[10px] border border-campus-100 bg-campus-50 p-4">
          <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-campus-600" /> Available around
          </h3>
          <p className="text-sm font-medium text-neutral-900 mt-1">{campus.name}</p>
          {campus.location && <p className="text-xs text-neutral-600">{campus.location}</p>}
          <p className="mt-2 text-[11px] text-neutral-500">Privacy: exact vendor address is not shown.</p>
        </div>
      )}

      <div className="rounded-[10px] border border-neutral-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-1.5">
          <Truck className="h-4 w-4 text-primary-600" /> Getting it
        </h3>
        <ul className="mt-3 space-y-2">
          {allowPickup && (
            <li className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm">
                <Store className="h-4 w-4 text-neutral-500" aria-hidden />
                <span className="font-medium text-neutral-900">Pickup</span>
                {productLocation && <span className="text-xs text-neutral-500">· {productLocation}</span>}
              </span>
              <span className="text-sm font-semibold text-neutral-900">Free</span>
            </li>
          )}
          {allowDelivery && (
            <li className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-neutral-500" aria-hidden />
                <span className="font-medium text-neutral-900">Delivery</span>
                <span className="text-xs text-neutral-500">· to {campus.abbreviation || "your campus"}</span>
              </span>
              <span className="text-sm font-semibold text-neutral-900">
                {deliveryFee > 0 ? formatNaira(deliveryFee) : "Free"}
              </span>
            </li>
          )}
          {!allowPickup && !allowDelivery && (
            <li className="text-xs text-neutral-500">The seller hasn&apos;t set up pickup or delivery for this item.</li>
          )}
        </ul>
        <p className="mt-2 text-[11px] text-neutral-500">You choose how to receive it at checkout.</p>
      </div>
    </div>
  );
}
