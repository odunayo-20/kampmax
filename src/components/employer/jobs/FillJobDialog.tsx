"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useFillJob } from "@/hooks/use-jobs";
import { useJobApplicants } from "@/hooks/use-job-applications";
import { getFriendlyErrorMessage } from "@/lib/error-messages";

const NOTE_MAX = 1000;

/** The people still waiting on a posting: new, seen, shortlisted or being interviewed. */
export function waitingOn(counts: Record<string, number> | undefined): number {
  if (!counts) return 0;
  return (
    (counts.SUBMITTED ?? 0) +
    (counts.VIEWED ?? 0) +
    (counts.SHORTLISTED ?? 0) +
    (counts.INTERVIEWING ?? 0)
  );
}

export function fillText(waiting: number): string {
  if (waiting === 0) return "Nobody is waiting on this job. It will stop taking applications.";
  return `${waiting} ${waiting === 1 ? "person is" : "people are"} still waiting to hear from you. You can tell them the role is filled so nobody is left hanging.`;
}

/**
 * "The role is filled": closes a vacancy or internship and, if the employer
 * wants, turns down everyone still waiting in one step with a message they
 * all receive. Hiring done earlier is untouched.
 */
export function FillJobDialog({
  jobId,
  open,
  onClose,
}: {
  jobId: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return <FillJobDialogBody jobId={jobId} onClose={onClose} />;
}

function FillJobDialogBody({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  // The first page's counts say how many are waiting; they are only asked for once the dialog is open.
  const applicants = useJobApplicants(jobId, { page: 1 });
  const waiting = waitingOn(applicants.data?.counts);
  const fill = useFillJob();
  const [tell, setTell] = useState(true);
  const [message, setMessage] = useState("");

  return (
    <ConfirmDialog
      open
      title="Mark as filled?"
      body={applicants.isPending ? "Checking who is waiting…" : fillText(waiting)}
      confirmLabel="Mark as filled"
      cancelLabel="Not yet"
      pending={fill.isPending}
      confirmDisabled={applicants.isPending}
      onCancel={onClose}
      onConfirm={() =>
        fill.mutate(
          { id: jobId, declineRest: tell && waiting > 0, message },
          { onSuccess: onClose }
        )
      }
    >
      {waiting > 0 && (
        <div className="mt-3 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
            <input type="checkbox" checked={tell} onChange={(e) => setTell(e.target.checked)} />
            Tell them they were not selected
          </label>
          {tell && (
            <div>
              <label htmlFor="fill-note" className="mb-1 block text-xs font-medium text-neutral-700">
                A message for them (optional)
              </label>
              <textarea
                id="fill-note"
                rows={3}
                maxLength={NOTE_MAX}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="This role has been filled. Thank you for applying."
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
      )}
      {fill.isError && (
        <p role="alert" className="mt-3 text-xs text-error-600">
          {getFriendlyErrorMessage(fill.error)}
        </p>
      )}
    </ConfirmDialog>
  );
}
