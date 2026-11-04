"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Send, X } from "lucide-react";
import type { Opportunity } from "@/types/opportunity";
import { Button } from "@/components/ui";
import { CvUploadForm } from "@/components/cv/CvUploadForm";
import {
  APPLICATION_ANSWER_MAX_CHARS,
  APPLICATION_COVER_NOTE_MAX_CHARS,
} from "@/config/cv";
import { useApplyToJob, useCvs } from "@/hooks/use-job-applications";
import { formatFileSize } from "@/lib/cv";
import { getRefusalMessage } from "@/lib/error-messages";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20";

/** The first required question left unanswered, or null when every one has an answer. */
export function firstMissingAnswer(
  questions: Opportunity["screeningQuestions"],
  answers: Record<string, string>
): string | null {
  const missing = questions.find((q) => !q.optional && !(answers[q.id] ?? "").trim());
  return missing ? missing.question : null;
}

/**
 * Applying to a vacancy or internship: choose one of your saved CVs, add an
 * optional note, and answer the employer's questions. No file is uploaded here
 * unless you add a new CV; the application points at the one you chose.
 */
export function ApplyDialog({
  job,
  open,
  onClose,
  onApplied,
}: {
  job: Opportunity;
  open: boolean;
  onClose: () => void;
  onApplied?: () => void;
}) {
  const cvsQuery = useCvs();
  const apply = useApplyToJob(job.id);
  const [cvId, setCvId] = useState("");
  const [note, setNote] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const cvs = cvsQuery.data ?? [];

  // Start on the newest CV, and follow a CV that was just added.
  useEffect(() => {
    if (!open) return;
    if (!cvs.some((c) => c.id === cvId)) setCvId(cvs[0]?.id ?? "");
  }, [open, cvs, cvId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !apply.isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, apply.isPending, onClose]);

  if (!open) return null;

  const missing = firstMissingAnswer(job.screeningQuestions, answers);
  const blocked = !cvId || !!missing;

  const submit = () => {
    setError(null);
    apply.mutate(
      {
        cvId,
        coverNote: note.trim() || undefined,
        screeningAnswers: job.screeningQuestions
          .map((q) => ({ questionId: q.id, answer: (answers[q.id] ?? "").trim() }))
          .filter((a) => a.answer),
      },
      {
        onSuccess: () => {
          onApplied?.();
          onClose();
        },
        // "You already applied", "this posting is closed" and the like are written for the person.
        onError: (err) => setError(getRefusalMessage(err)),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Apply for ${job.title}`}>
      <div className="absolute inset-0 bg-black/40" aria-hidden onClick={apply.isPending ? undefined : onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Apply for {job.title}</h2>
            <p className="mt-0.5 text-xs text-neutral-500">{job.employer.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={apply.isPending}
            aria-label="Close"
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-neutral-700">Choose a CV *</legend>
            {cvsQuery.isPending ? (
              <p className="text-xs text-neutral-500">Loading your CVs…</p>
            ) : cvs.length === 0 ? (
              <p className="mb-3 text-xs text-neutral-500">
                You don&apos;t have a CV saved yet. Add one and it will be ready for every application.
              </p>
            ) : (
              <ul className="space-y-2">
                {cvs.map((cv) => (
                  <li key={cv.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm",
                        cvId === cv.id ? "border-primary-600 bg-primary-50" : "border-neutral-200 hover:bg-neutral-50"
                      )}
                    >
                      <input
                        type="radio"
                        name="apply-cv"
                        value={cv.id}
                        checked={cvId === cv.id}
                        onChange={() => setCvId(cv.id)}
                        className="h-4 w-4 accent-primary-600"
                      />
                      <FileText className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-neutral-900">{cv.label}</span>
                        <span className="block truncate text-xs text-neutral-500">
                          {cv.filename} · {formatFileSize(cv.sizeBytes)}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <CvUploadForm count={cvs.length} onUploaded={(cv) => setCvId(cv.id)} />
            </div>
            {cvs.length > 0 && (
              <p className="mt-2 text-[11px] text-neutral-400">
                Manage your CVs in{" "}
                <Link href="/profile/cvs" className="font-medium text-primary-600 hover:underline">
                  My CVs
                </Link>
                .
              </p>
            )}
          </fieldset>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700" htmlFor="apply-note">
              Note to the employer (optional)
            </label>
            <textarea
              id="apply-note"
              rows={3}
              value={note}
              maxLength={APPLICATION_COVER_NOTE_MAX_CHARS}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Say a little about why you're a good fit."
              className={fieldClass}
            />
          </div>

          {job.screeningQuestions.map((q) => (
            <div key={q.id}>
              <label className="mb-1 block text-xs font-semibold text-neutral-700" htmlFor={`apply-q-${q.id}`}>
                {q.question}
                {q.optional ? <span className="ml-1 font-normal text-neutral-400">(optional)</span> : " *"}
              </label>
              <textarea
                id={`apply-q-${q.id}`}
                rows={2}
                value={answers[q.id] ?? ""}
                maxLength={APPLICATION_ANSWER_MAX_CHARS}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                className={fieldClass}
              />
            </div>
          ))}

          <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            Your chosen CV, note and answers will be shared with {job.employer.name}. They can open your CV for a
            few minutes at a time, through a private link. Kampmax staff can also read them to review a report or
            keep the platform safe, and each time is logged.
          </p>

          {error && (
            <p role="alert" className="text-sm text-error-600">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={apply.isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={blocked || apply.isPending}>
            <Send className="mr-1.5 h-4 w-4" aria-hidden />
            {apply.isPending ? "Sending…" : "Send application"}
          </Button>
        </div>
        {missing && (
          <p className="mt-2 text-right text-[11px] text-neutral-400">Answer &ldquo;{missing}&rdquo; to continue.</p>
        )}
      </div>
    </div>
  );
}
