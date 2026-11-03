import { CheckCircle2, Circle, CircleDot, XCircle, type LucideIcon } from "lucide-react";
import { cn, formatNaira } from "@/lib/utils";
import type { EngagementMilestone, MilestoneStatus } from "@/services/jobs";

const STATUS: Record<MilestoneStatus, { label: string; icon: LucideIcon; tone: string }> = {
  COMPLETED: { label: "Paid", icon: CheckCircle2, tone: "text-success-600" },
  ACTIVE: { label: "Current", icon: CircleDot, tone: "text-primary-600" },
  UPCOMING: { label: "Up next", icon: Circle, tone: "text-neutral-300" },
  CANCELLED: { label: "Cancelled", icon: XCircle, tone: "text-neutral-400" },
};

/** How a dispute on one milestone ended, in plain words. */
function settlement(m: EngagementMilestone): string | null {
  if (!m.disputeOutcome) return null;
  return m.disputeOutcome === "REFUND"
    ? "A dispute was settled: refunded to the employer"
    : "A dispute was settled: paid to the freelancer";
}

/**
 * The milestones of a contract that is paid in several, in order: what has been
 * paid, what is current, and what is waiting. Money is funded, delivered and
 * paid one milestone at a time. Renders nothing for a single-payment contract.
 */
export function EngagementMilestones({ milestones }: { milestones: EngagementMilestone[] }) {
  if (milestones.length < 2) return null;
  const paid = milestones.filter((m) => m.status === "COMPLETED").length;

  return (
    <section aria-label="Milestones" className="mt-3 rounded-lg border border-kampmax-border">
      <div className="flex items-center justify-between gap-2 border-b border-kampmax-border px-3 py-2">
        <h3 className="text-xs font-semibold text-kampmax-text">Milestones</h3>
        <p className="text-xs text-kampmax-text-secondary">
          {paid} of {milestones.length} paid
        </p>
      </div>
      <ol className="divide-y divide-kampmax-border">
        {milestones.map((m) => {
          const { label, icon: Icon, tone } = STATUS[m.status];
          const note = settlement(m);
          return (
            <li key={m.id} className="flex items-start gap-2.5 px-3 py-2">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="break-words text-xs font-medium text-kampmax-text">
                  {m.position}. {m.title}
                </p>
                <p className="mt-0.5 text-[11px] text-kampmax-text-secondary">
                  {label}
                  {m.autoReleased && " · released automatically"}
                </p>
                {note && <p className="mt-0.5 text-[11px] text-kampmax-text-secondary">{note}</p>}
              </div>
              <span className="shrink-0 text-xs font-semibold text-kampmax-text">{formatNaira(m.amount)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
