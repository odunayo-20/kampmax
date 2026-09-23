"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  FileWarning,
  XCircle,
  Ban,
  Store as StoreIcon,
  ArrowRight,
  Info,
} from "lucide-react";
import type { VendorAccess } from "@/types/vendor-dashboard";
import { VENDOR_DASHBOARD_GATE } from "@/types/vendor-dashboard";

/**
 * Full-screen state screens for every vendor access gate. Gating reflects
 * backend-authoritative status — the frontend only renders what the backend
 * reports. The UI never grants permissions simply by showing a profile.
 */
export function VendorAccessGate({ access }: { access: VendorAccess }) {
  switch (access.kind) {
    case VENDOR_DASHBOARD_GATE.NO_VENDOR:
      return <NoVendor />;
    case VENDOR_DASHBOARD_GATE.PENDING_REVIEW:
      return (
        <Gate
          icon={Clock}
          title="Application under review"
          body={
            access.message ??
            "Your vendor application is being reviewed by the Kampmax team. You'll get full access once approved."
          }
          actionLabel="View application status"
          actionHref="/onboarding/vendor"
          tone="info"
        />
      );
    case VENDOR_DASHBOARD_GATE.MORE_INFORMATION:
      return (
        <Gate
          icon={FileWarning}
          title="More information required"
          body={
            access.message ??
            "We need a little more information before we can approve your store."
          }
          actionLabel="Resume onboarding"
          actionHref="/onboarding/vendor"
          tone="warning"
        />
      );
    case VENDOR_DASHBOARD_GATE.REJECTED:
      return (
        <Gate
          icon={XCircle}
          title="Application not approved"
          body={
            access.message ??
            "Your vendor application was not approved. You can re-apply after resolving the reasons given."
          }
          actionLabel="Go to Kampmax"
          actionHref="/home"
          tone="error"
        />
      );
    case VENDOR_DASHBOARD_GATE.SUSPENDED:
      return (
        <Gate
          icon={Ban}
          title="Store suspended"
          body={
            access.message ??
            "Your store is currently suspended. Contact support if you believe this is in error."
          }
          actionLabel="Contact support"
          actionHref="/home"
          tone="error"
        />
      );
    case VENDOR_DASHBOARD_GATE.APPROVED:
    default:
      return (
        <div className="min-h-screen flex items-center justify-center bg-kampmax-bg p-4">
          <div className="bg-white rounded-2xl border border-kampmax-border p-8 max-w-sm w-full text-center">
            <CheckCircle2 className="h-10 w-10 text-success-600 mx-auto mb-3" />
            <h1 className="text-lg font-bold text-kampmax-text">Store is active</h1>
            <p className="text-sm text-kampmax-text-secondary mt-1">
              Your vendor profile is approved.
            </p>
            <Link
              href="/vendor"
              className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      );
  }
}

function NoVendor() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-kampmax-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-kampmax-border p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
          <StoreIcon className="h-8 w-8 text-primary-600" />
        </div>
        <h2 className="text-lg font-bold text-kampmax-text mb-2">Become a Vendor</h2>
        <p className="text-sm text-kampmax-text-secondary mb-6">
          You need an approved vendor profile to access the seller dashboard.
          Activate it from your account — no second signup needed.
        </p>
        <div className="space-y-2">
          <button
            onClick={() => router.push("/onboarding/vendor")}
            className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
          >
            Start vendor onboarding
          </button>
          <button
            onClick={() => router.push("/home")}
            className="w-full py-3 rounded-xl border border-kampmax-border text-kampmax-text text-sm font-medium hover:bg-neutral-50"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
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
  icon: typeof Clock;
  title: string;
  body: string;
  actionLabel: string;
  actionHref: string;
  tone: "info" | "warning" | "error";
}) {
  const ring =
    tone === "info"
      ? "bg-info-50 text-info-700 ring-info-200"
      : tone === "warning"
      ? "bg-warning-50 text-warning-700 ring-warning-200"
      : "bg-error-50 text-error-700 ring-error-200";
  return (
    <div className="min-h-screen bg-kampmax-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-kampmax-border p-8 max-w-sm w-full text-center">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ring-1 ${ring}`}>
          <Icon className="h-8 w-8" aria-hidden />
        </div>
        <h2 className="text-lg font-bold text-kampmax-text mb-2">{title}</h2>
        <p className="text-sm text-kampmax-text-secondary mb-6">{body}</p>
        <Link
          href={actionHref}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700"
        >
          {actionLabel} <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-4 flex items-start gap-1.5 text-left text-xs text-kampmax-text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Status is set by Kampmax. Contact support if you have questions.
        </p>
      </div>
    </div>
  );
}
