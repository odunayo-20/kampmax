import Link from "next/link";
import { Calendar, MapPin, Users, Video, Ticket } from "lucide-react";
import { CampusEvent } from "@/types";
import { formatDate, cn } from "@/lib/utils";

interface EventCardProps {
  event: CampusEvent;
  className?: string;
}

export function EventCard({ event, className }: EventCardProps) {
  const start = new Date(event.startDate);
  const isUpcoming = start > new Date();
  const spotsLeft = event.maxAttendees
    ? event.maxAttendees - event.attendees.length
    : null;

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        "flex-shrink-0 w-[240px] sm:w-[260px] bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-2xs group flex flex-col",
        "hover:border-primary-300 hover:shadow-md transition-all duration-200",
        className
      )}
    >
      {/* Cover Image */}
      <div className="relative aspect-[16/10] bg-neutral-100 overflow-hidden">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400 bg-neutral-100">
            <Calendar className="w-8 h-8 opacity-40" />
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {event.category && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-neutral-900/80 backdrop-blur-xs text-white">
              {event.category}
            </span>
          )}
          {event.isVirtual && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-600/90 text-white backdrop-blur-xs">
              <Video className="h-2.5 w-2.5" />
              Virtual
            </span>
          )}
        </div>

        {/* Price Tag */}
        <div className="absolute bottom-2.5 right-2.5">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-white/95 text-neutral-900 shadow-2xs backdrop-blur-xs">
            {event.ticketPrice && event.ticketPrice > 0
              ? `₦${event.ticketPrice.toLocaleString()}`
              : "Free Entry"}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-600 mb-1">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{event.timeDisplay || formatDate(event.startDate)}</span>
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
            <span>{event.attendees.length} attending</span>
          </div>

          {spotsLeft !== null && spotsLeft <= 20 && (
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
              {spotsLeft} spots left
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
