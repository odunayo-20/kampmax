import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";
import type { EventItem } from "@/types/event-ticketing";
import { eventDate, eventTime, priceLabel } from "@/components/events/event-format";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: EventItem;
  className?: string;
}

export function EventCard({ event, className }: EventCardProps) {
  const spotsLeft = event.seatsLeft;
  const almostFull = spotsLeft > 0 && spotsLeft <= 20;

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        "flex-shrink-0 w-[240px] sm:w-[260px] bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-2xs group flex flex-col",
        "hover:border-primary-300 hover:shadow-md transition-all duration-200",
        className
      )}
    >
      <div className="relative aspect-[16/10] bg-neutral-100 overflow-hidden">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImageUrl}
            alt={event.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400 bg-neutral-100">
            <Calendar className="w-8 h-8 opacity-40" />
          </div>
        )}

        {event.category && (
          <div className="absolute top-2.5 left-2.5">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-neutral-900/80 backdrop-blur-xs text-white">
              {event.category.name}
            </span>
          </div>
        )}

        <div className="absolute bottom-2.5 right-2.5">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-white/95 text-neutral-900 shadow-2xs backdrop-blur-xs">
            {priceLabel(event)}
          </span>
        </div>
      </div>

      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-600 mb-1">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{eventDate(event.startsAt)} &middot; {eventTime(event.startsAt)}</span>
          </div>

          <h3 className="text-xs sm:text-sm font-bold text-neutral-900 line-clamp-2 leading-snug group-hover:text-primary-600 transition-colors">
            {event.title}
          </h3>

          <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px]">
          <div className="flex items-center gap-1 text-neutral-500 font-medium">
            <Users className="h-3.5 w-3.5 text-neutral-400" />
            <span>{event.attendeeCount} attending</span>
          </div>

          {almostFull && (
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
              {spotsLeft} spots left
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
