"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useRespondToInterview } from "@/hooks/use-job-applications";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  INTERVIEW_NOTE_MAX,
  applicantResponseView,
  canAnswer,
  interviewLine,
  type Interview,
} from "@/lib/interviews";

/**
 * The interview time an employer picked, for the person who applied: when and
 * where, and a way to say yes or that it does not work (with a reason, so the
 * employer can pick another). After the time has passed there is nothing to answer.
 */
export function InterviewPanel({
  applicationId,
  interview,
}: {
  applicationId: string;
  interview: Interview;
}) {
  const respond = useRespondToInterview();
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");
  const view = applicantResponseView(interview.response);
  const open = canAnswer(interview);

  return (
    <div className="mt-3 rounded-lg bg-primary-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-900">Your interview</p>
        <Badge variant={interview.response === "CONFIRMED" ? "success" : "info"}>{view.label}</Badge>
      </div>
      <p className="mt-1 text-sm font-semibold text-primary-700">{interviewLine(interview)}</p>
      {interview.note && <p className="mt-1 text-xs text-neutral-600">{interview.note}</p>}
      <p className="mt-1 text-xs text-neutral-600">{open ? view.text : "This time has passed."}</p>

      {respond.isError && !declining && (
        <p role="alert" className="mt-2 text-xs text-error-600">
          {getFriendlyErrorMessage(respond.error)}
        </p>
      )}

      {open && (
        <div className="mt-3 flex flex-wrap gap-2">
          {interview.response !== "CONFIRMED" && (
            <Button
              size="sm"
              disabled={respond.isPending}
              onClick={() => respond.mutate({ id: applicationId, action: "CONFIRM" })}
            >
              Confirm
            </Button>
          )}
          {interview.response !== "DECLINED" && (
            <Button
              size="sm"
              variant="outline"
              disabled={respond.isPending}
              onClick={() => setDeclining(true)}
            >
              Can&apos;t make it
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={declining}
        title="Tell the employer"
        body="They will be told this time does not work and can pick another. A short reason helps."
        confirmLabel="Send"
        cancelLabel="Back"
        pending={respond.isPending}
        onCancel={() => setDeclining(false)}
        onConfirm={() =>
          respond.mutate(
            { id: applicationId, action: "DECLINE", note },
            {
              onSuccess: () => {
                setDeclining(false);
                setNote("");
              },
            }
          )
        }
      >
        <div className="mt-3">
          <label htmlFor="interview-decline-note" className="mb-1 block text-xs font-medium text-neutral-700">
            Why (optional)
          </label>
          <textarea
            id="interview-decline-note"
            rows={3}
            value={note}
            maxLength={INTERVIEW_NOTE_MAX}
            placeholder="I have an exam that day. Mornings work for me."
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
          {respond.isError && (
            <p role="alert" className="mt-2 text-xs text-error-600">
              {getFriendlyErrorMessage(respond.error)}
            </p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}
