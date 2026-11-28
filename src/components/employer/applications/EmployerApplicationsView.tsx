"use client";

import { APPLICATION_REJECTABLE_FROM, lowestOpenAmount } from "@/config/applications";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Inbox, Search, Users } from "lucide-react";
import type { EmployerApplicationStatus } from "@/types/opportunity";
import {
  APPLICATION_FILTER_TABS,
  APPLICATION_SEARCH_DEBOUNCE_MS,
  APPLICATION_SORT_OPTIONS,
  type EmployerApplicationSortKey,
} from "@/config/applications";
import { useEmployerApplications } from "@/hooks/use-applications";
import { useEmployerJob } from "@/hooks/use-jobs";
import { useDebounce } from "@/hooks/use-debounce";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { Skeleton } from "@/components/home/Skeleton";
import { Input, Select } from "@/components/ui";
import { JobsPagination } from "@/components/jobs/JobsPagination";
import { EmployerApplicationCard } from "./EmployerApplicationCard";
import { cn } from "@/lib/utils";

function ListSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading applications">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="mt-3 h-4 w-2/3" />
          <Skeleton className="mt-3 h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

const EMPTY_COPY: Record<EmployerApplicationStatus | "all", string> = {
  all: "You haven't received any applications yet.",
  submitted: "No new applications to review.",
  under_review: "Nothing is being reviewed right now.",
  shortlisted: "You haven't shortlisted anyone yet.",
  accepted: "You haven't hired anyone yet.",
  rejected: "No rejected applications here.",
  withdrawn: "No withdrawn applications.",
};

/**
 * Employer Applications & Hiring surface (Module 28): status tabs (with
 * counts), a debounced search, a sort control, the application list and
 * pagination. Navigation state (status/page/search/sort) is lifted to the
 * route; search is debounced client-side before it touches the URL.
 *
 * One gig's proposals (/employer/jobs/[jobId]/applications); the heading shows
 * the job title. Everyone across all postings is on the People page.
 */
export function EmployerApplicationsView({
  status,
  page,
  jobId,
  search,
  sort,
  onStatusChange,
  onPageChange,
  onSearchChange,
  onSortChange,
}: {
  status: EmployerApplicationStatus | "all";
  page: number;
  jobId: string;
  search: string;
  sort: EmployerApplicationSortKey;
  onStatusChange: (status: EmployerApplicationStatus | "all") => void;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: EmployerApplicationSortKey) => void;
}) {
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, APPLICATION_SEARCH_DEBOUNCE_MS);

  useEffect(() => setSearchInput(search), [search]);

  useEffect(() => {
    if (debouncedSearch !== search) onSearchChange(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const jobQuery = useEmployerJob(jobId);
  const listQuery = useEmployerApplications({
    jobId,
    status,
    sort,
    search: debouncedSearch,
    page,
  });

  const counts = listQuery.data?.counts;
  const total = listQuery.data?.total ?? 0;
  const jobTitle = jobQuery.data?.title;

  const lowest = lowestOpenAmount((listQuery.data?.items ?? []).map((a) => a.proposal));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/employer/jobs"
            className="inline-flex items-center gap-1 rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Back to my jobs"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-neutral-900">Applications</h1>
            <p className="mt-1 truncate text-sm text-neutral-500">
              {jobTitle ? `${jobTitle} — review, shortlist or hire candidates` : "Loading this job…"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, headline or cover letter…"
          className="h-10 max-w-xs flex-1"
          leftIcon={<Search className="h-4 w-4 text-neutral-400" aria-hidden />}
          aria-label="Search applications"
        />
        <Select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as EmployerApplicationSortKey)}
          className="h-10 max-w-[11rem]"
          aria-label="Sort applications"
        >
          {APPLICATION_SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <div
        role="tablist"
        aria-label="Filter applications by status"
        className="flex gap-1.5 overflow-x-auto pb-1"
      >
        {APPLICATION_FILTER_TABS.map((tab) => {
          const active = status === tab.value;
          const tabTotal = counts ? counts[tab.value] : 0;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={active}
              onClick={() => onStatusChange(tab.value)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary-600 bg-primary-600 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-bold",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-neutral-100 text-neutral-500"
                )}
              >
                {tabTotal}
              </span>
            </button>
          );
        })}
      </div>

      {listQuery.isPending ? (
        <ListSkeleton />
      ) : listQuery.isError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-50 text-error-600">
            <AlertCircle className="h-7 w-7" aria-hidden />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-neutral-900">
            Something went wrong
          </h3>
          <p className="mt-1 max-w-xs text-xs text-neutral-500">
            {getFriendlyErrorMessage(listQuery.error)}
          </p>
          <div className="mt-4">
            <button
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
              onClick={() => listQuery.refetch()}
            >
              Try again
            </button>
          </div>
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
            <Users className="h-7 w-7" aria-hidden />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-neutral-900">
            {debouncedSearch ? "No matching applications" : "No applications here"}
          </h3>
          <p className="mt-1 max-w-xs text-xs text-neutral-500">
            {debouncedSearch
              ? "Try a different name or keyword, or clear the search."
              : EMPTY_COPY[status]}
          </p>
          {debouncedSearch && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setSearchInput("");
                  onSearchChange("");
                }}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
              >
                <Inbox className="h-3.5 w-3.5" aria-hidden /> Clear search
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {(listQuery.data?.items ?? []).map((application) => (
              <EmployerApplicationCard
                key={application.proposal.id}
                application={application}
                lowest={lowest !== null && application.proposal.proposedAmount === lowest && APPLICATION_REJECTABLE_FROM.includes(application.proposal.status)}
              />
            ))}
          </div>
          <JobsPagination
            page={listQuery.data?.page ?? 1}
            totalPages={listQuery.data?.totalPages ?? 1}
            total={total}
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}