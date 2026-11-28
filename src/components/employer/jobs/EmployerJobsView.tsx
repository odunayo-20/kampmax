"use client";

import Link from "next/link";
import { AlertCircle, Briefcase, Inbox, Plus } from "lucide-react";
import type { OpportunityType } from "@/types/opportunity";
import { EMPLOYER_JOB_TYPE_TABS } from "@/config/jobs";
import { useEmployerJobs } from "@/hooks/use-jobs";
import { defaultJobGroup, JOB_GROUPS, jobGroup, jobsHeadline, visibleJobs, type JobGroup } from "@/lib/employer-job-groups";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { Skeleton } from "@/components/home/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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

/** Every posting is loaded at once (up to 100) so the groups, counts and search cover all of them, as on mobile. */
const ALL = 100;

/**
 * The employer's postings in three groups (live, not live yet, ended), with a headline for what is waiting, a
 * search once there are more than a few, and a filter by kind. The same screen as the mobile app's my-jobs.
 */
export function EmployerJobsView({
  type,
  onTypeChange,
  initialGroup = null,
}: {
  type: OpportunityType | "all";
  onTypeChange: (type: OpportunityType | "all") => void;
  /** The group a link asked for; otherwise the first one with jobs in it. */
  initialGroup?: JobGroup | null;
}) {
  const [createHintOpen, setCreateHintOpen] = useState(false);
  const [picked, setPicked] = useState<JobGroup | null>(initialGroup);
  const [search, setSearch] = useState("");
  const listQuery = useEmployerJobs({ status: "all", type, page: 1, size: ALL });

  const jobs = listQuery.data?.items ?? [];
  const group = picked ?? defaultJobGroup(jobs);
  const counts: Record<JobGroup, number> = { live: 0, draft: 0, ended: 0 };
  for (const j of jobs) counts[jobGroup(j.status)] += 1;
  const shown = visibleJobs(jobs, group, search);
  const headline = jobsHeadline(jobs);
  const groupMeta = JOB_GROUPS.find((g) => g.id === group)!;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">My jobs</h1>
          <p className="mt-1 text-sm text-neutral-500">Your gigs, internships and vacancies, and the people responding to them.</p>
        </div>
        <Link
          href="/employer/jobs/create"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" aria-hidden /> Post a job
        </Link>
      </div>

      {headline && <p role="status" className="rounded-lg bg-accent-50 px-4 py-3 text-sm font-semibold text-accent-700">{headline}</p>}

      <div role="tablist" aria-label="Show jobs" className="flex gap-1.5 overflow-x-auto pb-1">
        {JOB_GROUPS.map((g) => {
          const active = group === g.id;
          return (
            <button
              key={g.id}
              role="tab"
              aria-selected={active}
              onClick={() => setPicked(g.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active ? "border-primary-600 bg-primary-600 text-white" : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              )}
            >
              {g.label}
              <span className={cn("rounded-full px-1.5 text-[10px] font-bold", active ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500")}>{counts[g.id]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Filter by kind" className="flex gap-1.5 overflow-x-auto pb-1">
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
                  active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {jobs.length > 4 && (
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your jobs"
            aria-label="Search your jobs"
            className="h-9 min-w-48 flex-1 rounded-md border border-neutral-200 px-3 text-sm"
          />
        )}
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
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
            <Briefcase className="h-7 w-7" aria-hidden />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-neutral-900">No jobs yet</h3>
          <p className="mt-1 max-w-xs text-xs text-neutral-500">
            Post a gig and freelancers on campus can send you proposals. It is free.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/employer/jobs/create"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary-600 px-3 text-xs font-semibold text-white hover:bg-primary-700"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden /> Post a job
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
        <div className="space-y-4">
          {shown.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-500">{search.trim() ? "No job matches that search." : groupMeta.empty}</p>
          )}
          {shown.map((job) => (
            <EmployerJobCard key={job.id} job={job} />
          ))}
        </div>
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