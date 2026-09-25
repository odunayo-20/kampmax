"use client";

import Link from "next/link";
import {
  MapPin,
  Clock,
  Briefcase,
  Bookmark,
  CalendarDays,
  Wallet,
} from "lucide-react";
import type { Opportunity } from "@/types/opportunity";
import { OPPORTUNITY_STATUS } from "@/types/opportunity";
import {
  DURATION_LABEL,
  WORK_ARRANGEMENT_LABEL,
} from "@/config/opportunity";
import { formatNairaCompact, timeAgo } from "@/lib/utils";
import { OpportunityStatusBadge } from "./StatusBadges";

export function OpportunityCard({
  opportunity: o,
  saved,
  href,
}: {
  opportunity: Opportunity;
  saved?: boolean;
  href?: string;
}) {
  const category = o.categoryName ?? "Other";
  const budgetLabel = budgetText(o);
  const isOpen = o.status === OPPORTUNITY_STATUS.OPEN;

  return (
    <Link
      href={href ?? `/freelancer/find-work/${o.id}`}
      className="group block rounded-xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-medium uppercase tracking-wider text-primary-600">
            {category}
          </span>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold text-neutral-900 group-hover:text-primary-700">
            {o.title}
          </h3>
        </div>
        {saved ? (
          <Bookmark className="h-4 w-4 shrink-0 fill-primary-600 text-primary-600" aria-hidden />
        ) : null}
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{o.summary}</p>

      {o.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {o.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] text-neutral-600"
            >
              {skill}
            </span>
          ))}
          {o.skills.length > 4 && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
              +{o.skills.length - 4}
            </span>
          )}
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-neutral-600 sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>{WORK_ARRANGEMENT_LABEL[o.workArrangement]}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>{budgetLabel}</span>
        </div>
        {o.location.city && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
            <span>{o.location.city}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>{DURATION_LABEL[o.duration]}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>Closes {timeAgo(o.deadline).replace(" ago", "")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="capitalize">{o.experienceLevel}</span>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-neutral-800">{o.employer.name}</p>
          <p className="truncate text-[11px] text-neutral-500">
            {o.employer.descriptor}
            {o.employer.verified ? " · Verified" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] text-neutral-400">{timeAgo(o.postedAt)}</span>
          {!isOpen && <OpportunityStatusBadge status={o.status} />}
        </div>
      </div>
    </Link>
  );
}

export function budgetText(o: Opportunity): string {
  const { type, min, max } = o.budget;
  const range = (a?: number, b?: number) => {
    if (a !== undefined && b !== undefined) return `${formatNairaCompact(a)}–${formatNairaCompact(b)}`;
    if (a !== undefined) return `${formatNairaCompact(a)}+`;
    if (b !== undefined) return `Up to ${formatNairaCompact(b)}`;
    return "Negotiable";
  };
  switch (type) {
    case "hourly":
      return `${range(min, max)}/hr`;
    case "project":
      return `${range(min, max)}`;
    case "contract":
      return `Contract · ${range(min, max)}`;
    default:
      return range(min, max);
  }
}
