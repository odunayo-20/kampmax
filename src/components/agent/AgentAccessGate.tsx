"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Clock,
  AlertCircle,
  XCircle,
  Ban,
  ArrowRight,
  Info,
  LucideIcon,
} from "lucide-react";
import {
  AGENT_DASHBOARD_GATE,
  type AgentAccess,
} from "@/services/agent-dashboard";

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
      return (
        <>
          <aside
            role="alert"
            className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Information Requested:</strong> {access.message}
                </span>
              </div>
              <Link
                href="/agent/verification"
                className="shrink-0 font-bold underline underline-offset-2 hover:text-amber-950"
              >
                Update Verification Documents →
              </Link>
            </div>
          </aside>
          {children}
        </>
      );

    case AGENT_DASHBOARD_GATE.PENDING_REVIEW:
      return (
        <>
          <aside
            role="status"
            className="border-b border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-blue-600" />
                <span>
                  <strong>Application Under Review:</strong> Our trust & verification team is reviewing
                  your documents. You can set up your properties and units now; publishing listings
                  will unlock upon approval.
                </span>
              </div>
              <Link
                href="/agent/verification"
                className="shrink-0 font-bold underline underline-offset-2 hover:text-blue-950"
              >
                Check Documents →
              </Link>
            </div>
          </aside>
          {children}
        </>
      );

    case AGENT_DASHBOARD_GATE.APPROVED:
    default:
      return <>{children}</>;
  }
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
