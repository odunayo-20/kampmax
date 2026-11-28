"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { EmployerApplicationSummary } from "@/types/opportunity";
import { PROPOSAL_STATUS } from "@/types/opportunity";
import {
  APPLICATION_ACCEPTABLE_FROM,
  APPLICATION_REJECTABLE_FROM,
  APPLICATION_REJECT_REASON_MAX,
  APPLICATION_REVIEWABLE_FROM,
  APPLICATION_SHORTLISTABLE_FROM,
} from "@/config/applications";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MessagePersonButton } from "@/components/messages/MessagePersonButton";
import { useAcceptApplication, useRejectApplication, useReviewApplication, useShortlistApplication } from "@/hooks/use-applications";
import { getRefusalMessage } from "@/lib/error-messages";
import { formatNaira } from "@/lib/utils";

type Step = "review" | "shortlist" | "reject" | "accept";

/**
 * What the employer can do with one freelancer's proposal on a gig: mark it seen, shortlist, decline with optional
 * feedback, or accept it and create the contract. Each is confirmed in the shared dialog; the backend owns every
 * status change. The same steps and words as the mobile app's job-proposals screen.
 */
export function ApplicationActions({ application }: { application: EmployerApplicationSummary }) {
  const { proposal, candidate } = application;
  const status = proposal.status;
  const name = candidate.name;
  const amount = proposal.proposedAmount !== undefined ? formatNaira(proposal.proposedAmount) : "the agreed price";

  const [asking, setAsking] = useState<Step | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const review = useReviewApplication();
  const shortlist = useShortlistApplication();
  const reject = useRejectApplication();
  const accept = useAcceptApplication();
  const pending = review.isPending || shortlist.isPending || reject.isPending || accept.isPending;

  const can: Record<Step, boolean> = {
    review: APPLICATION_REVIEWABLE_FROM.includes(status),
    shortlist: APPLICATION_SHORTLISTABLE_FROM.includes(status),
    reject: APPLICATION_REJECTABLE_FROM.includes(status),
    accept: APPLICATION_ACCEPTABLE_FROM.includes(status),
  };
  const canMessage = status !== PROPOSAL_STATUS.WITHDRAWN && status !== PROPOSAL_STATUS.REJECTED;

  const STEPS: Record<Step, { button: string; title: string; body: string; confirm: string; done: string; destructive?: boolean }> = {
    review: { button: "Mark as seen", title: "Mark this proposal as seen?", body: `${name} is told you are looking at it.`, confirm: "Mark as seen", done: "Marked as seen." },
    shortlist: { button: "Shortlist", title: `Shortlist ${name}?`, body: "They are told they made your shortlist. You can still accept or decline them later.", confirm: "Shortlist", done: `${name} is on your shortlist.` },
    reject: { button: "Decline proposal", title: "Decline this proposal?", body: `${name} is told, with your note if you add one. This cannot be undone.`, confirm: "Decline proposal", done: "Proposal declined.", destructive: true },
    accept: {
      button: "Accept & create contract",
      title: `Accept ${name}'s proposal?`,
      body: `You'll agree a contract of ${amount}. You then fund it from your wallet before work starts, and the money stays held until you approve the work. The job stops taking new proposals.`,
      confirm: "Accept & create contract",
      done: `Contract created with ${name}. Fund it from your contracts to start the work.`,
    },
  };

  const close = () => {
    setAsking(null);
    setError(null);
  };

  function run(step: Step) {
    setError(null);
    const options = {
      onSuccess: () => {
        close();
        setReason("");
        setSuccess(STEPS[step].done);
      },
      onError: (err: unknown) => setError(getRefusalMessage(err)),
    };
    if (step === "review") review.mutate(proposal.id, options);
    else if (step === "shortlist") shortlist.mutate(proposal.id, options);
    else if (step === "reject") reject.mutate({ id: proposal.id, reason: reason.trim() || undefined }, options);
    else accept.mutate(proposal.id, options);
  }

  const order: Step[] = ["accept", "shortlist", "review", "reject"];
  const def = asking ? STEPS[asking] : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {order.filter((s) => can[s]).map((s) =>
          s === "reject" ? (
            <button key={s} type="button" disabled={pending} onClick={() => setAsking(s)} className="text-sm font-semibold text-error-600 underline disabled:opacity-50">
              {STEPS[s].button}
            </button>
          ) : (
            <Button key={s} size="sm" variant={s === "accept" ? "primary" : "outline"} disabled={pending} onClick={() => setAsking(s)}>
              {STEPS[s].button}
            </Button>
          )
        )}
        {canMessage && <MessagePersonButton userId={candidate.id} className="inline-flex h-8 items-center rounded-md border border-neutral-300 px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 disabled:opacity-50" />}
      </div>

      {error && !asking && (
        <p role="alert" className="mt-2 text-xs text-error-600">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success-700">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {success}
        </p>
      )}

      <ConfirmDialog
        open={!!asking && !!def}
        title={def?.title ?? ""}
        body={def?.body ?? ""}
        confirmLabel={pending ? "Working…" : (def?.confirm ?? "")}
        destructive={def?.destructive}
        pending={pending}
        onConfirm={() => asking && run(asking)}
        onCancel={close}
      >
        {asking === "reject" && (
          <label className="mt-3 block text-sm font-medium text-kampmax-text">
            Note for {name} (optional)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, APPLICATION_REJECT_REASON_MAX))}
              rows={3}
              placeholder="For example: we went with someone closer to our budget."
              className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-normal"
            />
            <span className="block text-right text-[11px] font-normal text-neutral-400">{reason.length}/{APPLICATION_REJECT_REASON_MAX}</span>
          </label>
        )}
        {error && asking && <p role="alert" className="mt-2 text-xs text-error-600">{error}</p>}
      </ConfirmDialog>
    </div>
  );
}
