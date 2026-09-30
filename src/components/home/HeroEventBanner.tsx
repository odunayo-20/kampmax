"use client";

import Link from "next/link";
import { Calendar, MapPin, Sparkles, ArrowRight, Ticket } from "lucide-react";
import { CampusEvent } from "@/types";

interface HeroEventBannerProps {
  event?: CampusEvent;
}

export function HeroEventBanner({ event }: HeroEventBannerProps) {
  const title = event?.title || "Kampmax Fest 2025";
  const tags = event?.tags?.join(" • ") || "Music • Food • Networking • Fun";
  const date = event?.timeDisplay || "Sat, 27 Sep 2025 • 4:00 PM";
  const distance = event?.distance || "1.2 km";
  const href = event ? `/events/${event.id}` : "/events/e-fest-2025";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-neutral-950 text-white shadow-xl border border-neutral-800/80 group">
      {/* Background with concert imagery & dark gradient overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{
          backgroundImage: `url(${
            event?.imageUrl ||
            "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80"
          })`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/30" />

      {/* Content */}
      <div className="relative z-10 p-5 sm:p-6 flex flex-col justify-between min-h-[180px] sm:min-h-[195px]">
        {/* Top Badges */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black bg-amber-400 text-neutral-950 shadow-md">
            <Sparkles className="h-3.5 w-3.5 fill-neutral-950 text-neutral-950" />
            <span>FEATURED CAMPUS EVENT</span>
          </span>

          {event?.ticketPrice !== undefined && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20">
              {event.ticketPrice > 0 ? `From ₦${event.ticketPrice.toLocaleString()}` : "Free Entry"}
            </span>
          )}
        </div>

        {/* Middle & Bottom info */}
        <div className="mt-4 space-y-2.5">
          <div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 font-medium line-clamp-1 mt-0.5">
              {tags}
            </p>
          </div>

          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3 text-xs text-neutral-300">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Calendar className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>{date}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <MapPin className="h-3.5 w-3.5 text-primary-400 shrink-0" />
                <span>{distance}</span>
              </span>
            </div>

            <Link
              href={href}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 active:scale-95 px-4 py-2 text-xs font-extrabold text-white shadow-lg shadow-primary-900/40 transition-all duration-150"
            >
              <Ticket className="h-3.5 w-3.5" />
              <span>Get Tickets</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
