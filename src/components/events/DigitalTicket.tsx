"use client";

import { useState } from "react";
import { Calendar, Download, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MyTicket } from "@/types/event-ticketing";
import { QrImage } from "./QrImage";
import { eventDate, eventTimeRange } from "./event-format";

const STATUS_STYLES: Record<MyTicket["status"], { label: string; cls: string }> = {
  VALID: { label: "Valid", cls: "bg-emerald-500 text-white" },
  USED: { label: "Used", cls: "bg-neutral-500 text-white" },
  REFUNDED: { label: "Refunded", cls: "bg-kampmax-error text-white" },
};

/** The dark "My Ticket" card shown to the student and scanned at the door. */
export function DigitalTicket({ ticket }: { ticket: MyTicket }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const status = STATUS_STYLES[ticket.status];
  const active = ticket.status === "VALID" && ticket.event.status === "ACTIVE";
  const cancelled = ticket.event.status === "CANCELLED";

  function save() {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `${ticket.ticketNumber}.png`;
    a.click();
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-kampmax-navy text-white shadow-xl">
      <div className="relative h-36 bg-primary-900">
        {ticket.event.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ticket.event.coverImageUrl}
            alt=""
            className="h-full w-full object-cover opacity-70"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-kampmax-navy via-kampmax-navy/40 to-transparent" />
        <h2 className="absolute bottom-3 left-4 right-4 text-lg font-extrabold leading-tight">
          {ticket.event.title}
        </h2>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <User className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-white/60">
                Ticket holder
              </p>
              <p className="text-sm font-bold">{ticket.holderName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-white/60">
              Ticket #
            </p>
            <p className="font-mono text-sm font-bold">{ticket.ticketNumber}</p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-white/80">
          <p className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            {eventDate(ticket.event.startsAt)} &middot;{" "}
            {eventTimeRange(ticket.event.startsAt, ticket.event.endsAt)}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-400" />
            {ticket.event.location}
          </p>
          <p className="text-white/60">{ticket.tier.name}</p>
        </div>

        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4">
          <div className={cn(!active && "opacity-30")}>
            <QrImage value={ticket.qrPayload} size={200} onReady={setQrUrl} />
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-0.5 text-[11px] font-bold",
              cancelled ? STATUS_STYLES.REFUNDED.cls : status.cls
            )}
          >
            {cancelled ? "Event cancelled" : status.label}
          </span>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={!qrUrl}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Save to gallery
        </button>
        <p className="text-center text-[11px] text-white/50">
          Show this QR code at the entrance
        </p>
      </div>
    </div>
  );
}
