"use client";

import Link from "next/link";
import { useAccommodationAgentStatus } from "@/hooks/use-accommodation";
import { AgentStatusBadge } from "@/components/agent/AgentStatusBadge";
import { ApplicationProgress } from "@/components/agent/ApplicationProgress";
import { agentStatusView, applicationSteps } from "@/services/agent-application";

export default function AgentSubmittedPage() {
  const statusQuery = useAccommodationAgentStatus();
  const status = statusQuery.data?.status ?? "PENDING";

  return (
    <div className="min-h-screen bg-kampmax-bg px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl text-center">
        <div>
          <AgentStatusBadge status={status} className="mb-2" />
          <h1 className="text-2xl font-extrabold tracking-tight text-kampmax-text sm:text-3xl">
            Application sent
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-kampmax-text-secondary">
            Our trust and safety team reviews applications within 24 to 48 hours. You will get a notification when there is news.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-kampmax-border bg-white p-6 text-left shadow-xs">
          <h2 className="mb-4 text-sm font-semibold text-kampmax-text">What happens next</h2>
          <ApplicationProgress steps={applicationSteps(agentStatusView(status).tone)} />
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/agent"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-kampmax-blue px-6 py-3 text-xs font-bold text-white shadow-2xs hover:bg-kampmax-blue/90"
          >
            Open my agent page
          </Link>

          <Link
            href="/accommodation"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-kampmax-border bg-white px-6 py-3 text-xs font-semibold text-kampmax-text hover:bg-neutral-50"
          >
            See student housing
          </Link>
        </div>
      </div>
    </div>
  );
}

