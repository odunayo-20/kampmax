"use client";

import { useState } from "react";
import Link from "next/link";
import type { Opportunity } from "@/types/opportunity";
import { OPPORTUNITY_STATUS, isHiringType } from "@/types/opportunity";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { usePublishJob, useCloseJob, useCancelJob } from "@/hooks/use-jobs";
import { getRefusalMessage } from "@/lib/error-messages";
import { postingLapsed as canRenew } from "@/lib/employer-job-groups";
import { FillJobDialog } from "./FillJobDialog";
import { PublishJobDialog } from "./PublishJobDialog";
import { RenewJobDialog } from "./RenewJobDialog";

/** One rule for "this paid posting has lapsed and can be renewed", shared with the jobs list. */
export { canRenew };

/** A vacancy or internship that is open or has just lapsed can be marked filled; a gig is filled by accepting a proposal. */
export function canFill(job: Opportunity): boolean {
  return isHiringType(job.opportunityType) && (job.status === OPPORTUNITY_STATUS.OPEN || job.status === OPPORTUNITY_STATUS.EXPIRED);
}

/** Anything that has ended can be posted again as a fresh draft. */
export function canPostAgain(job: Opportunity): boolean {
  return job.status === OPPORTUNITY_STATUS.CLOSED || job.status === OPPORTUNITY_STATUS.EXPIRED;
}

type Step = "publish" | "renew" | "edit" | "fill" | "repost";

/** The one step worth doing now, as on mobile's employer-job page; everything else is a quieter link. */
function mainStep(job: Opportunity): Step | null {
  if (job.status === OPPORTUNITY_STATUS.DRAFT) return "publish";
  if (canRenew(job)) return "renew";
  if (canFill(job)) return "fill";
  if (canPostAgain(job)) return "repost";
  return null;
}

const linkClass = "text-sm font-semibold text-kampmax-text underline";

/**
 * What the employer can do with their own job now. Status changes are the backend's: Publish only moves DRAFT to
 * PENDING_REVIEW, Close only OPEN to CLOSED, Discard only removes a draft. Each is confirmed first.
 * `onPage`: shown on the job's own page, so there is no "View" link back to it.
 */
export function EmployerJobActions({ job, onPage = false, onDiscarded }: { job: Opportunity; onPage?: boolean; onDiscarded?: () => void }) {
  const [confirm, setConfirm] = useState<"publish" | "close" | "renew" | "fill" | "discard" | null>(null);
  const hiring = isHiringType(job.opportunityType);
  const [error, setError] = useState<string | null>(null);
  const publishMutation = usePublishJob();
  const closeMutation = useCloseJob();
  const cancelMutation = useCancelJob();
  const pending = publishMutation.isPending || closeMutation.isPending || cancelMutation.isPending;
  const main = mainStep(job);
  const draft = job.status === OPPORTUNITY_STATUS.DRAFT;
  const open = job.status === OPPORTUNITY_STATUS.OPEN;

  const dismiss = () => {
    setConfirm(null);
    setError(null);
  };
  const fail = (err: unknown) => setError(getRefusalMessage(err));

  const runPublish = () => {
    setError(null);
    publishMutation.mutate(job.id, { onSuccess: dismiss, onError: fail });
  };
  const runClose = () => {
    setError(null);
    closeMutation.mutate(job.id, { onSuccess: dismiss, onError: fail });
  };
  const runDiscard = () => {
    setError(null);
    cancelMutation.mutate(job.id, {
      onSuccess: () => {
        dismiss();
        onDiscarded?.();
      },
      onError: fail,
    });
  };

  const mainButton =
    main === "publish" ? (
      <Button size="sm" disabled={pending} onClick={() => setConfirm("publish")}>Publish</Button>
    ) : main === "renew" ? (
      <Button size="sm" disabled={pending} onClick={() => setConfirm("renew")}>Renew</Button>
    ) : main === "fill" ? (
      <Button size="sm" disabled={pending} onClick={() => setConfirm("fill")}>Mark as filled</Button>
    ) : main === "repost" ? (
      <Link href={`/employer/jobs/create?from=${job.id}`} className="inline-flex h-8 items-center rounded-md bg-primary-600 px-3 text-xs font-semibold text-white hover:bg-primary-700">
        Post again
      </Link>
    ) : null;

  return (
    <div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {mainButton}
        {job.status === OPPORTUNITY_STATUS.PENDING_REVIEW && (
          <span className="inline-flex h-8 items-center rounded-md bg-warning-50 px-3 text-xs font-medium text-warning-700 ring-1 ring-inset ring-warning-200">
            Waiting for review. It goes live once Kampmax approves it.
          </span>
        )}
        {!onPage && (
          <Link href={`/employer/jobs/${job.id}`} className={linkClass}>
            View
          </Link>
        )}
        {draft && (
          <Link href={`/employer/jobs/${job.id}/edit`} className={linkClass}>
            Edit
          </Link>
        )}
        {open && (
          <Link href={`/jobs/${job.id}`} className={linkClass}>
            See it the way candidates do
          </Link>
        )}
        {main !== "fill" && canFill(job) && (
          <button type="button" disabled={pending} onClick={() => setConfirm("fill")} className={linkClass}>
            Mark as filled
          </button>
        )}
        {main !== "repost" && canPostAgain(job) && (
          <Link href={`/employer/jobs/create?from=${job.id}`} className={linkClass}>
            Post again
          </Link>
        )}
        {open && (
          <button type="button" disabled={pending} onClick={() => setConfirm("close")} className="text-sm font-semibold text-error-600 underline disabled:opacity-50">
            Close this job
          </button>
        )}
        {draft && (
          <button type="button" disabled={pending} onClick={() => setConfirm("discard")} className="text-sm font-semibold text-error-600 underline disabled:opacity-50">
            Discard draft
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-error-600">
          {error}
        </p>
      )}

      {hiring ? (
        <>
          <PublishJobDialog jobId={job.id} open={confirm === "publish"} onClose={dismiss} />
          <RenewJobDialog job={job} open={confirm === "renew"} onClose={dismiss} />
          <FillJobDialog jobId={job.id} open={confirm === "fill"} onClose={dismiss} />
        </>
      ) : (
        <ConfirmDialog
          open={confirm === "publish"}
          title="Publish this job?"
          body="Kampmax checks it first, then it goes live and freelancers can send proposals."
          confirmLabel="Publish"
          pending={pending}
          onConfirm={runPublish}
          onCancel={dismiss}
        />
      )}
      <ConfirmDialog
        open={confirm === "close"}
        title="Close this job?"
        body={`"${job.title}" will stop taking ${hiring ? "applications" : "proposals"}. What you already have stays.`}
        confirmLabel="Close job"
        destructive
        pending={pending}
        onConfirm={runClose}
        onCancel={dismiss}
      />
      <ConfirmDialog
        open={confirm === "discard"}
        title="Discard this draft?"
        body={`"${job.title}" will be deleted. This cannot be undone.`}
        confirmLabel="Discard"
        destructive
        pending={pending}
        onConfirm={runDiscard}
        onCancel={dismiss}
      />
    </div>
  );
}
