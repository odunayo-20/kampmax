"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import {
  cancelEngagement,
  completeEngagement,
  fundEngagement,
  startEngagement,
  submitEngagementWork,
  type EngagementStatus,
} from "@/services/jobs";
import type { ApiError } from "@/lib/api-client";

type Role = "employer" | "freelancer";
type Kind = "fund" | "start" | "submit" | "complete" | "cancel";

interface ActionDef {
  kind: Kind;
  label: string;
  busyLabel: string;
  variant: "primary" | "outline" | "destructive";
  confirm?: string;
  run: (id: string) => Promise<{ error: ApiError | null }>;
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
  complete: {
    kind: "complete",
    label: "Approve & release payment",
    busyLabel: "Releasing…",
    variant: "primary",
    confirm: "Approve the work? The escrowed payment is released to the freelancer and this can't be undone.",
    run: (id) => completeEngagement(id),
  },
  cancel: {
    kind: "cancel",
    label: "Cancel",
    busyLabel: "Cancelling…",
    variant: "destructive",
    confirm: "Cancel this engagement? Any escrowed funds are refunded to the employer.",
    run: (id) => cancelEngagement(id),
  },
};

/** Which actions each party may take at each status (mirrors the backend state machine). */
const ALLOWED: Record<Role, Partial<Record<EngagementStatus, Kind[]>>> = {
  employer: {
    PENDING_PAYMENT: ["fund", "cancel"],
    FUNDED: ["start", "cancel"],
    SUBMITTED: ["complete"],
  },
  freelancer: {
    PENDING_PAYMENT: ["cancel"],
    FUNDED: ["cancel"],
    IN_PROGRESS: ["submit"],
  },
};

export function engagementActionsFor(role: Role, status: EngagementStatus): Kind[] {
  return ALLOWED[role][status] ?? [];
}

/**
 * Buttons for the steps an engagement can take next. The backend enforces who
 * may do what; this only offers the valid ones and reports its refusals.
 */
export function EngagementActions({
  engagementId,
  status,
  role,
  onChanged,
}: {
  engagementId: string;
  status: EngagementStatus;
  role: Role;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const kinds = engagementActionsFor(role, status);
  if (kinds.length === 0) return null;

  async function perform(def: ActionDef) {
    if (busy) return;
    if (def.confirm && !window.confirm(def.confirm)) return;
    setBusy(def.kind);
    setError(null);
    const { error: failure } = await def.run(engagementId);
    setBusy(null);
    if (failure) {
      setError(failure.message ?? "That didn't work. Please try again.");
      return;
    }
    onChanged();
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {kinds.map((kind) => {
          const def = ACTIONS[kind];
          return (
            <Button
              key={kind}
              type="button"
              size="sm"
              variant={def.variant}
              disabled={busy !== null}
              onClick={() => void perform(def)}
            >
              {busy === kind ? def.busyLabel : def.label}
            </Button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-error-600">
          {error}
        </p>
      )}
    </div>
  );
}
