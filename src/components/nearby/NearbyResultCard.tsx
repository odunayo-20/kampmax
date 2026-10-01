"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { eventDay, eventTime } from "@/components/events/event-format";
import { cn } from "@/lib/utils";
import { formatDistance, type NearbyItem } from "@/services/nearby-api";

export const nearbyKey = (i: Pick<NearbyItem, "entityType" | "entityId">) => `${i.entityType}:${i.entityId}`;

/** Entity image with a neutral fallback for missing, broken or slow images. */
export function NearbyImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const usable = src && failedSrc !== src;
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-md bg-neutral-100", className)}>
      {usable ? (
        // eslint-disable-next-line @next/next/no-img-element -- entity images come from arbitrary hosts
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailedSrc(src)}
          className={cn("h-full w-full object-cover transition-opacity", loaded ? "opacity-100" : "opacity-0")}
        />
      ) : null}
      {(!usable || !loaded) && (
        <div className="absolute inset-0 flex items-center justify-center text-neutral-400" aria-hidden>
          <MapPin className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

interface Props {
  item: NearbyItem;
  typeLabel: string;
  selected: boolean;
  onSelect: (key: string) => void;
}

export const NearbyResultCard = memo(function NearbyResultCard({ item, typeLabel, selected, onSelect }: Props) {
  const key = nearbyKey(item);
  const distance = formatDistance(item.distanceMeters);
  const when = item.schedule ? `${eventDay(item.schedule.startsAt)}, ${eventTime(item.schedule.startsAt)}` : null;
  return (
    <li id={`nearby-item-${key}`}>
      <button
        type="button"
        onClick={() => onSelect(key)}
        aria-pressed={selected}
        aria-label={`${item.title}, ${typeLabel}${when ? `, ${when}` : ""}${distance ? `, ${distance}` : ""}${
          item.location.precision === "APPROXIMATE" ? ", approximate location" : ""
        }`}
        className={cn(
          "flex min-h-[64px] w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
          selected ? "border-primary-600 bg-primary-50" : "border-neutral-200 bg-white hover:bg-neutral-50",
        )}
      >
        <NearbyImage src={item.image} alt="" className="h-14 w-14" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-neutral-900">{item.title}</span>
          <span className="block truncate text-xs text-neutral-500">{item.subtitle || typeLabel}</span>
          <span className="mt-0.5 block truncate text-xs text-neutral-600">
            {typeLabel}
            {when && <> · {when}</>}
            {item.category && <> · {item.category.name}</>}
            {distance && <> · {distance}</>}
            {item.location.precision === "APPROXIMATE" && <> · approx.</>}
          </span>
        </span>
      </button>
    </li>
  );
});

/** Compact preview of the selected entity. Opening the full page is an explicit action. */
export function NearbyPreview({ item, typeLabel, onClose }: { item: NearbyItem; typeLabel: string; onClose: () => void }) {
  const distance = formatDistance(item.distanceMeters);
  const schedule = item.schedule;
  return (
    <section aria-label="Selected place" className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
      <NearbyImage src={item.image} alt="" className="h-16 w-16" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-900">{item.title}</p>
        <p className="truncate text-xs text-neutral-500">{item.subtitle || typeLabel}</p>
        {schedule && (
          <p className="truncate text-xs font-medium text-neutral-700">
            {eventDay(schedule.startsAt)} · {eventTime(schedule.startsAt)}
            {schedule.endsAt && <> – {eventTime(schedule.endsAt)}</>}
          </p>
        )}
        <p className="text-xs text-neutral-600">
          {typeLabel}
          {item.category && <> · {item.category.name}</>}
          {distance && <> · {distance}</>}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        <Link
          href={item.detailPath}
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary-600 px-3 text-xs font-semibold text-white hover:bg-[#1258C7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          View
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Close
        </button>
      </div>
    </section>
  );
}
