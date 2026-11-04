"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, PencilLine, Send, Ban, ExternalLink, RefreshCw, Users } from "lucide-react";
import type { Opportunity } from "@/types/opportunity";
import { OPPORTUNITY_STATUS, isHiringType } from "@/types/opportunity";
import { OPPORTUNITY_STATUS_META } from "@/config/opportunity";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { usePublishJob, useCloseJob } from "@/hooks/use-jobs";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { cn } from "@/lib/utils";
import { PublishJobDialog } from "./PublishJobDialog";
import { RenewJobDialog } from "./RenewJobDialog";

/**
 * A vacancy or internship whose paid live period has ended can be renewed. It
 * counts as ended even before the backend's sweep has marked it expired.
 */
export function canRenew(job: Opportunity, now = Date.now()): boolean {
  if (!isHiringType(job.opportunityType)) return false;
  if (job.status === OPPORTUNITY_STATUS.EXPIRED) return true;
  return (
    job.status === OPPORTUNITY_STATUS.OPEN &&
    !!job.expiresAt &&
    new Date(job.expiresAt).getTime() <= now
  );
}

const linkButtonClass =
  "inline-flex items-center justify-center gap-1.5 font-semibold rounded-md h-8 px-3 text-xs border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100";

/**
 * Status-aware action set for an employer's own job. Status transitions are
 * backend-owned: Publish only ever moves DRAFT → PENDING_REVIEW, Close only
 * moves OPEN → CLOSED. Every transition is confirmed first and its error is
 * mapped to a friendly message.
 */
export function EmployerJobActions({ job }: { job: Opportunity }) {
  const [confirm, setConfirm] = useState<"publish" | "close" | "renew" | null>(null);
  const hiring = isHiringType(job.opportunityType);
  const [error, setError] = useState<string | null>(null);
  const publishMutation = usePublishJob();
  const closeMutation = useCloseJob();
  const pending = publishMutation.isPending || closeMutation.isPending;

  const dismiss = () => {
    setConfirm(null);
    setError(null);
  };

  const runPublish = () => {
    setError(null);
    publishMutation.mutate(job.id, {
      onSuccess: dismiss,
      onError: (err) => setError(getFriendlyErrorMessage(err)),
    });
  };

  const runClose = () => {
    setError(null);
    closeMutation.mutate(job.id, {
      onSuccess: dismiss,
      onError: (err) => setError(getFriendlyErrorMessage(err)),
    });
  };

  return (
    <div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {job.status !== OPPORTUNITY_STATUS.DRAFT && (
          <Link
            href={`/employer/jobs/${job.id}/applications`}
            className={linkButtonClass}
            aria-label={`View applications for ${job.title}`}
          >
            <Users className="h-3.5 w-3.5" aria-hidden /> Applications
          </Link>
        )}

        {job.status === OPPORTUNITY_STATUS.DRAFT && (
          <>
            <Link href={`/employer/jobs/${job.id}`} className={linkButtonClass}>
              <Eye className="h-3.5 w-3.5" aria-hidden /> View
            </Link>
            <Link href={`/employer/jobs/${job.id}/edit`} className={linkButtonClass}>
              <PencilLine className="h-3.5 w-3.5" aria-hidden /> Edit
            </Link>
            <Button size="sm" disabled={pending} onClick={() => setConfirm("publish")}>
              <Send className="mr-1 h-3.5 w-3.5" aria-hidden /> Publish
            </Button>
          </>
        )}

        {job.status === OPPORTUNITY_STATUS.PENDING_REVIEW && (
          <>
            <Link href={`/employer/jobs/${job.id}`} className={linkButtonClass}>
              <Eye className="h-3.5 w-3.5" aria-hidden /> View
            </Link>
            <span
              className={cn(
                "inline-flex h-8 items-center rounded-md bg-warning-50 px-3 text-xs font-medium text-warning-700 ring-1 ring-inset ring-warning-200"
              )}
            >
              Awaiting moderation — goes live after review
            </span>
          </>
        )}

        {job.status === OPPORTUNITY_STATUS.OPEN && (
          <>
            <Link href={`/jobs/${job.id}`} className={linkButtonClass}>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden /> View on marketplace
            </Link>
            <Link href={`/employer/jobs/${job.id}`} className={linkButtonClass}>
              <Eye className="h-3.5 w-3.5" aria-hidden /> View
            </Link>
            <Button variant="destructive" size="sm" disabled={pending} onClick={() => setConfirm("close")}>
              <Ban className="mr-1 h-3.5 w-3.5" aria-hidden /> Close
            </Button>
          </>
        )}

        {(job.status === OPPORTUNITY_STATUS.CLOSED ||
          job.status === OPPORTUNITY_STATUS.EXPIRED ||
          job.status === OPPORTUNITY_STATUS.CANCELLED) && (
          <Link href={`/employer/jobs/${job.id}`} className={linkButtonClass}>
            <Eye className="h-3.5 w-3.5" aria-hidden /> View
          </Link>
        )}

        {canRenew(job) && (
          <Button size="sm" disabled={pending} onClick={() => setConfirm("renew")}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden /> Renew
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-error-600">
          {error}
        </p>
      )}

      {hiring ? (
        <>
          <PublishJobDialog
            jobId={job.id}
            open={confirm === "publish"}
            onClose={dismiss}
          />
          <RenewJobDialog job={job} open={confirm === "renew"} onClose={dismiss} />
        </>
      ) : (
        <ConfirmDialog
          open={confirm === "publish"}
          title="Publish this job?"
          body="This submits the job for moderation (Draft → Pending Review). It will go live on the marketplace once approved."
          confirmLabel="Publish"
          pending={pending}
          onConfirm={runPublish}
          onCancel={dismiss}
        />
      )}
      <ConfirmDialog
        open={confirm === "close"}
        title="Close this job?"
        body={OPPORTUNITY_STATUS_META[OPPORTUNITY_STATUS.CLOSED].hint}
        confirmLabel="Close job"
        destructive
        pending={pending}
        onConfirm={runClose}
        onCancel={dismiss}
      />
    </div>
  );
}