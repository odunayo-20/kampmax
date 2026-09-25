"use client";

import { CalendarDays, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToggleEventAttendance } from "@/hooks/use-community";
import type { CommunityEvent } from "@/services/posts-api";

export function CommunityEventCard({ event }: { event: CommunityEvent }) {
  const toggle = useToggleEventAttendance();
  const pending = toggle.isPending ? toggle.variables : undefined;
  const attending = pending ? pending.attending : event.attending;
  const count = pending ? event.attendeeCount + (pending.attending ? 1 : -1) : event.attendeeCount;

  const start = new Date(event.startsAt);
  const day = start.toLocaleDateString("en-NG", { day: "numeric" });
  const month = start.toLocaleDateString("en-NG", { month: "short" }).toUpperCase();
  const time = start.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex rounded-xl border border-kampmax-border bg-white overflow-hidden">
      <div className="w-16 shrink-0 bg-kampmax-blue/5 border-r border-kampmax-border flex flex-col items-center justify-center py-3">
        <span className="text-lg font-bold text-kampmax-blue leading-none">{day}</span>
        <span className="text-[9px] font-bold text-kampmax-blue/60">{month}</span>
      </div>
      <div className="flex-1 min-w-0 p-3 space-y-1">
        <h3 className="text-sm font-bold text-kampmax-text truncate">{event.title}</h3>
        <p className="text-[11px] text-kampmax-text-secondary flex items-center gap-1">
          <CalendarDays className="h-3 w-3" /> {time}
          <MapPin className="h-3 w-3 ml-2" /> <span className="truncate">{event.location}</span>
        </p>
        {event.description && (
          <p className="text-xs text-kampmax-text-secondary line-clamp-2">{event.description}</p>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-kampmax-text-secondary flex items-center gap-1">
            <Users className="h-3 w-3" /> {count} going · by {event.organizerName}
          </span>
          <button
            type="button"
            disabled={toggle.isPending}
            onClick={() => toggle.mutate({ id: event.id, attending: !event.attending })}
            className={cn(
              "px-3 py-1 rounded-lg text-[11px] font-semibold",
              attending ? "bg-kampmax-blue/10 text-kampmax-blue" : "bg-kampmax-blue text-white"
            )}
          >
            {attending ? "Going" : "RSVP"}
          </button>
        </div>
      </div>
    </div>
  );
}
