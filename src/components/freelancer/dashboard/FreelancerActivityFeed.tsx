"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Briefcase,
  FileText,
  Clock,
  Wallet,
  Star,
  Calendar,
  Megaphone,
  ArrowRight,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { FREELANCER_ACTIVITY_META } from "@/config/freelancer-dashboard";
import type { FreelancerActivityEvent } from "@/types/freelancer-dashboard";

const ICON_MAP = {
  check: CheckCircle2,
  briefcase: Briefcase,
  file: FileText,
  clock: Clock,
  wallet: Wallet,
  star: Star,
  calendar: Calendar,
  megaphone: Megaphone,
} as const;

/** Recent activity feed. Only renders events the backend actually knows about —
 * no fabricated proposal/payment/contract events until M23–M25 exist. */
export function FreelancerActivityFeed({ events }: { events: FreelancerActivityEvent[] }) {
  return (
    <section aria-label="Recent activity" className="rounded-xl border border-kampmax-border bg-white p-5">
      <h2 className="text-sm font-bold text-kampmax-text">Recent activity</h2>
      {events.length === 0 ? (
        <p className="mt-4 rounded-lg bg-neutral-50 px-3 py-6 text-center text-xs text-kampmax-text-secondary">
          No activity yet. Your freelance milestones will appear here.
        </p>
      ) : (
        <ul className="mt-3 space-y-1">
          {events.map((e) => {
            const meta = FREELANCER_ACTIVITY_META[e.kind];
            const Icon = ICON_MAP[meta.icon];
            const content = (
              <span className="flex min-w-0 items-start gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-kampmax-text">{e.title}</span>
                  <span className="block text-xs text-kampmax-text-secondary">{e.message}</span>
                  <span className="block text-[10px] text-kampmax-text-muted">{timeAgo(e.createdAt)}</span>
                </span>
              </span>
            );
            return (
              <li key={e.id}>
                {e.href ? (
                  <Link href={e.href} className="block">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 border-t border-kampmax-border pt-2">
        <Link
          href="/freelancer/dashboard"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
        >
          View all activity <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
