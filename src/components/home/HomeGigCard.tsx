"use client";

import Link from "next/link";
import { Briefcase, MapPin, Wallet, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import type { Opportunity } from "@/types/opportunity";
import { formatNairaCompact, timeAgo, cn } from "@/lib/utils";
import { WORK_ARRANGEMENT_LABEL } from "@/config/opportunity";

interface HomeGigCardProps {
  opportunity: Opportunity;
  className?: string;
}

export function HomeGigCard({ opportunity: o, className }: HomeGigCardProps) {
  const budget = o.budget.min && o.budget.max
    ? `${formatNairaCompact(o.budget.min)} - ${formatNairaCompact(o.budget.max)}`
    : o.budget.min
    ? `From ${formatNairaCompact(o.budget.min)}`
    : o.budget.max
    ? `Up to ${formatNairaCompact(o.budget.max)}`
    : "Negotiable";

  return (
    <Link
      href={`/freelancer/find-work/${o.id}`}
      className={cn(
        "bg-white rounded-2xl border border-neutral-200/90 p-4 flex flex-col justify-between group",
        "hover:border-primary-300 hover:shadow-md transition-all duration-200",
        className
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100">
            {o.categoryName ?? "Campus Gig"}
          </span>
          <span className="text-[10px] font-semibold text-neutral-400">
            {timeAgo(o.postedAt)}
          </span>
        </div>

        <div>
          <h3 className="text-xs sm:text-sm font-bold text-neutral-900 line-clamp-2 leading-snug group-hover:text-primary-600 transition-colors">
            {o.title}
          </h3>
          <p className="text-[11px] text-neutral-500 line-clamp-2 mt-1 leading-relaxed">
            {o.summary}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
            <Briefcase className="h-3 w-3 text-neutral-400" />
            {WORK_ARRANGEMENT_LABEL[o.workArrangement] || "Remote"}
          </span>
          {o.location.city && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
              <MapPin className="h-3 w-3 text-neutral-400" />
              {o.location.city}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t border-neutral-100 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-medium text-neutral-400 block">Budget</span>
          <span className="text-xs sm:text-sm font-extrabold text-neutral-900 tracking-tight">
            {budget}
          </span>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 group-hover:translate-x-0.5 transition-transform">
          Apply <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
