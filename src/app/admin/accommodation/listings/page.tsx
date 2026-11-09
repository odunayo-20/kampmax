"use client";

import { useState } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ModerationBadge, PublicationBadge } from "@/components/admin/accommodation/status-badges";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import { useAdminListings } from "@/hooks/admin/use-admin-accommodation";
import { LISTING_MODERATION_LABELS, type ListingModerationStatus } from "@/types/accommodation";

const PAGE_SIZE = 15;

/** Waiting for review comes first: it is the queue the team works through. */
const TABS: { value: ListingModerationStatus; label: string }[] = [
  { value: "PENDING_APPROVAL", label: "Waiting for review" },
  { value: "APPROVED", label: LISTING_MODERATION_LABELS.APPROVED },
  { value: "ADMIN_SUSPENDED", label: LISTING_MODERATION_LABELS.ADMIN_SUSPENDED },
  { value: "REJECTED", label: LISTING_MODERATION_LABELS.REJECTED },
  { value: "DRAFT", label: "Drafts" },
];

const EMPTY_COPY: Record<ListingModerationStatus, { title: string; message: string }> = {
  PENDING_APPROVAL: {
    title: "Nothing waiting for review",
    message: "Listings an agent has paid for, and approved listings they have changed, appear here.",
  },
  APPROVED: { title: "No approved listings", message: "Listings you approve are listed here." },
  ADMIN_SUSPENDED: { title: "Nothing suspended", message: "Listings you take down are kept here and can be restored." },
  REJECTED: { title: "Nothing rejected", message: "Listings you turn down are listed here with the reason." },
  DRAFT: { title: "No drafts", message: "Listings an agent has started but not paid for yet." },
};

export default function AdminAccommodationListingsPage() {
  const [tab, setTab] = useState<ListingModerationStatus>("PENDING_APPROVAL");
  const [page, setPage] = useState(1);

  const { data, isPending, isError, refetch } = useAdminListings({
    status: tab,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <>
      <AdminPageHeader
        title="Accommodation listings"
        description="Each listing advertises one room or apartment and is paid for separately. Check the photos, charges and address, then approve or reject. The paid month starts when you approve."
      />

      <div role="tablist" aria-label="Listing status" className="mb-4 flex flex-wrap gap-1 border-b border-kampmax-border">
        {TABS.map((t) => {
          const active = tab === t.value;
          const count = data?.counts[t.value];
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setTab(t.value);
                setPage(1);
              }}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "border-kampmax-blue text-kampmax-blue"
                  : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
              )}
            >
              {t.label}
              {count !== undefined && (
                <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-kampmax-text-secondary">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section aria-label="Listings" className="rounded-lg border border-kampmax-border bg-white">
        {isPending ? (
          <div className="p-4">
            <LoadingSkeleton variant="table" rows={5} />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={Home} title={EMPTY_COPY[tab].title} message={EMPTY_COPY[tab].message} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-kampmax-border text-xs text-kampmax-text-secondary">
                    <th scope="col" className="px-4 py-2 font-medium">Listing</th>
                    <th scope="col" className="px-4 py-2 font-medium">Agent</th>
                    <th scope="col" className="px-4 py-2 font-medium">Review</th>
                    <th scope="col" className="px-4 py-2 font-medium">On the site</th>
                    <th scope="col" className="px-4 py-2 font-medium">{tab === "PENDING_APPROVAL" ? "Submitted" : "Expires"}</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kampmax-border">
                  {data.items.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-2.5 font-medium text-kampmax-text">{l.title}</td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/admin/accommodation/agents/${l.agentId}`}
                          className="text-kampmax-text-secondary hover:text-kampmax-blue hover:underline"
                        >
                          {l.agentName ?? "Agent"}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <ModerationBadge status={l.moderationStatus} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <PublicationBadge status={l.publicationStatus} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-kampmax-text-secondary">
                        {tab === "PENDING_APPROVAL"
                          ? l.submittedAt
                            ? timeAgo(l.submittedAt)
                            : "—"
                          : l.expiresAt
                            ? formatDate(l.expiresAt)
                            : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/admin/accommodation/listings/${l.id}`}
                          aria-label={`${l.moderationStatus === "PENDING_APPROVAL" ? "Review" : "Open"} ${l.title}`}
                          className="inline-flex h-7 items-center rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
                        >
                          {l.moderationStatus === "PENDING_APPROVAL" ? "Review" : "Open"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              totalPages={data.totalPages}
              onPageChange={setPage}
              unitLabel="listings"
            />
          </>
        )}
      </section>
    </>
  );
}
