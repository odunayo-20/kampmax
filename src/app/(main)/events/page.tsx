"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, Search, Ticket, Users, Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useApp } from "@/lib/app-context";
import { useDebounce } from "@/hooks/use-debounce";
import { useEvents, useOrganizerStatus } from "@/hooks/use-events";
import { clearAuthTokens } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";
import {
  eventDate,
  eventTime,
  isBookable,
  priceLabel,
} from "@/components/events/event-format";
import type { EventItem } from "@/types/event-ticketing";

type TimeFilter = "all" | "today" | "week" | "month";

const TIME_FILTERS: { id: TimeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

export default function EventsPage() {
  const { selectedCampus } = useApp();
  const [filter, setFilter] = useState<TimeFilter>("all");
  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim(), 300);

  const events = useEvents({
    campusId: selectedCampus?.id || undefined,
    q: q || undefined,
    when: filter === "all" ? undefined : filter,
  });
  const organizer = useOrganizerStatus();

  const list = events.data ?? [];
  const featured = list.find((e) => e.isFeatured) ?? list[0];
  const rest = list.filter((e) => e.id !== featured?.id);

  return (
    <PageContainer className="space-y-4 pb-14">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-neutral-900">Events</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/tickets"
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-primary-300"
          >
            <Ticket className="h-3.5 w-3.5" /> My Tickets
          </Link>
          {organizer.data?.isOrganizer ? (
            <Link
              href="/organizer"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
            >
              <Plus className="h-3.5 w-3.5" /> Organizer
            </Link>
          ) : (
            <Link
              href="/organizer"
              className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100"
            >
              Host an event
            </Link>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events or venues..."
          className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-900 shadow-xs placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-600"
        />
      </div>

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 no-scrollbar">
        {TIME_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
              filter === f.id
                ? "bg-primary-600 text-white shadow-sm"
                : "border border-neutral-200 bg-white text-neutral-600 hover:border-primary-300"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {events.isPending ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/70" />
          ))}
        </div>
      ) : events.isError ? (
        <div role="alert" className="rounded-2xl border border-error-100 bg-error-50 p-6 text-center">
          <p className="text-sm font-semibold text-error-700">Couldn&apos;t load events</p>
          <p className="mt-1 text-xs text-error-700/80">{events.error.message}</p>
          <button
            onClick={() => {
              if (events.error?.message?.toLowerCase().includes("token")) {
                clearAuthTokens();
              }
              events.refetch();
            }}
            className="mt-3 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-error-700 shadow-sm hover:bg-error-50 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <Calendar className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-sm font-semibold text-neutral-800">
            {q || filter !== "all" ? "No events match your search" : "No upcoming events yet"}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Check back soon, or host one yourself.
          </p>
        </div>
      ) : (
        <>
          {featured && <FeaturedEvent event={featured} />}
          {rest.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-neutral-900">Upcoming Events</h2>
              {rest.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </section>
          )}
        </>
      )}
    </PageContainer>
  );
}

function FeaturedEvent({ event }: { event: EventItem }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="group relative block overflow-hidden rounded-3xl bg-primary-950 text-white shadow-lg"
    >
      {event.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.coverImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
      <div className="relative flex min-h-[190px] flex-col justify-between p-5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black text-neutral-950">
          {event.isFeatured ? "FEATURED" : "NEXT UP"}
        </span>
        <div className="space-y-1.5">
          <h2 className="text-xl font-black leading-tight">{event.title}</h2>
          <p className="flex items-center gap-3 text-xs text-neutral-300">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              {eventDate(event.startsAt)}, {eventTime(event.startsAt)}
            </span>
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="h-3.5 w-3.5 text-primary-400" />
              {event.location}
            </span>
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold">{priceLabel(event)}</span>
            <span className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-extrabold">
              {isBookable(event) ? "Get Ticket" : "View"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EventRow({ event }: { event: EventItem }) {
  const free = event.minPrice <= 0;
  const bookable = isBookable(event);
  return (
    <Link
      href={`/events/${event.id}`}
      className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-2xs transition hover:border-primary-300 hover:shadow-md"
    >
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300">
            <Calendar className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-neutral-900">
            {event.title}
          </h3>
          {event.category && (
            <p className="mt-0.5 text-[11px] text-neutral-500">{event.category.name}</p>
          )}
          <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500">
            <Calendar className="h-3 w-3 shrink-0" />
            {eventDate(event.startsAt)} &middot; {eventTime(event.startsAt)}
          </p>
          <p className="flex items-center gap-1 truncate text-[11px] text-neutral-500">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{event.location}</span>
          </p>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className={cn("text-sm font-extrabold", free ? "text-emerald-600" : "text-primary-700")}>
            {priceLabel(event)}
          </span>
          {bookable ? (
            <span
              className={cn(
                "rounded-lg px-3 py-1.5 text-[11px] font-bold",
                free
                  ? "border border-primary-600 text-primary-700"
                  : "bg-primary-600 text-white"
              )}
            >
              {free ? "Register" : "Get Ticket"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-400">
              <Users className="h-3 w-3" /> {event.seatsLeft === 0 ? "Sold out" : "Closed"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
