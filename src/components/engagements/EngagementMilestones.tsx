import { CheckCircle2, Circle, CircleDot, XCircle, type LucideIcon } from "lucide-react";
import { cn, formatNaira } from "@/lib/utils";
import { describeDue } from "@/lib/engagement-milestones";
import { describeReceived } from "@/lib/service-fee";
import { formatMinutes, formatWorkDay } from "@/lib/hourly";
import type { EngagementMilestone, MilestoneStatus } from "@/services/jobs";

const STATUS: Record<MilestoneStatus, { label: string; icon: LucideIcon; tone: string }> = {
  COMPLETED: { label: "Paid", icon: CheckCircle2, tone: "text-success-600" },
  ACTIVE: { label: "Current", icon: CircleDot, tone: "text-primary-600" },
  UPCOMING: { label: "Up next", icon: Circle, tone: "text-neutral-300" },
  CANCELLED: { label: "Cancelled", icon: XCircle, tone: "text-neutral-400" },
};

/** An hourly contract can run for many weeks; only the latest few are listed. */
const WEEKS_SHOWN = 5;

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
 * paid one milestone at a time. For an hourly contract the same list is its
 * weeks: the days each covered, the hours worked, and what was actually paid
 * (never more than the week was funded for). Renders nothing for a contract
 * with a single payment.
 */
export function EngagementMilestones({
  milestones,
  showFee = false,
}: {
  milestones: EngagementMilestone[];
  /** The freelancer's view: say what each paid milestone came to after the service fee. */
  showFee?: boolean;
}) {
  if (milestones.length < 2) return null;
  const weeks = milestones[0]?.kind === "WEEK";
  const paid = milestones.filter((m) => m.status === "COMPLETED").length;
  const shown = weeks ? milestones.slice(-WEEKS_SHOWN) : milestones;
  const earlier = milestones.length - shown.length;

  return (
    <section aria-label={weeks ? "Weeks" : "Milestones"} className="mt-3 rounded-lg border border-kampmax-border">
      <div className="flex items-center justify-between gap-2 border-b border-kampmax-border px-3 py-2">
        <h3 className="text-xs font-semibold text-kampmax-text">{weeks ? "Weeks" : "Milestones"}</h3>
        <p className="text-xs text-kampmax-text-secondary">
          {weeks ? `${paid} ${paid === 1 ? "week" : "weeks"} paid` : `${paid} of ${milestones.length} paid`}
        </p>
      </div>
      <ol className="divide-y divide-kampmax-border">
        {shown.map((m) => {
          const { label, icon: Icon, tone } = STATUS[m.status];
          const note = settlement(m);
          // A week's own end date is not a deadline worth flagging.
          const due = m.kind === "WEEK" ? null : describeDue(m.dueDate, m.status);
          const settled = m.kind === "WEEK" && m.status === "COMPLETED";
          const received =
            showFee && m.status === "COMPLETED" ? describeReceived(m.billedAmount ?? m.amount, m.feeAmount) : null;
          return (
            <li key={m.id} className="flex items-start gap-2.5 px-3 py-2">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="break-words text-xs font-medium text-kampmax-text">
                  {m.kind === "WEEK" ? m.title : `${m.position}. ${m.title}`}
                  {m.kind === "WEEK" && m.periodStart && m.periodEnd && (
                    <span className="font-normal text-kampmax-text-secondary">
                      {" "}
                      · {formatWorkDay(m.periodStart)} – {formatWorkDay(m.periodEnd)}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-kampmax-text-secondary">
                  {label}
                  {settled && ` · ${formatMinutes(m.loggedMinutes)}`}
                  {m.autoReleased && " · released automatically"}
                </p>
                {due && (
                  <p
                    className={cn(
                      "mt-0.5 text-[11px]",
                      due.overdue ? "font-medium text-error-600" : "text-kampmax-text-secondary"
                    )}
                  >
                    {due.label}
                  </p>
                )}
                {received && <p className="mt-0.5 text-[11px] text-kampmax-text-secondary">{received}</p>}
                {note && <p className="mt-0.5 text-[11px] text-kampmax-text-secondary">{note}</p>}
              </div>
              <span className="shrink-0 text-xs font-semibold text-kampmax-text">
                {/* A settled week shows what it actually paid, not the most it could cost. */}
                {m.kind === "WEEK" && !settled ? `up to ${formatNaira(m.amount)}` : formatNaira(m.billedAmount ?? m.amount)}
              </span>
            </li>
          );
        })}
      </ol>
      {earlier > 0 && (
        <p className="border-t border-kampmax-border px-3 py-2 text-[11px] text-kampmax-text-secondary">
          {earlier} earlier {earlier === 1 ? "week" : "weeks"} not shown
        </p>
      )}
    </section>
  );
}
