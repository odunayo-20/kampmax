"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
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
        {/* Celebration Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 shadow-xs">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div className="mt-6">
          <AgentStatusBadge status={status} className="mb-2" />
          <h1 className="text-2xl font-extrabold tracking-tight text-kampmax-text sm:text-3xl">
            Agent Application Received!
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-kampmax-text-secondary">
            Thank you for applying to become a verified Kampmax accommodation agent. Our trust & campus
            safety team reviews applications and credentials within <strong>24 to 48 hours</strong>.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-kampmax-border bg-white p-6 text-left shadow-xs">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-kampmax-blue">
            What Happens Next
          </h2>
          <ApplicationProgress steps={applicationSteps(agentStatusView(status).tone)} />
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/agent"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-kampmax-blue px-6 py-3 text-xs font-bold text-white shadow-2xs hover:bg-kampmax-blue/90"
          >
            <span>Open Agent Workspace</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/accommodation"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-kampmax-border bg-white px-6 py-3 text-xs font-semibold text-kampmax-text hover:bg-neutral-50"
          >
            Browse Accommodations
          </Link>
        </div>
      </div>
    </div>
  );
}

