"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Flag, Users } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/home/Skeleton";
import { JobsPagination } from "@/components/jobs/JobsPagination";
import { ReportDialog } from "@/components/jobs/ReportDialog";
import {
  APPLICANT_FILTER_TABS,
  APPLICATION_EMPLOYER_NOTE_MAX_CHARS,
  EMPLOYER_STATUS_META,
} from "@/config/cv";
import { useJobApplicants, useSetApplicationStatus } from "@/hooks/use-job-applications";
import { getFriendlyErrorMessage, getRefusalMessage } from "@/lib/error-messages";
import { jobApplicationKeys } from "@/lib/query-keys";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import {
  downloadCv,
  getApplicationCvLink,
  type Applicant,
  type ApplicationDecision,
  type ApplicationStatus,
} from "@/services/job-applications";

/** The decisions an employer can still make on an application in this status. */
export function availableDecisions(status: ApplicationStatus): ApplicationDecision[] {
  switch (status) {
    case "SUBMITTED":
    case "VIEWED":
      return ["SHORTLISTED", "REJECTED", "HIRED"];
    case "SHORTLISTED":
      return ["REJECTED", "HIRED"];
    default:
      return [];
  }
}

const DECISION_COPY: Record<
  ApplicationDecision,
  { button: string; title: string; body: (openings: number) => string; destructive?: boolean }
> = {
  SHORTLISTED: {
    button: "Shortlist",
    title: "Shortlist this applicant?",
    body: () => "They are told they made your shortlist. You can still reject or hire them later.",
  },
  REJECTED: {
    button: "Not selected",
    title: "Mark as not selected?",
    body: () => "They are told they were not selected. This is final: you can't change it afterwards.",
    destructive: true,
  },
  HIRED: {
    button: "Hire",
    title: "Hire this applicant?",
    body: (n) =>
      `They are told they got the role. This fills one of your ${n} ${n === 1 ? "opening" : "openings"} and is final.`,
  },
};

function ApplicantCard({
  applicant: a,
  openingsLeft,
  onDecide,
}: {
  applicant: Applicant;
  openingsLeft: number;
  onDecide: (applicant: Applicant, decision: ApplicationDecision) => void;
}) {
  const queryClient = useQueryClient();
  const [opening, setOpening] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = EMPLOYER_STATUS_META[a.status];
  const decisions = availableDecisions(a.status);

  const openCv = async () => {
    setError(null);
    setOpening(true);
    const result = await downloadCv(() => getApplicationCvLink(a.id));
    setOpening(false);
    if (result.error) setError(getFriendlyErrorMessage(result.error));
    // Opening the CV is what marks a new application as seen.
    else void queryClient.invalidateQueries({ queryKey: jobApplicationKeys.all });
  };

  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900">{a.applicant.name}</p>
          <p className="text-xs text-neutral-500">
            {a.applicant.username ? `@${a.applicant.username} · ` : ""}applied {timeAgo(a.createdAt)}
          </p>
        </div>
        <Badge variant={meta.tone}>{meta.label}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600">
          <FileText className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          {a.cvLabel}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void openCv()}
          disabled={!a.cvAvailable || opening}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {!a.cvAvailable ? "CV no longer available" : opening ? "Opening…" : "Download CV"}
        </Button>
      </div>

      {a.coverNote && (
        <div className="mt-3">
          <p className="text-xs font-medium text-neutral-500">Note</p>
          <p className="mt-0.5 whitespace-pre-line text-sm text-neutral-700">{a.coverNote}</p>
        </div>
      )}

      {a.answers.length > 0 && (
        <dl className="mt-3 space-y-2">
          {a.answers.map((x) => (
            <div key={x.questionId}>
              <dt className="text-xs font-medium text-neutral-500">{x.question}</dt>
              <dd className="mt-0.5 whitespace-pre-line text-sm text-neutral-700">{x.answer}</dd>
            </div>
          ))}
        </dl>
      )}

      {a.employerNote && (
        <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          <span className="font-medium">Your message:</span> {a.employerNote}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-error-600">
          {error}
        </p>
      )}

      {decisions.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
          {decisions.map((d) => {
            const noRoom = d === "HIRED" && openingsLeft <= 0;
            return (
              <Button
                key={d}
                size="sm"
                variant={d === "HIRED" ? "primary" : "outline"}
                disabled={noRoom}
                title={noRoom ? "Every opening is filled" : undefined}
                onClick={() => onDecide(a, d)}
              >
                {DECISION_COPY[d].button}
              </Button>
            );
          })}
          {a.status === "SUBMITTED" && (
            <span className="text-[11px] text-neutral-400">Open the CV to mark it as seen.</span>
          )}
        </div>
      )}
      {a.decidedAt && decisions.length === 0 && (
        <p className="mt-3 text-[11px] text-neutral-400">Decided {formatDate(a.decidedAt)}</p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setReporting(true)}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <Flag className="h-3 w-3" aria-hidden /> Report applicant
        </button>
      </div>
      <ReportDialog
        open={reporting}
        target={{ kind: "applicant", applicationId: a.id, name: a.applicant.name }}
        onClose={() => setReporting(false)}
      />
    </li>
  );
}

/**
 * The applicants to one vacancy or internship: their CVs, notes and answers,
 * and the decisions an employer can make. A decision is final, tells the
 * applicant, and hiring stops once every opening is filled.
 */
export function JobApplicantsView({ jobId }: { jobId: string }) {
  const [tab, setTab] = useState<ApplicationStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [deciding, setDeciding] = useState<{ applicant: Applicant; decision: ApplicationDecision } | null>(
    null
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const query = useJobApplicants(jobId, { status: tab === "ALL" ? undefined : tab, page });
  const setStatus = useSetApplicationStatus();
  const data = query.data;
  const openingsLeft = data ? Math.max(0, data.job.openings - data.job.hired) : 0;

  const close = () => {
    setDeciding(null);
    setNote("");
    setError(null);
  };

  const confirm = () => {
    if (!deciding) return;
    setError(null);
    setStatus.mutate(
      { id: deciding.applicant.id, status: deciding.decision, note },
      { onSuccess: close, onError: (err) => setError(getRefusalMessage(err)) }
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/employer/jobs/${jobId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to the posting
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900">Applicants</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {data ? (
            <>
              {data.job.title} · {data.job.hired} of {data.job.openings}{" "}
              {data.job.openings === 1 ? "opening" : "openings"} filled
            </>
          ) : (
            "People who applied with a CV."
          )}
        </p>
      </div>

      <div role="tablist" aria-label="Filter applicants" className="flex gap-1.5 overflow-x-auto pb-1">
        {APPLICANT_FILTER_TABS.map((t) => {
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={active}
              onClick={() => {
                setTab(t.value);
                setPage(1);
              }}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary-600 bg-primary-600 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-bold",
                  active ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
                )}
              >
                {data?.counts[t.value] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {query.isPending ? (
        <div className="space-y-4" role="status" aria-label="Loading applicants">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-error-100 bg-error-50 p-4 text-sm text-error-700">
          {getFriendlyErrorMessage(query.error)}{" "}
          <button className="font-semibold underline" onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      ) : data!.items.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-neutral-300 bg-white py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
            <Users className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-semibold text-neutral-900">
            {tab === "ALL" ? "No applications yet" : "Nobody here"}
          </p>
          <p className="mt-1 max-w-xs text-xs text-neutral-500">
            {tab === "ALL"
              ? "When someone applies you'll see their CV, note and answers here, and get a notification."
              : "No applicants have this status."}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {data!.items.map((a) => (
              <ApplicantCard
                key={a.id}
                applicant={a}
                openingsLeft={openingsLeft}
                onDecide={(applicant, decision) => setDeciding({ applicant, decision })}
              />
            ))}
          </ul>
          <JobsPagination
            page={data!.meta.page}
            totalPages={data!.meta.totalPages}
            total={data!.meta.total}
            onPageChange={setPage}
          />
        </>
      )}

      <ConfirmDialog
        open={deciding !== null}
        title={deciding ? DECISION_COPY[deciding.decision].title : ""}
        body={deciding ? DECISION_COPY[deciding.decision].body(data?.job.openings ?? 1) : ""}
        confirmLabel={deciding ? DECISION_COPY[deciding.decision].button : "Confirm"}
        destructive={deciding ? DECISION_COPY[deciding.decision].destructive : false}
        pending={setStatus.isPending}
        onConfirm={confirm}
        onCancel={close}
      >
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="decision-note">
            Message to {deciding?.applicant.applicant.name ?? "the applicant"} (optional)
          </label>
          <textarea
            id="decision-note"
            rows={3}
            value={note}
            maxLength={APPLICATION_EMPLOYER_NOTE_MAX_CHARS}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
          />
          {error && (
            <p role="alert" className="mt-2 text-xs text-error-600">
              {error}
            </p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}
