"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useAgentAccess,
  usePrefetchAgentDashboard,
} from "@/hooks/use-agent-dashboard";
import {
  AGENT_DASHBOARD_GATE,
  isAgentDashboardPath,
} from "@/services/agent-dashboard";
import { DashboardShellSkeleton } from "@/components/layout/DashboardShellSkeleton";
import { AgentAccessGate } from "@/components/agent/AgentAccessGate";
import { AgentSidebar } from "@/components/agent/AgentSidebar";
import { AgentTopbar } from "@/components/agent/AgentTopbar";
import { VerificationStatusBanner } from "@/components/verification/VerificationStatusBanner";
import type { AccommodationAgentStatus } from "@/types/accommodation";

const AGENT_OVERVIEW_PATH = "/agent";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDashboard = isAgentDashboardPath(pathname);
  const accessQuery = useAgentAccess({ enabled: isDashboard });
  usePrefetchAgentDashboard({ enabled: pathname === AGENT_OVERVIEW_PATH });

  const access = accessQuery.data ?? null;
  const loadError = accessQuery.isError && !access;

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (status === "loading" || (status === "authenticated" && !access && !loadError)) {
    return <DashboardShellSkeleton />;
  }

  if (loadError || !access) {
    return (
      <AgentAccessGate
        access={{
          kind: AGENT_DASHBOARD_GATE.NO_AGENT,
          status: null,
          canUseDashboard: false,
          message: "We couldn't load your agent profile. Please try again.",
        }}
      >
        {children}
      </AgentAccessGate>
    );
  }

  if (
    !access.canUseDashboard &&
    access.kind !== AGENT_DASHBOARD_GATE.PENDING_REVIEW &&
    access.kind !== AGENT_DASHBOARD_GATE.MORE_INFORMATION
  ) {
    return <AgentAccessGate access={access}>{children}</AgentAccessGate>;
  }

  const agentName = access.displayName ?? "Accommodation Agent";
  const agencyName = access.agencyName ?? null;
  const agentStatus: AccommodationAgentStatus = access.status ?? "APPROVED";

  const kycStatus =
    agentStatus === "APPROVED"
      ? "verified"
      : agentStatus === "SUSPENDED" || agentStatus === "REVOKED"
      ? "suspended"
      : agentStatus === "REJECTED"
      ? "rejected"
      : "pending_review";

  return (
    <div className="min-h-screen bg-kampmax-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <AgentSidebar
          agentName={agentName}
          agencyName={agencyName}
          status={agentStatus}
        />
      </aside>

      {/* Mobile header with drawer */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-kampmax-border bg-kampmax-navy px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1.5 text-white hover:bg-white/10"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <span className="truncate text-sm font-bold text-white">{agentName}</span>
        <span className="w-8" aria-hidden />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-kampmax-navy/60"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="absolute inset-y-0 left-0 w-72 bg-kampmax-navy"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setMobileOpen(false);
            }}
          >
            <div className="flex items-center justify-between px-4 pt-3">
              <span className="text-sm font-bold text-white">{agentName}</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="h-[calc(100%-3rem)]">
              <AgentSidebar
                agentName={agentName}
                agencyName={agencyName}
                status={agentStatus}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        <AgentTopbar
          agentName={agentName}
          status={agentStatus}
        />
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 space-y-5">
          {pathname !== "/agent/verification" && (
            <VerificationStatusBanner
              status={kycStatus}
              role="agent"
              verificationHref="/agent/verification"
            />
          )}
          <div key={pathname} className="page-enter">
            <AgentAccessGate access={access}>{children}</AgentAccessGate>
          </div>
        </main>
      </div>
    </div>
  );
}
