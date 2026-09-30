"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import { useEvent } from "@/hooks/use-events";
import {
  eventDate,
  eventTimeRange,
  isBookable,
  naira,
  priceLabel,
} from "@/components/events/event-format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EventDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: event, isPending, isError, error, refetch } = useEvent(id);

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4" aria-busy="true">
        <div className="h-56 animate-pulse rounded-3xl bg-neutral-200/70" />
        <div className="h-6 w-2/3 animate-pulse rounded bg-neutral-200/70" />
        <div className="h-24 animate-pulse rounded-2xl bg-neutral-200/70" />
      </div>
    );
  }

  if (isError || !event) {
    const notFound = (error as { status?: number } | null)?.status === 404;
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-sm font-semibold text-neutral-900">
          {notFound ? "This event isn't available" : "Couldn't load this event"}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          {notFound ? "It may have been cancelled or removed." : error?.message}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          {!notFound && (
            <button
              onClick={() => refetch()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Try again
            </button>
          )}
          <Link
            href="/events"
            className="rounded-lg border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700"
          >
            Back to events
          </Link>
        </div>
      </div>
    );
  }

  const bookable = isBookable(event);
  const ended = new Date(event.endsAt).getTime() <= Date.now();
  const cta = event.attending
    ? "View my ticket"
    : ended
      ? "Event ended"
      : event.seatsLeft === 0
        ? "Sold out"
        : event.minPrice > 0
          ? "Get Ticket"
          : "Register";

  return (
    <div className="min-h-screen bg-neutral-50 pb-44 lg:pb-28">
      <div className="relative h-[240px] w-full bg-primary-950 sm:h-[300px]">
        {event.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImageUrl} alt={event.title} className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <button
          onClick={() => router.back()}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {event.isFeatured && (
          <span className="absolute right-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black text-neutral-950">
            FEATURED
          </span>
        )}
      </div>

      <div className="mx-auto -mt-6 max-w-2xl space-y-4 px-4">
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <h1 className="text-xl font-extrabold leading-tight text-neutral-900">
            {event.title}
          </h1>
          <p className="mt-1.5 flex items-center gap-1 text-xs text-neutral-500">
            Organized by{" "}
            <span className="font-semibold text-primary-700">
              {event.organizationName ?? event.organizerName}
            </span>
            {event.organizationName && (
              <BadgeCheck className="h-3.5 w-3.5 text-primary-600" aria-label="Verified organizer" />
            )}
          </p>
          {event.category && (
            <span className="mt-3 inline-block rounded-full bg-primary-50 px-3 py-1 text-[11px] font-semibold text-primary-700">
              {event.category.name}
            </span>
          )}
          {event.status === "CANCELLED" && (
            <p className="mt-3 rounded-lg bg-error-50 p-2 text-xs font-semibold text-error-700">
              This event was cancelled.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoTile icon={Calendar} title={eventDate(event.startsAt)}>
            {eventTimeRange(event.startsAt, event.endsAt)}
          </InfoTile>
          <InfoTile icon={MapPin} title={event.location}>
            Venue
          </InfoTile>
          <InfoTile icon={Wallet} title={priceLabel(event)}>
            {event.tiers.length > 1 ? "Starting price" : "Per ticket"}
          </InfoTile>
          <InfoTile
            icon={Users}
            title={event.capacity ? `${event.capacity} capacity` : `${event.seatsLeft} seats`}
          >
            {event.ticketsSold} booked
          </InfoTile>
        </div>

        {event.description && (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-neutral-900">About this event</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-600">
              {event.description}
            </p>
          </section>
        )}

        {event.tiers.length > 0 && (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-neutral-900">Tickets</h2>
            <ul className="mt-3 divide-y divide-neutral-100">
              {event.tiers.map((tier) => (
                <li key={tier.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                      {tier.name}
                      {tier.isLimited && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          Limited
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      {tier.soldOut ? "Sold out" : `${tier.remaining} available`}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-neutral-900">
                    {tier.price > 0 ? naira(tier.price) : "Free"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Sits above the mobile bottom navigation (62px + safe area). */}
      <div className="fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-40 border-t border-neutral-200 bg-white/95 p-3 backdrop-blur lg:bottom-0 lg:p-4">
        <div className="mx-auto max-w-2xl">
          {event.attending ? (
            <Link
              href="/tickets"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white"
            >
              <Ticket className="h-4 w-4" /> {cta}
            </Link>
          ) : bookable ? (
            <Link
              href={`/events/${event.id}/checkout`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-bold text-white hover:bg-primary-700"
            >
              <Ticket className="h-4 w-4" /> {cta}
            </Link>
          ) : (
            <button
              disabled
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-200 text-sm font-bold text-neutral-500"
            >
              <Clock className="h-4 w-4" /> {cta}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Calendar;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl bg-white p-3.5 shadow-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-neutral-900">{title}</p>
        <p className="truncate text-[11px] text-neutral-500">{children}</p>
      </div>
    </div>
  );
}
