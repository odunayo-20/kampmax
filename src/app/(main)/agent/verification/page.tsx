"use client";

import { useAccommodationAgentProfile, useAccommodationAgentStatus } from "@/hooks/use-accommodation";
import { LoadError } from "@/components/accommodation/enquiry-parts";
import { AgentDocuments } from "@/components/agent/AgentDocuments";
import { AgentStatusBadge } from "@/components/agent/AgentStatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { joinAnd } from "@/lib/agent-listings";
import { agentStatusView } from "@/services/agent-application";
import { missingForApproval } from "@/types/accommodation";

const NOTICE = {
  info: "border-blue-200 bg-blue-50 text-blue-950",
  attention: "border-amber-200 bg-amber-50 text-amber-950",
  bad: "border-red-200 bg-red-50 text-red-950",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-950",
};

/** Where the agent's verification stands, what is still needed, and the documents on file. */
export default function AgentVerificationPage() {
  const statusQuery = useAccommodationAgentStatus();
  const profileQuery = useAccommodationAgentProfile(Boolean(statusQuery.data?.applied));
  const a = profileQuery.data;
  const status = statusQuery.data?.status ?? "PENDING";
  const view = agentStatusView(status, { infoRequest: a?.infoRequest, rejectionReason: a?.rejectionReason, suspensionReason: a?.suspensionReason });
  const missing = a ? missingForApproval(a.documents) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-kampmax-text">Verification</h1>
          <p className="mt-1 text-sm text-kampmax-text-secondary">We check every agent before their rooms can be listed. It usually takes 24 to 48 hours.</p>
        </div>
        <AgentStatusBadge status={status} />
      </div>

      <div role="status" className={`rounded-xl border p-4 text-sm ${NOTICE[view.tone]}`}>
        <p className="font-semibold">{view.title}</p>
        <p className="mt-0.5">{view.text}</p>
        {status === "PENDING" && missing.length > 0 && <p className="mt-2">Still needed: {joinAnd(missing)}.</p>}
      </div>

      {profileQuery.isPending ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : profileQuery.isError || !a ? (
        <LoadError what="load your documents" error={profileQuery.error} onRetry={() => void profileQuery.refetch()} />
      ) : (
        <AgentDocuments documents={a.documents} canAdd={view.canAddDocuments} />
      )}
    </div>
  );
}
