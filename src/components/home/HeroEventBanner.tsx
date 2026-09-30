"use client";

import Link from "next/link";
import { Calendar, MapPin, Sparkles, ArrowRight, Ticket } from "lucide-react";
import type { EventItem } from "@/types/event-ticketing";
import { eventDate, eventTime } from "@/components/events/event-format";

interface HeroEventBannerProps {
  event?: EventItem;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80";

/** Home hero. Shows the featured (or next) real event; a generic prompt when there is none. */
export function HeroEventBanner({ event }: HeroEventBannerProps) {
  const href = event ? `/events/${event.id}` : "/events";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-neutral-950 text-white shadow-xl border border-neutral-800/80 group">
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{ backgroundImage: `url(${event?.coverImageUrl || FALLBACK_IMAGE})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/30" />

      <div className="relative z-10 p-5 sm:p-6 flex flex-col justify-between min-h-[180px] sm:min-h-[195px]">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black bg-amber-400 text-neutral-950 shadow-md">
            <Sparkles className="h-3.5 w-3.5 fill-neutral-950 text-neutral-950" />
            <span>{event?.isFeatured ? "FEATURED CAMPUS EVENT" : "CAMPUS EVENTS"}</span>
          </span>

          {event && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20">
              {event.minPrice > 0 ? `From ₦${event.minPrice.toLocaleString("en-NG")}` : "Free Entry"}
            </span>
          )}
        </div>

        <div className="mt-4 space-y-2.5">
          <div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
              {event?.title ?? "Discover what's happening on campus"}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 font-medium line-clamp-1 mt-0.5">
              {event ? (event.category?.name ?? event.organizationName ?? "") : "Discover, register, attend"}
            </p>
          </div>

          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap sm:flex-nowrap">
            {event ? (
              <div className="flex items-center gap-3 text-xs text-neutral-300">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>{eventDate(event.startsAt)} &bull; {eventTime(event.startsAt)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium min-w-0">
                  <MapPin className="h-3.5 w-3.5 text-primary-400 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </span>
              </div>
            ) : (
              <span />
            )}

            <Link
              href={href}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 active:scale-95 px-4 py-2 text-xs font-extrabold text-white shadow-lg shadow-primary-900/40 transition-all duration-150"
            >
              <Ticket className="h-3.5 w-3.5" />
              <span>{event ? "Get Tickets" : "Explore Events"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
