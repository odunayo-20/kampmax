"use client";

import { usePathname, useRouter } from "next/navigation";
import { Building2, XCircle, Ban, LucideIcon } from "lucide-react";
import {
  AGENT_DASHBOARD_GATE,
  type AgentAccess,
} from "@/services/agent-dashboard";
import { showsPendingApplication } from "@/services/agent-application";
import { PendingApplication, PendingNotice, viewOf } from "@/components/agent/PendingApplication";

export function AgentAccessGate({
  access,
  children,
}: {
  access: AgentAccess;
  children: React.ReactNode;
}) {
  switch (access.kind) {
    case AGENT_DASHBOARD_GATE.NO_AGENT:
      return <NoAgent />;

    case AGENT_DASHBOARD_GATE.REJECTED:
      return (
        <Gate
          icon={XCircle}
          title="Application Not Approved"
          body={
            access.message ??
            "Your accommodation agent application was not approved. You can update your details and re-apply."
          }
          actionLabel="Update Application"
          actionHref="/onboarding/agent/apply"
          tone="error"
        />
      );

    case AGENT_DASHBOARD_GATE.SUSPENDED:
      return (
        <Gate
          icon={Ban}
          title="Agent Account Restricted"
          body={
            access.message ??
            "Your accommodation agent privileges have been suspended. Please contact Kampmax support."
          }
          actionLabel="Contact Support"
          actionHref="/support"
          tone="error"
        />
      );

    case AGENT_DASHBOARD_GATE.MORE_INFORMATION:
    case AGENT_DASHBOARD_GATE.PENDING_REVIEW:
      return <WaitingForReview access={access}>{children}</WaitingForReview>;

    case AGENT_DASHBOARD_GATE.APPROVED:
    default:
      return <>{children}</>;
  }
}

/**
 * A pending agent: the overview and the pages that open after approval show where the application stands; profile,
 * verification and settings stay usable under one notice.
 */
function WaitingForReview({ access, children }: { access: AgentAccess; children: React.ReactNode }) {
  const pathname = usePathname();
  if (showsPendingApplication(access.kind, pathname)) return <PendingApplication access={access} />;
  return (
    <>
      <PendingNotice view={viewOf(access)} className="mb-4" />
      {children}
    </>
  );
}

function Gate({
  icon: Icon,
  title,
  body,
  actionLabel,
  actionHref,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel: string;
  actionHref: string;
  tone: "info" | "warning" | "error";
}) {
  const router = useRouter();

  const toneStyles = {
    info: "bg-blue-100 text-blue-600",
    warning: "bg-amber-100 text-amber-600",
    error: "bg-red-100 text-red-600",
  }[tone];

  return (
    <div className="flex min-h-[500px] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-kampmax-border bg-white p-8 text-center shadow-xs">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${toneStyles}`}>
          <Icon className="h-8 w-8" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-kampmax-text">{title}</h2>
        <p className="mb-6 text-sm text-kampmax-text-secondary">{body}</p>
        <div className="space-y-2">
          <button
            onClick={() => router.push(actionHref)}
            className="w-full rounded-xl bg-kampmax-blue py-3 text-sm font-semibold text-white hover:bg-kampmax-blue/90"
          >
            {actionLabel}
          </button>
          <button
            onClick={() => router.push("/home")}
            className="w-full rounded-xl border border-kampmax-border py-3 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}

function NoAgent() {
  const router = useRouter();
  return (
    <div className="flex min-h-[500px] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-kampmax-border bg-white p-8 text-center shadow-xs">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-kampmax-blue/10 text-kampmax-blue">
          <Building2 className="h-8 w-8" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-kampmax-text">List Accommodation on Kampmax</h2>
        <p className="mb-6 text-sm text-kampmax-text-secondary">
          Activate your Accommodation Agent profile from your existing Kampmax account — no second signup needed.
        </p>
        <div className="space-y-2">
          <button
            onClick={() => router.push("/onboarding/agent")}
            className="w-full rounded-xl bg-kampmax-blue py-3 text-sm font-semibold text-white shadow-2xs hover:bg-kampmax-blue/90"
          >
            Start Agent Onboarding
          </button>
          <button
            onClick={() => router.push("/accommodation")}
            className="w-full rounded-xl border border-kampmax-border py-3 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
          >
            Browse Accommodations
          </button>
        </div>
      </div>
    </div>
  );
}
