"use client";

import Link from "next/link";
import { AlertCircle, Briefcase, Inbox, Plus } from "lucide-react";
import type { OpportunityStatus, OpportunityType } from "@/types/opportunity";
import {
  EMPLOYER_JOBS_PAGE_SIZE,
  EMPLOYER_JOB_FILTER_TABS,
  EMPLOYER_JOB_TYPE_TABS,
} from "@/config/jobs";
import { useEmployerJobs, useEmployerJobsSummary } from "@/hooks/use-jobs";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { Skeleton } from "@/components/home/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { JobsPagination } from "@/components/jobs/JobsPagination";
import { EmployerJobCard } from "./EmployerJobCard";
import { cn } from "@/lib/utils";
import { useState } from "react";

function ListSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading your jobs">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-1/2" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

const EMPTY_COPY: Record<OpportunityStatus | "all", string> = {
  all: "You haven't posted any jobs yet.",
  draft: "You don't have any draft jobs.",
  pending_review: "Nothing is waiting for moderation.",
  open: "You don't have any open jobs right now.",
  closed: "You haven't closed any jobs.",
  expired: "No expired jobs.",
  cancelled: "No cancelled jobs.",
};

/**
 * Employer job management surface: status tabs (with counts), the job list
 * and pagination. Status is the only navigation state — the rest lives in
 * the query cache.
 */
export function EmployerJobsView({
  status,
  type,
  page,
  onStatusChange,
  onTypeChange,
  onPageChange,
}: {
  status: OpportunityStatus | "all";
  type: OpportunityType | "all";
  page: number;
  onStatusChange: (status: OpportunityStatus | "all") => void;
  onTypeChange: (type: OpportunityType | "all") => void;
  onPageChange: (page: number) => void;
}) {
  const [createHintOpen, setCreateHintOpen] = useState(false);
  const countsQuery = useEmployerJobsSummary();
  const listQuery = useEmployerJobs({
    status,
    type,
    page,
    size: EMPLOYER_JOBS_PAGE_SIZE,
  });

  const counts = countsQuery.data ?? null;
  const total = listQuery.data?.total ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">My Jobs</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Post and manage your gigs, internships and vacancies as an employer.
          </p>
        </div>
        <Link
          href="/employer/jobs/create"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" aria-hidden /> Post an opportunity
        </Link>
      </div>

      <div
        role="tablist"
        aria-label="Filter by type"
        className="flex gap-1.5 overflow-x-auto pb-1"
      >
        {EMPLOYER_JOB_TYPE_TABS.map((tab) => {
          const active = type === tab.value;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={active}
              onClick={() => onTypeChange(tab.value)}
              className={cn(
                "shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tablist"
        aria-label="Filter jobs by status"
        className="flex gap-1.5 overflow-x-auto pb-1"
      >
        {EMPLOYER_JOB_FILTER_TABS.map((tab) => {
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
                  active ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
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
          <h3 className="mt-4 text-sm font-semibold text-neutral-900">Something went wrong</h3>
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
            <Briefcase className="h-7 w-7" aria-hidden />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-neutral-900">No jobs here</h3>
          <p className="mt-1 max-w-xs text-xs text-neutral-500">
            {EMPTY_COPY[status]}
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/employer/jobs/create"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary-600 px-3 text-xs font-semibold text-white hover:bg-primary-700"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden /> Post an opportunity
            </Link>
            <button
              onClick={() => setCreateHintOpen(true)}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
            >
              <Inbox className="h-3.5 w-3.5" aria-hidden /> What happens after publishing?
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {(listQuery.data?.items ?? []).map((job) => (
              <EmployerJobCard key={job.id} job={job} />
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

      <ConfirmDialog
        open={createHintOpen}
        title="How publishing works"
        body="Publishing puts your posting on the marketplace where students find it. Gigs are free. A vacancy or internship uses one of your free postings or a posting fee, and you see the cost before anything is charged. Postings stay live for a set number of days, then you can renew them."
        confirmLabel="Got it"
        onConfirm={() => setCreateHintOpen(false)}
        onCancel={() => setCreateHintOpen(false)}
      />
    </div>
  );
}