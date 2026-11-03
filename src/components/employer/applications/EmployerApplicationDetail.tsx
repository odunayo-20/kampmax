"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  Clock,
  FileText,
  History,
  Users,
  Wallet,
} from "lucide-react";
import type { EmployerApplicationSummary } from "@/types/opportunity";
import { PROPOSAL_STATUS } from "@/types/opportunity";
import { formatNaira, formatDateTime } from "@/lib/utils";
import { formatFileSize } from "@/lib/contract-utils";
import { Avatar } from "@/components/ui";
import { ProposalStatusBadge } from "@/components/freelancer/opportunities/StatusBadges";
import { useEmployerJob } from "@/hooks/use-jobs";
import { ApplicationActions } from "./ApplicationActions";
import { CandidateProfilePreview } from "./CandidateProfilePreview";

function deliveryText(value: number, unit: string): string {
  const label = unit === "days" ? "day" : unit === "weeks" ? "week" : "month";
  return `${value} ${label}${value === 1 ? "" : "s"}`;
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof ClipboardList;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
      <Icon className="h-4 w-4 text-neutral-400" aria-hidden />
      {children}
    </h2>
  );
}

/**
 * Full application review surface (reader walls: this is a proposal ON THE
 * EMPLOYER'S OWN JOB only — the service layer guarantees ownership).
 * Shows the cover letter, screening answers, attachments and timeline beside
 * a public candidate profile preview and the status-aware action set.
 */
export function EmployerApplicationDetail({
  application,
}: {
  application: EmployerApplicationSummary;
}) {
  const { proposal, job, candidate } = application;
  const jobQuery = useEmployerJob(job.id);
  const screeningQuestions = jobQuery.data?.screeningQuestions ?? [];
  const isRejected =
    proposal.status === PROPOSAL_STATUS.REJECTED && !!proposal.rejectionReason;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/employer/applications"
            className="inline-flex items-center gap-1 rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Back to applications"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
          <span className="truncate text-sm font-medium text-neutral-500">
            Application for{" "}
            <Link href={`/employer/jobs/${job.id}`} className="text-primary-700 hover:underline">
              {job.title}
            </Link>
          </span>
        </div>
        <ProposalStatusBadge status={proposal.status} />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={candidate.name} src={candidate.avatar} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-neutral-900">{candidate.name}</h1>
            {candidate.headline && (
              <p className="mt-0.5 text-sm text-neutral-500">{candidate.headline}</p>
            )}
            <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Applied{" "}
              {formatDateTime(proposal.submittedAt ?? proposal.updatedAt)}
            </p>
          </div>
        </div>
      </div>

      {isRejected && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-error-700">
            Rejection feedback shown to the candidate
          </p>
          <p className="mt-1 text-sm text-error-800">{proposal.rejectionReason}</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <section className="rounded-xl border border-neutral-200 bg-white p-6">
            <SectionTitle icon={FileText}>Cover letter</SectionTitle>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
              {proposal.coverLetter || "No cover letter provided."}
            </p>
          </section>

          {proposal.milestones && proposal.milestones.length > 0 && (
            <section className="rounded-xl border border-neutral-200 bg-white p-6">
              <SectionTitle icon={Wallet}>Payment plan</SectionTitle>
              <p className="mt-1 text-xs text-neutral-500">
                If you hire this freelancer you fund and pay one milestone at a time, in this order — you only
                put money in escrow for the milestone currently being worked on.
              </p>
              <ol className="mt-3 divide-y divide-neutral-100">
                {proposal.milestones.map((m, index) => (
                  <li key={index} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-800">
                        {index + 1}. {m.title}
                      </p>
                      {m.description && <p className="mt-0.5 text-xs text-neutral-500">{m.description}</p>}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-neutral-900">{formatNaira(m.amount)}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {proposal.screeningAnswers.length > 0 && (
            <section className="rounded-xl border border-neutral-200 bg-white p-6">
              <SectionTitle icon={ClipboardList}>Screening answers</SectionTitle>
              <ul className="mt-3 space-y-4">
                {proposal.screeningAnswers.map((answer, idx) => {
                  const question =
                    screeningQuestions.find((q) => q.id === answer.questionId)?.question ??
                    `Question ${idx + 1}`;
                  return (
                    <li key={answer.questionId}>
                      <p className="text-sm font-medium text-neutral-800">{question}</p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-600">
                        {answer.answer || "No answer provided."}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {proposal.attachments.length > 0 && (
            <section className="rounded-xl border border-neutral-200 bg-white p-6">
              <SectionTitle icon={FileText}>Attachments</SectionTitle>
              <ul className="mt-3 space-y-2">
                {proposal.attachments.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm text-neutral-700">
                      {file.filename}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {formatFileSize(file.sizeBytes)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-neutral-400">
                File download isn&apos;t wired up in this prototype — metadata only.
              </p>
            </section>
          )}

          <section className="rounded-xl border border-neutral-200 bg-white p-6">
            <SectionTitle icon={History}>Application timeline</SectionTitle>
            <ol className="mt-3 space-y-3">
              {proposal.timeline.map((event) => (
                <li key={event.id} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-1">
                    <p className="text-sm text-neutral-700">{event.label}</p>
                    <span className="text-xs text-neutral-400">
                      {formatDateTime(event.at)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-neutral-900">Quote</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-neutral-500">
                  <Wallet className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                  Amount
                </dt>
                <dd className="font-semibold text-neutral-900">
                  {proposal.proposedAmount !== undefined
                    ? formatNaira(proposal.proposedAmount)
                    : "Not specified"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-neutral-500">
                  <Clock className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                  Delivery
                </dt>
                <dd className="font-medium text-neutral-800">
                  {deliveryText(proposal.delivery.value, proposal.delivery.unit)}
                </dd>
              </div>
            </dl>
          </div>

          <ApplicationActions application={application} />

          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-neutral-900">Candidate profile</h2>
            <div className="mt-3">
              <CandidateProfilePreview candidateId={candidate.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}