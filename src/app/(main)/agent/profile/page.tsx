"use client";

import Link from "next/link";
import { useAccommodationAgentProfile, useAccommodationAgentStatus } from "@/hooks/use-accommodation";
import { LoadError } from "@/components/accommodation/enquiry-parts";
import { AgentDetailsForm } from "@/components/agent/AgentDetailsForm";
import { AgentDocuments } from "@/components/agent/AgentDocuments";
import { AgentStatusBadge } from "@/components/agent/AgentStatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { agentStatusView } from "@/services/agent-application";

/** The agent's documents and contact details: what Kampmax has on file, and a way to fix it. Like mobile's agent-profile. */
export default function AgentProfilePage() {
  const statusQuery = useAccommodationAgentStatus();
  const profileQuery = useAccommodationAgentProfile(Boolean(statusQuery.data?.applied));
  const a = profileQuery.data;
  const status = statusQuery.data?.status ?? "PENDING";
  const view = agentStatusView(status, { infoRequest: a?.infoRequest, rejectionReason: a?.rejectionReason, suspensionReason: a?.suspensionReason });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-kampmax-text">Documents and details</h1>
          {a && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-kampmax-text-secondary">
              <span>{a.agencyName?.trim() || a.fullName}</span>
              <AgentStatusBadge status={status} />
            </p>
          )}
        </div>
        <Link href="/accommodation" className="rounded-md border border-kampmax-border bg-white px-3 py-2 text-xs font-semibold text-kampmax-text hover:bg-kampmax-bg">
          Preview
        </Link>
      </div>

      {profileQuery.isPending ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : profileQuery.isError || !a ? (
        <LoadError what="load your details" error={profileQuery.error} onRetry={() => void profileQuery.refetch()} />
      ) : (
        <>
          {view.tone === "attention" && (
            <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">{view.title}</p>
              <p className="mt-0.5">{view.text}</p>
            </div>
          )}
          <AgentDocuments documents={a.documents} canAdd={view.canAddDocuments} />
          <AgentDetailsForm agent={a} />
        </>
      )}
    </div>
  );
}
