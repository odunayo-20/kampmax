"use client";

import { CalendarDays, Clock, Eye, Users, Wallet, Briefcase } from "lucide-react";
import type { Opportunity } from "@/types/opportunity";
import {
  DURATION_LABEL,
  WORK_ARRANGEMENT_LABEL,
} from "@/config/opportunity";
import { formatDate, timeAgo } from "@/lib/utils";
import { OpportunityStatusBadge } from "@/components/freelancer/opportunities/StatusBadges";
import { budgetText } from "@/components/freelancer/opportunities/OpportunityCard";
import { EmployerJobActions } from "./EmployerJobActions";

/**
 * Compact, status-aware row for an employer's own jobs. Shows spine status,
 * job meta and the actions valid for that status.
 */
export function EmployerJobCard({ job }: { job: Opportunity }) {
  const category = job.categoryName ?? "Other";

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs font-medium uppercase tracking-wider text-primary-600">
            {category}
          </span>
          <h3 className="mt-1 text-base font-semibold text-neutral-900">{job.title}</h3>
        </div>
        <OpportunityStatusBadge status={job.status} />
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{job.summary}</p>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-neutral-600 sm:grid-cols-3">
        <div className="flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>{budgetText(job)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>{WORK_ARRANGEMENT_LABEL[job.workArrangement]}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>{DURATION_LABEL[job.duration]}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>Closes {formatDate(job.deadline)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>{job.viewCount} views</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>{job.proposalCount} proposals</span>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
        <span className="text-[11px] text-neutral-400">Posted {timeAgo(job.postedAt)}</span>
      </div>

      <EmployerJobActions job={job} />
    </article>
  );
}