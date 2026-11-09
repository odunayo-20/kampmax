"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserCheck } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AgentStatusBadge } from "@/components/admin/accommodation/status-badges";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import { useAdminAgents } from "@/hooks/admin/use-admin-accommodation";
import { useDebounce } from "@/hooks/use-debounce";
import { AGENT_STATUS_LABELS, type AccommodationAgentStatus } from "@/types/accommodation";

const PAGE_SIZE = 15;

const TABS: { value: AccommodationAgentStatus; count: "pending" | "approved" | "suspended" | "rejected" | "revoked" }[] = [
  { value: "PENDING", count: "pending" },
  { value: "APPROVED", count: "approved" },
  { value: "SUSPENDED", count: "suspended" },
  { value: "REJECTED", count: "rejected" },
  { value: "REVOKED", count: "revoked" },
];

const EMPTY_COPY: Record<AccommodationAgentStatus, { title: string; message: string }> = {
  PENDING: {
    title: "No applications waiting",
    message: "When someone applies to become an accommodation agent, their application appears here for review.",
  },
  APPROVED: { title: "No approved agents yet", message: "Agents you approve are listed here." },
  SUSPENDED: { title: "No suspended agents", message: "Agents you pause are kept here and can be restored." },
  REJECTED: { title: "Nothing rejected", message: "Applications you turn down are listed here." },
  REVOKED: { title: "No revoked agents", message: "Agents whose privileges were removed for good are listed here." },
};

export default function AdminAccommodationAgentsPage() {
  const [tab, setTab] = useState<AccommodationAgentStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim(), 350);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isPending, isError, refetch } = useAdminAgents({
    status: tab,
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const filtered = debouncedSearch.length > 0;

  return (
    <>
      <AdminPageHeader
        title="Accommodation agents"
        description="People who applied to advertise rooms and apartments. Check their identity and proof that they may advertise the property before approving."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Agent status" className="flex flex-wrap gap-1 border-b border-kampmax-border">
          {TABS.map((t) => {
            const active = tab === t.value;
            const count = data?.counts[t.count];
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
                {AGENT_STATUS_LABELS[t.value]}
                {count !== undefined && (
                  <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-kampmax-text-secondary">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div>
          <label className="sr-only" htmlFor="agents-search">
            Search agents
          </label>
          <input
            id="agents-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone or agency…"
            className="h-9 w-full rounded-md border border-kampmax-border bg-white px-2.5 text-sm text-kampmax-text sm:w-72"
          />
        </div>
      </div>

      <section aria-label="Agents" className="rounded-lg border border-kampmax-border bg-white">
        {isPending ? (
          <div className="p-4">
            <LoadingSkeleton variant="table" rows={5} />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title={filtered ? "No matching agents" : EMPTY_COPY[tab].title}
            message={filtered ? "Try a different search, or another tab." : EMPTY_COPY[tab].message}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-kampmax-border text-xs text-kampmax-text-secondary">
                    <th scope="col" className="px-4 py-2 font-medium">Applicant</th>
                    <th scope="col" className="px-4 py-2 font-medium">Contact</th>
                    <th scope="col" className="px-4 py-2 font-medium">Works in</th>
                    <th scope="col" className="px-4 py-2 font-medium">Status</th>
                    <th scope="col" className="px-4 py-2 font-medium">{tab === "PENDING" ? "Applied" : "Joined"}</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kampmax-border">
                  {data.items.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2.5">
                        <span className="block font-medium text-kampmax-text">{a.fullName}</span>
                        {a.agencyName && (
                          <span className="block text-[11px] text-kampmax-text-secondary">{a.agencyName}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-kampmax-text-secondary">
                        <span className="block">{a.email}</span>
                        <span className="block text-[11px]">{a.phone}</span>
                      </td>
                      <td className="px-4 py-2.5 text-kampmax-text-secondary">{a.operatingLocation}</td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <AgentStatusBadge status={a.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-kampmax-text-secondary">
                        {timeAgo(a.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/admin/accommodation/agents/${a.id}`}
                          aria-label={`${a.status === "PENDING" ? "Review" : "Open"} ${a.fullName}`}
                          className="inline-flex h-7 items-center rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
                        >
                          {a.status === "PENDING" ? "Review" : "Open"}
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
              unitLabel="agents"
            />
          </>
        )}
      </section>
    </>
  );
}
