"use client";

import { AgentHub } from "@/components/agent/AgentHub";
import { useAccommodationAgentProfile } from "@/hooks/use-accommodation";
import { useAgentAccess } from "@/hooks/use-agent-dashboard";

export default function AgentOverviewPage() {
  const accessQuery = useAgentAccess();
  const profileQuery = useAccommodationAgentProfile(true);
  const agentName = accessQuery.data?.displayName ?? profileQuery.data?.agencyName ?? profileQuery.data?.fullName ?? "Agent";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-kampmax-text">Overview</h1>
        <p className="mt-0.5 text-sm text-kampmax-text-secondary">Here&apos;s how {agentName} is doing.</p>
      </div>
      <AgentHub />
    </div>
  );
}
