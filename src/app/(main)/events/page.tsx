"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Calendar,
  MapPin,
  Sparkles,
  ArrowRight,
  Plus,
  Ticket,
  Users,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { events } from "@/data/events";
import { cn } from "@/lib/utils";

type TimeFilter = "all" | "today" | "week" | "month";

const TIME_FILTERS: { id: TimeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

export default function EventsPage() {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const q = searchQuery.toLowerCase().trim();

  const filteredEvents = useMemo(() => {
    return events.filter(
      (e) =>
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [q]);

  const featuredEvent = filteredEvents.find((e) => e.isFeatured) || filteredEvents[0];
  const otherEvents = filteredEvents.filter((e) => e.id !== featuredEvent?.id);

  return (
    <PageContainer className="space-y-4 pb-14">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900">Events</h1>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events..."
            className="w-full h-11 pl-10 pr-4 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-600 shadow-xs"
          />
        </div>

        {/* Time Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {TIME_FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150",
                activeFilter === filter.id
                  ? "bg-primary-600 text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Event Card (matching Screen 3) */}
      {featuredEvent && (
        <div className="relative overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-md border border-neutral-800">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${
                featuredEvent.imageUrl ||
                "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80"
              })`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/40" />

          <div className="relative z-10 p-5 flex flex-col justify-between min-h-[190px]">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-neutral-950 shadow-xs">
                Featured
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div>
                <h2 className="text-xl font-extrabold text-white leading-tight">
                  {featuredEvent.title}
                </h2>
                <p className="text-xs text-neutral-300 font-medium">
                  {featuredEvent.tags?.join(" • ") || "Music • Food • Networking • Fun"}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-300">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-amber-400" />
                      <span>{featuredEvent.timeDisplay || "Sat, 27 Sep 2025"}</span>
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary-400" />
                      <span>{featuredEvent.distance || "1.2 km"}</span>
                    </span>
                  </div>
                  <p className="text-xs font-bold text-emerald-400">
                    {featuredEvent.ticketPrice ? `From ₦${featuredEvent.ticketPrice.toLocaleString()}` : "Free Entry"}
                  </p>
                </div>

                <Link
                  href={`/events/${featuredEvent.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 active:scale-95 px-4 py-2 text-xs font-bold text-white shadow-md transition-all"
                >
                  <Ticket className="h-3.5 w-3.5" />
                  <span>Get Ticket</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Campus Events List */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-neutral-900">Upcoming Events</h3>

        {otherEvents.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group flex items-center justify-between p-3.5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-neutral-200">
                <img
                  src={
                    event.imageUrl ||
                    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80"
                  }
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-neutral-900 line-clamp-1 group-hover:text-primary-600">
                  {event.title}
                </h4>
                <p className="text-xs text-neutral-500 line-clamp-1">{event.location}</p>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-amber-500" />
                    <span>{event.timeDisplay || "Wed, 1 Oct 2025"}</span>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-primary-500" />
                    <span>{event.distance || "0.9 km"}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
              <span className={cn(
                "px-2 py-0.5 rounded text-[11px] font-bold",
                event.ticketPrice && event.ticketPrice > 0
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
              )}>
                {event.ticketPrice && event.ticketPrice > 0
                  ? `₦${event.ticketPrice.toLocaleString()}`
                  : "Free"}
              </span>
              <span className="text-[11px] text-primary-600 font-semibold flex items-center gap-0.5">
                Details <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
