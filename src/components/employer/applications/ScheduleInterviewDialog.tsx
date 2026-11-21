"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useCancelInterview,
  useScheduleInterview,
  useSetApplicationStatus,
} from "@/hooks/use-job-applications";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  INTERVIEW_MAX_DAYS,
  INTERVIEW_NOTE_MAX,
  INTERVIEW_PLACE_MAX,
  interviewBodyFrom,
  interviewLine,
} from "@/lib/interviews";
import { interviewOf, type Applicant } from "@/services/job-applications";

/**
 * Pick a time and place to meet someone. The applicant is told and asked to
 * confirm. For a person not yet at the interview stage this also moves them
 * there; "Just move to the interview stage" does that without naming a time,
 * for an interview arranged by phone. With a time already set it changes it,
 * or calls it off.
 */
export function ScheduleInterviewDialog({
  applicant,
  onClose,
}: {
  applicant: Applicant | null;
  onClose: () => void;
}) {
  if (!applicant) return null;
  return <Body key={applicant.id} applicant={applicant} onClose={onClose} />;
}

function Body({ applicant, onClose }: { applicant: Applicant; onClose: () => void }) {
  const existing = interviewOf(applicant);
  const interviewing = applicant.status === "INTERVIEWING";
  const [when, setWhen] = useState("");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const schedule = useScheduleInterview();
  const move = useSetApplicationStatus();
  const callOff = useCancelInterview();
  const busy = schedule.isPending || move.isPending || callOff.isPending;
  const failure =
    problem ??
    (schedule.error || move.error || callOff.error
      ? getFriendlyErrorMessage(schedule.error ?? move.error ?? callOff.error)
      : null);

  const send = () => {
    const result = interviewBodyFrom({ when, place, note });
    if ("problem" in result) {
      setProblem(result.problem);
      return;
    }
    setProblem(null);
    schedule.mutate({ id: applicant.id, body: result.body }, { onSuccess: onClose });
  };

  const name = applicant.applicant.name;
  return (
    <ConfirmDialog
      open
      title={existing ? "Change the interview time" : `Interview ${name}`}
      body={
        existing
          ? `Now: ${interviewLine(existing)}. A new time replaces it and asks ${name} to confirm again.`
          : `Pick a time between one hour and ${INTERVIEW_MAX_DAYS} days from now. ${name} is told and asked to confirm.`
      }
      confirmLabel={existing ? "Send the new time" : "Send interview time"}
      cancelLabel="Close"
      pending={schedule.isPending}
      confirmDisabled={busy}
      onConfirm={send}
      onCancel={onClose}
    >
      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="interview-when" className="mb-1 block text-xs font-medium text-neutral-700">
            Date and time
          </label>
          <input
            id="interview-when"
            type="datetime-local"
            value={when}
            onChange={(e) => {
              setWhen(e.target.value);
              setProblem(null);
            }}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="interview-place" className="mb-1 block text-xs font-medium text-neutral-700">
            Where (optional)
          </label>
          <input
            id="interview-place"
            type="text"
            value={place}
            maxLength={INTERVIEW_PLACE_MAX}
            placeholder="Block C, room 2, or a meeting link"
            onChange={(e) => setPlace(e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="interview-note" className="mb-1 block text-xs font-medium text-neutral-700">
            A note for them (optional)
          </label>
          <textarea
            id="interview-note"
            rows={3}
            value={note}
            maxLength={INTERVIEW_NOTE_MAX}
            placeholder="Bring your ID. Ask for Emeka at the desk."
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
        </div>

        {failure && (
          <p role="alert" className="text-xs text-error-600">
            {failure}
          </p>
        )}

        <div className="flex flex-wrap gap-3 text-xs">
          {!interviewing && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                move.mutate({ id: applicant.id, status: "INTERVIEWING" }, { onSuccess: onClose })
              }
              className="font-semibold text-primary-700 underline disabled:opacity-60"
            >
              Just move to the interview stage
            </button>
          )}
          {existing && (
            <button
              type="button"
              disabled={busy}
              onClick={() => callOff.mutate(applicant.id, { onSuccess: onClose })}
              className="font-semibold text-error-700 underline disabled:opacity-60"
            >
              Call the time off
            </button>
          )}
        </div>
      </div>
    </ConfirmDialog>
  );
}
