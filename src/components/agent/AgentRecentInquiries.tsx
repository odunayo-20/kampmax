"use client";

import Link from "next/link";
import { Pill } from "@/components/accommodation/enquiry-parts";
import { useAccommodationEnquiries } from "@/hooks/use-accommodation";
import { describeHousingError } from "@/lib/accommodation-text";
import { enquiryStatusView, waitingText } from "@/lib/agent-enquiry";
import { timeAgo } from "@/lib/utils";

/** The latest enquiries on the hub, each opening its conversation. Wording as on the enquiries page. */
export function AgentRecentInquiries() {
  const { data, isPending, isError, error } = useAccommodationEnquiries("AGENT", 1);
  const items = data?.items ?? [];

  return (
    <section className="rounded-xl border border-kampmax-border bg-white">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-sm font-semibold text-kampmax-text">Recent enquiries</h2>
        <Link href="/agent/enquiries" className="text-xs font-medium text-kampmax-blue hover:underline">View all</Link>
      </div>

      {isPending ? (
        <div className="space-y-2 px-4 pb-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-kampmax-muted" />)}
        </div>
      ) : isError ? (
        <p role="alert" className="px-4 pb-4 text-sm text-red-700">We couldn&apos;t load your enquiries. {describeHousingError(error)}</p>
      ) : items.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-kampmax-text-secondary">When a student asks about one of your live listings, it shows up here.</p>
      ) : (
        <ul className="divide-y divide-kampmax-border">
          {items.slice(0, 6).map((e) => (
            <li key={e.id}>
              <Link href={`/agent/enquiries?open=${encodeURIComponent(e.id)}`} className="block px-4 py-3 hover:bg-kampmax-bg">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-kampmax-text">{e.counterpart}</span>
                  <Pill {...enquiryStatusView(e.status)} />
                </div>
                <p className="mt-0.5 truncate text-xs text-kampmax-text-secondary">
                  {e.listingTitle || "A listing"} · {waitingText(e) ?? timeAgo(e.updatedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
