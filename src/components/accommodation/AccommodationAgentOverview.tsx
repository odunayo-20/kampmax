"use client";

import Link from "next/link";
import {
  useAccommodationAgentOverview,
  useConfirmAccommodationAvailability,
} from "@/hooks/use-accommodation";
import { FactChips } from "@/components/ui/FactChips";
import { interestLine, replyChips } from "@/services/accommodation-overview";

const day = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })
    : "";

/**
 * An approved agent's today: rooms they must confirm before they vanish from
 * the site, what keeping the listings costs next, how students see their reply
 * speed, and which rooms people open and save.
 */
export function AccommodationAgentOverview() {
  const overview = useAccommodationAgentOverview();
  const confirm = useConfirmAccommodationAvailability();
  const data = overview.data;
  if (!data) return null;

  const chips = replyChips(data.reply);
  const { needsConfirming: rooms, nextRenewal: renewal } = data;

  return (
    <section aria-labelledby="agent-today" className="space-y-4 rounded-xl border border-kampmax-border bg-white p-5">
      <h2 id="agent-today" className="text-lg font-bold text-kampmax-text">
        Today
      </h2>

      {rooms.count > 0 && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            {rooms.count} {rooms.count === 1 ? "room needs" : "rooms need"} confirming
          </p>
          <p className="mt-1 text-xs text-amber-900">
            {rooms.hideBy
              ? `Students stop seeing a room you have not confirmed. The first goes on ${day(rooms.hideBy)}.`
              : "Students stop seeing a room you have not confirmed."}
          </p>
          <ul className="mt-3 space-y-2">
            {rooms.listings.map((room) => (
              <li key={room.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-kampmax-text">{room.title}</span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    disabled={confirm.isPending}
                    onClick={() => confirm.mutate({ id: room.id })}
                    className="rounded-md bg-kampmax-blue px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Still available
                  </button>
                  <button
                    type="button"
                    disabled={confirm.isPending}
                    onClick={() => confirm.mutate({ id: room.id, availabilityStatus: "OCCUPIED" })}
                    className="rounded-md border border-kampmax-border bg-white px-3 py-1.5 text-xs font-semibold text-kampmax-text disabled:opacity-60"
                  >
                    It is taken
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {confirm.isError && (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {confirm.error.message}
            </p>
          )}
        </div>
      )}

      {renewal && (
        <p className="text-sm text-kampmax-text-secondary">
          Next {renewal.autoRenew ? "renewal" : "expiry"}: <span className="font-medium text-kampmax-text">{renewal.title}</span>{" "}
          on {day(renewal.expiresAt)}
          {renewal.amount > 0 ? ` · ₦${renewal.amount.toLocaleString("en-NG")}` : ""}.{" "}
          <Link href="#agent-listings" className="text-kampmax-blue hover:underline">
            See listings
          </Link>
        </p>
      )}

      <div>
        <h3 className="text-sm font-semibold text-kampmax-text">How students see you</h3>
        {chips.length > 0 ? (
          <FactChips facts={chips} />
        ) : (
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            Your reply speed shows to students once a few of them have written to you. Answer quickly and it shows.
          </p>
        )}
      </div>

      {data.topListings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-kampmax-text">How your rooms are doing</h3>
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            {interestLine(data.interest)} across all your listings. Views are page opens, not people.
          </p>
          <ul className="mt-2 divide-y divide-kampmax-border">
            {data.topListings.map((t) => (
              <li key={t.listingId} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="text-sm text-kampmax-text">{t.title}</span>
                <span className="text-xs text-kampmax-text-secondary">{interestLine(t)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
