"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EngagementReasonDialog } from "./EngagementReasonDialog";
import { RequestChangesDialog } from "./RequestChangesDialog";
import type { RevisionKind, Revisions } from "@/lib/revisions";
import { formatNaira } from "@/lib/utils";
import { formatMinutes } from "@/lib/hourly";
import type { CurrentMilestoneInfo } from "@/lib/engagement-milestones";
import {
  cancelEngagement,
  completeEngagement,
  endEngagement,
  fundEngagement,
  openEngagementDispute,
  requestEngagementRevision,
  startEngagement,
  submitEngagementWork,
  withdrawEngagementSubmission,
  type EngagementStatus,
} from "@/services/jobs";
import type { ApiError } from "@/lib/api-client";

type Role = "employer" | "freelancer";
type Kind = "fund" | "start" | "submit" | "withdraw" | "complete" | "revise" | "dispute" | "cancel" | "end";

/** Collects a written reason in a dialog before the step runs. */
interface ReasonPrompt {
  title: string;
  body: string;
  label: string;
  placeholder: string;
  confirmLabel: string;
  keepLabel: string;
  minLength: number;
  destructive: boolean;
}

interface ActionDef {
  kind: Kind;
  label: string;
  busyLabel: string;
  variant: "primary" | "outline" | "ghost" | "destructive";
  className?: string;
  /** A yes/no question asked before the step runs. */
  confirm?: string;
  /** A written reason asked for before the step runs. */
  ask?: ReasonPrompt;
  /** Opens the request-changes form, which asks what kind of request this is as well as why. */
  form?: "revision";
  run: (id: string, text: string, kind?: RevisionKind) => Promise<{ error: ApiError | null }>;
}

const ACTIONS: Record<Kind, ActionDef> = {
  fund: {
    kind: "fund",
    label: "Fund escrow",
    busyLabel: "Funding…",
    variant: "primary",
    confirm: "Fund this engagement? The agreed amount is held in escrow from your wallet until you approve the work.",
    run: (id) => fundEngagement(id),
  },
  start: { kind: "start", label: "Start work", busyLabel: "Starting…", variant: "primary", run: (id) => startEngagement(id) },
  submit: {
    kind: "submit",
    label: "Submit work for review",
    busyLabel: "Submitting…",
    variant: "primary",
    confirm: "Submit your work for the client to review?",
    run: (id) => submitEngagementWork(id),
  },
  withdraw: {
    kind: "withdraw",
    label: "Withdraw submission",
    busyLabel: "Withdrawing…",
    variant: "outline",
    confirm: "Take your work back? It returns to in progress, and you can submit it again when it's ready.",
    run: (id) => withdrawEngagementSubmission(id),
  },
  complete: {
    kind: "complete",
    label: "Approve & release payment",
    busyLabel: "Releasing…",
    variant: "primary",
    confirm: "Approve the work? The escrowed payment is released to the freelancer and this can't be undone.",
    run: (id) => completeEngagement(id),
  },
  revise: {
    kind: "revise",
    label: "Request changes",
    busyLabel: "Sending…",
    variant: "outline",
    form: "revision",
    run: (id, text, kind) => requestEngagementRevision(id, text, kind),
  },
  dispute: {
    kind: "dispute",
    label: "Report a problem",
    busyLabel: "Reporting…",
    variant: "ghost",
    className: "text-error-700 hover:bg-error-50",
    ask: {
      title: "Report a problem",
      body: "This puts the payment on hold. Our team reviews both sides, then either pays the freelancer or refunds the employer. You can't undo it, so try talking to them first.",
      label: "What went wrong?",
      placeholder: "Describe what happened and what you expected.",
      confirmLabel: "Open dispute",
      keepLabel: "Go back",
      minLength: 10,
      destructive: true,
    },
    run: (id, text) => openEngagementDispute(id, text),
  },
  end: {
    kind: "end",
    label: "End contract",
    busyLabel: "Ending…",
    variant: "outline",
    confirm:
      "End this contract? The next week has not been funded, so nothing is held and nothing is owed. This can't be undone.",
    run: (id) => endEngagement(id),
  },
  cancel: {
    kind: "cancel",
    label: "Cancel",
    busyLabel: "Cancelling…",
    variant: "destructive",
    ask: {
      title: "Cancel this contract?",
      body: "Any money already held in escrow is refunded to the employer. This can't be undone.",
      label: "Why are you cancelling?",
      placeholder: "The other person will see this.",
      confirmLabel: "Cancel contract",
      keepLabel: "Keep contract",
      minLength: 5,
      destructive: true,
    },
    run: (id, text) => cancelEngagement(id, text),
  },
};

/**
 * Wording that depends on who is acting, where the engagement is, and — for a
 * contract paid in milestones — which milestone the money step is about.
 */
function actionFor(
  kind: Kind,
  role: Role,
  status: EngagementStatus,
  milestone?: CurrentMilestoneInfo
): ActionDef {
  const base = ACTIONS[kind];
  if (kind === "cancel" && role === "freelancer" && status === "PENDING_PAYMENT" && !milestone?.paidCount) {
    // Nothing is funded yet, so for the freelancer this is turning the job down.
    return {
      ...base,
      label: "Decline contract",
      busyLabel: "Declining…",
      ask: base.ask && {
        ...base.ask,
        title: "Decline this contract?",
        body: "The client hasn't funded this yet. Declining ends the contract and tells the client. This can't be undone.",
        label: "Why are you declining?",
        confirmLabel: "Decline contract",
      },
    };
  }
  if (milestone?.hourly) {
    // A week of an hourly contract: say what is held, what is worth paying, and what comes back.
    const week = milestone.title.toLowerCase();
    const cap = formatNaira(milestone.amount);
    const hours = formatMinutes(milestone.hourly.loggedMinutes);
    const worth = formatNaira(milestone.hourly.worth);
    if (kind === "fund") {
      return {
        ...base,
        label: `Fund ${week}`,
        confirm: `Fund ${week}? Up to ${cap} is held in escrow from your wallet. You only pay for the hours you approve; whatever isn't used is returned to your wallet.`,
      };
    }
    if (kind === "complete") {
      return {
        ...base,
        label: `Approve & pay ${week}`,
        confirm: `Approve ${week}: ${hours} for ${worth}? That is paid to the freelancer, and the rest of the ${cap} held for the week is returned to you. This can't be undone.`,
      };
    }
    if (kind === "submit") {
      const again = status === "REVISION_REQUESTED";
      return {
        ...base,
        label: again ? "Resubmit timesheet" : "Submit timesheet",
        busyLabel: again ? "Resubmitting…" : "Submitting…",
        confirm: `Submit ${hours} (${worth}) for the client to review? You can't add time while it is being reviewed.`,
      };
    }
    if (kind === "dispute" && base.ask) {
      return {
        ...base,
        ask: {
          ...base.ask,
          body: "This puts this week's payment on hold. Our team reviews the timesheet, then either pays the freelancer for the hours logged or refunds the employer. You can't undo it, so try talking to them first.",
        },
      };
    }
  }
  if (kind === "submit" && status === "REVISION_REQUESTED") {
    return {
      ...base,
      label: "Resubmit work",
      busyLabel: "Resubmitting…",
      confirm: "Resubmit your updated work for the client to review?",
    };
  }
  if (milestone) {
    // Say exactly which milestone and how much moves, before it does.
    const which = `milestone ${milestone.position} of ${milestone.total}`;
    const amount = formatNaira(milestone.amount);
    if (kind === "fund") {
      return {
        ...base,
        label: `Fund milestone ${milestone.position}`,
        confirm: `Fund ${which}, “${milestone.title}”? ${amount} is held in escrow from your wallet until you approve this milestone's work.`,
      };
    }
    if (kind === "complete") {
      return {
        ...base,
        label: `Approve & pay milestone ${milestone.position}`,
        confirm: `Approve ${which}, “${milestone.title}”? ${amount} is released to the freelancer and this can't be undone.`,
      };
    }
    if (kind === "dispute" && base.ask) {
      return {
        ...base,
        ask: {
          ...base.ask,
          body: "This puts the payment for this milestone on hold. Our team reviews both sides, then either pays the freelancer for it or refunds the employer. You can't undo it, so try talking to them first.",
        },
      };
    }
    if (kind === "cancel" && base.ask && milestone.paidCount > 0) {
      return {
        ...base,
        ask: {
          ...base.ask,
          body: "Milestones that were already paid stay paid. Any money held in escrow for the current milestone is refunded to the employer. This can't be undone.",
        },
      };
    }
  }
  return base;
}

/** Which actions each party may take at each status (mirrors the backend state machine). */
const ALLOWED: Record<Role, Partial<Record<EngagementStatus, Kind[]>>> = {
  employer: {
    PENDING_PAYMENT: ["fund", "cancel"],
    FUNDED: ["start", "cancel"],
    IN_PROGRESS: ["dispute"],
    SUBMITTED: ["complete", "revise", "dispute"],
    REVISION_REQUESTED: ["dispute"],
  },
  freelancer: {
    PENDING_PAYMENT: ["cancel"],
    FUNDED: ["cancel"],
    IN_PROGRESS: ["submit", "dispute"],
    SUBMITTED: ["withdraw", "dispute"],
    REVISION_REQUESTED: ["submit", "dispute"],
  },
};

export function engagementActionsFor(
  role: Role,
  status: EngagementStatus,
  /** `endable`: an hourly contract between paid weeks, which is ended rather than cancelled. */
  opts: { endable?: boolean } = {}
): Kind[] {
  // "Request changes" stays even when the revisions are used up: it is also how
  // a mistake or missing part is reported, and the form closes only what is closed.
  const kinds = ALLOWED[role][status] ?? [];
  return opts.endable ? kinds.map((k) => (k === "cancel" ? "end" : k)) : kinds;
}

/**
 * Buttons for the steps an engagement can take next. The backend enforces who
 * may do what; this only offers the valid ones, asks for confirmation or a
 * written reason where the step needs one, and reports the backend's refusals.
 */
export function EngagementActions({
  engagementId,
  status,
  role,
  revisions,
  milestone,
  onChanged,
}: {
  engagementId: string;
  status: EngagementStatus;
  role: Role;
  /** The delivery's revisions as the backend counts them; the request form explains what is left. */
  revisions: Revisions;
  /** The milestone this contract is on, when it is paid in several; words the money steps. */
  milestone?: CurrentMilestoneInfo;
  onChanged: () => void;
}) {
  const [asking, setAsking] = useState<Kind | null>(null);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  // What a step that succeeds without changing the status wants to tell the person.
  const [notice, setNotice] = useState<string | null>(null);
  // Between the weeks of an hourly contract that has been paid, "cancel" is "end".
  const endable = !!milestone?.hourly && status === "PENDING_PAYMENT" && milestone.paidCount > 0;
  const kinds = engagementActionsFor(role, status, { endable });
  if (kinds.length === 0) return null;

  const askingDef = asking ? actionFor(asking, role, status, milestone) : null;

  async function perform(def: ActionDef, text = "", kind?: RevisionKind) {
    if (busy) return;
    setBusy(def.kind);
    setError(null);
    setNotice(null);
    const { error: failure } = await def.run(engagementId, text, kind);
    setBusy(null);
    if (failure) {
      setError(failure.message ?? "That didn't work. Please try again.");
      // A written reason is worth keeping on screen; a plain confirm is not.
      if (!def.ask && !def.form) setAsking(null);
      return;
    }
    setAsking(null);
    // Extra work is not a revision and the work is not sent back, so nothing on
    // the page changes status: say what happened instead.
    if (kind === "NEW_SCOPE") {
      setNotice(
        "Sent. This is not a revision, and your review time keeps running. The freelancer can send you a new offer for the extra work."
      );
    }
    onChanged();
  }

  function choose(def: ActionDef) {
    setError(null);
    setNotice(null);
    if (def.ask || def.confirm || def.form) setAsking(def.kind);
    else void perform(def);
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {kinds.map((kind) => {
          const def = actionFor(kind, role, status, milestone);
          return (
            <Button
              key={kind}
              type="button"
              size="sm"
              variant={def.variant}
              className={def.className}
              disabled={busy !== null}
              onClick={() => choose(def)}
            >
              {busy === kind && !def.ask ? def.busyLabel : def.label}
            </Button>
          );
        })}
      </div>

      {error && !askingDef?.ask && !askingDef?.form && (
        <p role="alert" className="mt-2 text-xs text-error-600">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="mt-2 text-xs text-kampmax-text-secondary">
          {notice}
        </p>
      )}

      {askingDef?.form === "revision" && (
        <RequestChangesDialog
          revisions={revisions}
          busy={busy === askingDef.kind}
          error={error}
          onSubmit={(kind, text) => void perform(askingDef, text, kind)}
          onClose={() => setAsking(null)}
        />
      )}

      {askingDef?.ask && (
        <EngagementReasonDialog
          {...askingDef.ask}
          busy={busy === askingDef.kind}
          error={error}
          onSubmit={(text) => void perform(askingDef, text)}
          onClose={() => setAsking(null)}
        />
      )}
      {askingDef && !askingDef.ask && askingDef.confirm && (
        <ConfirmDialog
          open
          title={askingDef.label}
          body={askingDef.confirm}
          confirmLabel={askingDef.label}
          cancelLabel="Go back"
          pending={busy === askingDef.kind}
          onConfirm={() => void perform(askingDef)}
          onCancel={() => setAsking(null)}
        />
      )}
    </div>
  );
}
