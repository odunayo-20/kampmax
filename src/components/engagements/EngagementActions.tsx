"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EngagementReasonDialog } from "./EngagementReasonDialog";
import { MAX_REVISIONS } from "@/config/contract";
import {
  cancelEngagement,
  completeEngagement,
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
type Kind = "fund" | "start" | "submit" | "withdraw" | "complete" | "revise" | "dispute" | "cancel";

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
  run: (id: string, text: string) => Promise<{ error: ApiError | null }>;
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
    ask: {
      title: "Ask for changes",
      body: `Tell the freelancer what to fix. They can update the work and resubmit. You can ask for changes up to ${MAX_REVISIONS} times.`,
      label: "What needs to change?",
      placeholder: "e.g. The footer links are missing and the logo is blurry.",
      confirmLabel: "Send request",
      keepLabel: "Go back",
      minLength: 5,
      destructive: false,
    },
    run: (id, text) => requestEngagementRevision(id, text),
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

/** Wording that depends on who is acting and where the engagement is. */
function actionFor(kind: Kind, role: Role, status: EngagementStatus): ActionDef {
  const base = ACTIONS[kind];
  if (kind === "cancel" && role === "freelancer" && status === "PENDING_PAYMENT") {
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
  if (kind === "submit" && status === "REVISION_REQUESTED") {
    return {
      ...base,
      label: "Resubmit work",
      busyLabel: "Resubmitting…",
      confirm: "Resubmit your updated work for the client to review?",
    };
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

export function engagementActionsFor(role: Role, status: EngagementStatus, revisionCount = 0): Kind[] {
  const kinds = ALLOWED[role][status] ?? [];
  // Out of change requests: the employer must approve or dispute.
  return revisionCount >= MAX_REVISIONS ? kinds.filter((k) => k !== "revise") : kinds;
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
  revisionCount = 0,
  onChanged,
}: {
  engagementId: string;
  status: EngagementStatus;
  role: Role;
  /** Change requests used so far; hides "Request changes" once the limit is hit. */
  revisionCount?: number;
  onChanged: () => void;
}) {
  const [asking, setAsking] = useState<Kind | null>(null);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const kinds = engagementActionsFor(role, status, revisionCount);
  if (kinds.length === 0) return null;

  const askingDef = asking ? actionFor(asking, role, status) : null;

  async function perform(def: ActionDef, text = "") {
    if (busy) return;
    setBusy(def.kind);
    setError(null);
    const { error: failure } = await def.run(engagementId, text);
    setBusy(null);
    if (failure) {
      setError(failure.message ?? "That didn't work. Please try again.");
      // A written reason is worth keeping on screen; a plain confirm is not.
      if (!def.ask) setAsking(null);
      return;
    }
    setAsking(null);
    onChanged();
  }

  function choose(def: ActionDef) {
    setError(null);
    if (def.ask || def.confirm) setAsking(def.kind);
    else void perform(def);
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {kinds.map((kind) => {
          const def = actionFor(kind, role, status);
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

      {error && !askingDef?.ask && (
        <p role="alert" className="mt-2 text-xs text-error-600">
          {error}
        </p>
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
