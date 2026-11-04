import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  REVISION_KINDS,
  REVISIONS_SUPPORT_HREF,
  revisionsLeftLabel,
  revisionsUsedLabel,
  type Revisions,
} from "@/lib/revisions";
import type { EngagementStatus } from "@/services/jobs";

/** An admin reads the same record while ruling on a dispute, in neutral words and without the help links. */
type Role = "employer" | "freelancer" | "admin";

/** The stages where revisions are a live question, or a record worth keeping in view. */
const DELIVERY: ReadonlySet<EngagementStatus> = new Set(["IN_PROGRESS", "SUBMITTED", "REVISION_REQUESTED", "DISPUTED"]);

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

/**
 * Where the delivery stands on revisions, shown to BOTH sides so nobody is
 * surprised: how many are allowed, used and left, and everything the client has
 * asked for with whether it counted. When none are left it says what is still
 * possible (reporting a mistake, approving, a dispute) and offers support. The
 * numbers come from the backend; nothing here decides a limit.
 */
export function EngagementRevisions({
  revisions,
  status,
  role,
}: {
  revisions: Revisions | undefined;
  status: EngagementStatus;
  role: Role;
}) {
  if (!revisions) return null;
  const { allowed, used, remaining, requests } = revisions;
  if (!DELIVERY.has(status) && requests.length === 0) return null;

  const out = remaining <= 0;
  // The close of the explanation changes with who is reading.
  const closed =
    role === "employer"
      ? "You can still report a mistake or something missing, approve the work, or open a dispute."
      : role === "freelancer"
        ? "The client can still report a mistake or something missing, approve the work, or open a dispute. If you can't agree on the next step, a dispute or support can help."
        : "";
  const who = { employer: "You have", freelancer: "The client has", admin: "The client has" }[role];

  return (
    <section aria-label="Revisions" className="mt-3 rounded-lg border border-kampmax-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-kampmax-text">Revisions</h3>
        <p className="text-xs text-kampmax-text-secondary" data-testid="revisions-summary">
          {revisionsUsedLabel(revisions)} · {revisionsLeftLabel(revisions)}
        </p>
      </div>

      {/* One pip per revision, filled as they are used. The words above carry the meaning. */}
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {Array.from({ length: allowed }, (_, i) => (
          <span
            key={i}
            className={cn("h-1.5 flex-1 rounded-full", i < used ? "bg-accent-500" : "bg-kampmax-border")}
          />
        ))}
      </div>

      {out && (
        <p className="mt-2 text-[11px] leading-relaxed text-kampmax-text-secondary" data-testid="revisions-out">
          {`${who} used all ${allowed} revisions. `}
          {closed}
          {role !== "admin" && (
            <>
              {" "}
              <Link href={REVISIONS_SUPPORT_HREF} className="font-medium text-kampmax-blue underline">
                Contact support
              </Link>
            </>
          )}
        </p>
      )}

      {requests.length > 0 && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer font-medium text-kampmax-text-secondary">
            What was asked for ({requests.length})
          </summary>
          <ol className="mt-2 space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="rounded-md bg-kampmax-bg px-2.5 py-2">
                <p className="flex flex-wrap items-center justify-between gap-x-2 text-[11px] text-kampmax-text-secondary">
                  <span className={cn("font-medium", r.counted ? "text-accent-700" : "text-kampmax-text")}>
                    {REVISION_KINDS[r.kind].tag}
                  </span>
                  <span>{formatWhen(r.createdAt)}</span>
                </p>
                <p className="mt-1 break-words text-xs text-kampmax-text">“{r.note}”</p>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
