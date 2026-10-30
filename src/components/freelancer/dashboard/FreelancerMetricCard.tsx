"use client";

import { Briefcase, Handshake, CheckCircle2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FreelancerDashboardMetric } from "@/types/freelancer-dashboard";

const ICON: Record<FreelancerDashboardMetric["key"], typeof Briefcase> = {
  active_proposals: Briefcase,
  active_contracts: Handshake,
  completed_projects: CheckCircle2,
  wallet_balance: Wallet,
};

const TONE: Record<FreelancerDashboardMetric["tone"], string> = {
  neutral: "text-primary-600 bg-primary-50",
  info: "text-info-700 bg-info-50",
  success: "text-success-600 bg-success-50",
  gold: "text-yellow-700 bg-yellow-50",
};

/** Backend-supplied metric card. Never fabricated — only renders what the
 * dashboard service returns (`—` when a value can't be read). */
export function FreelancerMetricCard({ metric }: { metric: FreelancerDashboardMetric }) {
  const Icon = ICON[metric.key] ?? Briefcase;
  return (
    <div className="rounded-xl border border-kampmax-border bg-white p-4">
      <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-lg", TONE[metric.tone])}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className="text-lg font-bold text-kampmax-text">{metric.valueLabel}</p>
      <p className="text-xs text-kampmax-text-secondary">{metric.label}</p>
      {metric.sublabel && (
        <p className="mt-0.5 text-[11px] text-kampmax-text-muted">{metric.sublabel}</p>
      )}
    </div>
  );
}
