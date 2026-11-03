import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Engagement } from "@/services/jobs";

type Role = "employer" | "freelancer";

/** The parts of an engagement the notices read. */
export type EngagementNoticeData = Pick<
  Engagement,
  "status" | "revisionNote" | "cancellationReason" | "dispute"
>;

const TONES = {
  warning: "border-accent-100 bg-accent-50 text-accent-700",
  danger: "border-error-100 bg-error-50 text-error-700",
  success: "border-success-100 bg-success-50 text-success-700",
  neutral: "border-kampmax-border bg-kampmax-bg text-kampmax-text-secondary",
} as const;

function Notice({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: keyof typeof TONES;
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("mt-3 flex gap-2.5 rounded-lg border p-3 text-xs", TONES[tone])}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1 break-words leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

const PARTY_LABEL = { EMPLOYER: "The client", FREELANCER: "The freelancer" } as const;

/**
 * Explains the *why* behind a contract's state: what changes were asked for,
 * why it was cancelled, or how a dispute stands and was settled. Renders
 * nothing when there is nothing to explain.
 */
export function EngagementNotices({ engagement, role }: { engagement: EngagementNoticeData; role: Role }) {
  const { status, revisionNote, cancellationReason, dispute } = engagement;
  const me = role === "employer" ? "EMPLOYER" : "FREELANCER";

  if (status === "REVISION_REQUESTED" && revisionNote) {
    return (
      <Notice
        tone="warning"
        icon={RotateCcw}
        title={role === "freelancer" ? "The client asked for changes" : "You asked for changes"}
      >
        “{revisionNote}”
      </Notice>
    );
  }

  if (dispute && !dispute.resolvedAt) {
    const who = dispute.openedBy === me ? "You" : dispute.openedBy ? PARTY_LABEL[dispute.openedBy] : "Someone";
    return (
      <Notice tone="danger" icon={AlertTriangle} title="Dispute open — payment on hold">
        {who} reported a problem: “{dispute.reason}”. Our team will review it and settle the payment.
      </Notice>
    );
  }

  if (dispute?.resolvedAt) {
    const released = dispute.outcome === "RELEASE";
    return (
      <Notice
        tone={released ? "success" : "neutral"}
        icon={released ? CheckCircle2 : XCircle}
        title={
          released
            ? "Dispute resolved — payment released to the freelancer"
            : "Dispute resolved — payment refunded to the employer"
        }
      >
        {dispute.resolution}
      </Notice>
    );
  }

  if (status === "CANCELLED" && cancellationReason) {
    return (
      <Notice tone="neutral" icon={XCircle} title="Cancelled">
        Reason: “{cancellationReason}”
      </Notice>
    );
  }

  return null;
}
