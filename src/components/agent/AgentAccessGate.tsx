"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Building2, Clock, AlertTriangle, ShieldX, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAccommodationAgentStatus, useAccommodationAgentProfile } from "@/hooks/use-accommodation";
import { DashboardShellSkeleton } from "@/components/layout/DashboardShellSkeleton";

export function AgentAccessGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status: authStatus } = useAuth();
  const statusQuery = useAccommodationAgentStatus();
  const profileQuery = useAccommodationAgentProfile(Boolean(statusQuery.data?.applied));

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace(`/login?returnTo=${encodeURIComponent("/agent")}`);
    }
  }, [authStatus, router]);

  if (authStatus === "loading" || statusQuery.isPending) {
    return <DashboardShellSkeleton />;
  }

  if (statusQuery.isError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
          <h2 className="mt-3 text-lg font-bold text-red-900">Could not verify agent status</h2>
          <p className="mt-2 text-sm text-red-700">
            {statusQuery.error?.message ?? "An error occurred while loading your profile."}
          </p>
          <button
            onClick={() => statusQuery.refetch()}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            Retry Check
          </button>
        </div>
      </main>
    );
  }

  const agentData = statusQuery.data;

  // 1. Not Applied
  if (!agentData?.applied) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-kampmax-blue/10 text-kampmax-blue">
          <Building2 className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-kampmax-text">
          List Accommodation on Kampmax
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-kampmax-text-secondary">
          You haven&apos;t registered as an accommodation agent yet. Turn your properties into occupancy
          by reaching verified students across Nigerian university campuses.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/onboarding/agent"
            className="inline-flex items-center gap-2 rounded-xl bg-kampmax-blue px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-kampmax-blue/90"
          >
            <span>Start Agent Onboarding</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/accommodation"
            className="inline-flex items-center gap-2 rounded-xl border border-kampmax-border bg-white px-5 py-2.5 text-sm font-semibold text-kampmax-text hover:bg-neutral-50"
          >
            Browse Accommodations
          </Link>
        </div>
      </main>
    );
  }

  // 2. Suspended or Revoked
  if (agentData.status === "SUSPENDED" || agentData.status === "REVOKED") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <ShieldX className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-kampmax-text">Agent Account {agentData.status}</h1>
        <p className="mt-2 text-sm text-kampmax-text-secondary">
          Your accommodation agent privileges have been {agentData.status.toLowerCase()} by an
          administrator. Please contact Kampmax Support to review your account standing.
        </p>
        <div className="mt-6">
          <Link
            href="/support"
            className="inline-flex rounded-xl bg-kampmax-navy px-5 py-2.5 text-sm font-semibold text-white"
          >
            Contact Campus Support
          </Link>
        </div>
      </main>
    );
  }

  const agentProfile = profileQuery.data;

  // 3. Pending Review Banner or Info Request
  return (
    <>
      {agentData.status === "PENDING" && (
        <aside
          role="status"
          className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <strong>Application Under Review:</strong> Our verification team is reviewing your
                documents. You can manage your property inventory now; listings will be published as
                soon as your account is approved.
              </span>
            </div>
            <Link
              href="/agent/verification"
              className="shrink-0 font-bold underline underline-offset-2 hover:text-amber-950"
            >
              Check KYC Documents →
            </Link>
          </div>
        </aside>
      )}

      {agentProfile?.infoRequest && (
        <aside
          role="alert"
          className="border-b border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <span>
              <strong>Action Needed:</strong> An admin requested additional information: &ldquo;
              {agentProfile.infoRequest}&rdquo;
            </span>
            <Link
              href="/agent/verification"
              className="shrink-0 font-bold underline underline-offset-2 hover:text-blue-950"
            >
              Update Documents →
            </Link>
          </div>
        </aside>
      )}

      {children}
    </>
  );
}

