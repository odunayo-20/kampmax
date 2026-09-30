"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useMyTicket } from "@/hooks/use-events";
import { naira } from "@/components/events/event-format";

export default function EventSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-neutral-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const ticketId = useSearchParams().get("ticket") ?? "";
  const { data: ticket, isPending, isError } = useMyTicket(ticketId);

  if (isPending && ticketId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-neutral-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (isError || !ticket) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-sm text-neutral-600">
        We couldn&apos;t find that ticket.{" "}
        <Link href="/tickets" className="font-semibold text-primary-700">
          See my tickets
        </Link>
      </div>
    );
  }

  const paid = ticket.total > 0;
  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 pb-12">
      <div className="rounded-3xl bg-gradient-to-b from-emerald-50 to-white p-6 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" aria-hidden />
        <h1 className="mt-3 text-xl font-extrabold text-neutral-900" role="status">
          {paid ? "Payment Successful!" : "You're in!"}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Your ticket has been booked. You&apos;ll find a confirmation in your notifications.
        </p>
        <div className="mt-5 space-y-2">
          <Link
            href={`/tickets/${ticket.id}`}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white hover:bg-primary-700"
          >
            View My Ticket
          </Link>
          <Link
            href="/events"
            className="flex h-11 w-full items-center justify-center rounded-xl border border-primary-600 text-sm font-bold text-primary-700"
          >
            Back to Events
          </Link>
        </div>
      </div>

      <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm" aria-label="Order summary">
        <h2 className="text-sm font-bold text-neutral-900">Order Summary</h2>
        <p className="text-sm font-semibold text-neutral-800">{ticket.event.title}</p>
        <dl className="space-y-1.5 text-sm">
          <Line label="Ticket Type" value={ticket.tier.name} />
          <Line label="Ticket #" value={ticket.ticketNumber} mono />
          <Line label="Amount" value={paid ? naira(ticket.price) : "Free"} />
          {ticket.serviceFee > 0 && <Line label="Service Fee" value={naira(ticket.serviceFee)} />}
          <div className="border-t border-neutral-100 pt-1.5">
            <Line label="Total Paid" value={paid ? naira(ticket.total) : naira(0)} bold />
          </div>
          {paid && <Line label="Payment Method" value="Kampmax Pay" />}
          {ticket.paymentReference && <Line label="Transaction ID" value={ticket.paymentReference} mono />}
        </dl>
      </section>
    </div>
  );
}

function Line({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className={bold ? "font-bold text-neutral-900" : "text-neutral-500"}>{label}</dt>
      <dd className={`${bold ? "font-extrabold text-neutral-900" : "text-neutral-800"} ${mono ? "font-mono text-xs break-all text-right" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
