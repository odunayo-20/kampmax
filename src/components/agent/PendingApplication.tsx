"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, FileCheck2 } from "lucide-react";
import { useAccommodationAgentProfile } from "@/hooks/use-accommodation";
import { cn, pluralize } from "@/lib/utils";
import { missingForApproval } from "@/types/accommodation";
import { ApplicationProgress } from "@/components/agent/ApplicationProgress";
import {
  agentStatusView,
  applicationSteps,
  opensAfterApproval,
  type AgentStatusView,
  type StatusTone,
} from "@/services/agent-application";
import type { AgentAccess } from "@/services/agent-dashboard";

const NOTICE_TONE: Record<StatusTone, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-950",
  attention: "border-amber-300 bg-amber-50 text-amber-950",
  bad: "border-red-200 bg-red-50 text-red-950",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-950",
};

/** How an agent's application reads, from what the access check already knows. */
export function viewOf(access: Pick<AgentAccess, "status" | "infoRequest">): AgentStatusView {
  return agentStatusView(access.status, { infoRequest: access.infoRequest });
}

/** Where the application stands in plain words, with the one thing worth doing about it. */
export function PendingNotice({ view, className }: { view: AgentStatusView; className?: string }) {
  const pathname = usePathname();
  const onVerification = pathname === "/agent/verification";
  return (
    <section
      role={view.tone === "attention" ? "alert" : "status"}
      className={cn("rounded-xl border px-4 py-3", NOTICE_TONE[view.tone], className)}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-bold">{view.title}</h2>
          <p className="mt-0.5 text-xs opacity-90">{view.text}</p>
        </div>
        {view.tone === "attention" && !onVerification && (
          <Link
            href="/agent/verification"
            className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 sm:self-auto"
          >
            Add documents <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}

/**
 * What a pending agent sees on the overview and on pages that open after approval: where the application stands,
 * what happens next, and their documents. Nothing here pretends they can list yet.
 */
export function PendingApplication({ access }: { access: AgentAccess }) {
  const pathname = usePathname();
  const profile = useAccommodationAgentProfile(true);
  const view = viewOf(access);
  const documents = profile.data?.documents ?? [];
  const missing = profile.data ? missingForApproval(documents) : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-kampmax-text">Your agent application</h1>
        {opensAfterApproval(pathname) && (
          <p className="mt-0.5 text-sm text-kampmax-text-secondary">
            This page opens once Kampmax approves you. Here is where things stand.
          </p>
        )}
      </div>

      <PendingNotice view={view} />

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <section className="rounded-xl border border-kampmax-border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-kampmax-text">Where your application is</h2>
          <ApplicationProgress steps={applicationSteps(view.tone)} />
        </section>

        <Link
          href="/agent/verification"
          className="flex items-start gap-3 self-start rounded-xl border border-kampmax-border bg-white p-4 hover:border-kampmax-blue/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-kampmax-blue">
            <FileCheck2 className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-kampmax-text">Your documents</span>
            <span className="mt-0.5 block text-xs text-kampmax-text-secondary">
              {profile.isPending
                ? "Checking…"
                : `${pluralize(documents.length, "document")} on file.${view.canAddDocuments ? " Add or check them." : ""}`}
            </span>
            {missing.length > 0 && (
              <span className="mt-1 block text-xs font-medium text-amber-800">Still needed: {missing.join(" and ")}.</span>
            )}
          </span>
        </Link>
      </div>
    </div>
  );
}
