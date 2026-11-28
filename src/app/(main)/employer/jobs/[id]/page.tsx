"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  MapPin,
  ShieldAlert,
  Users,
  Wallet,
  PenLine,
} from "lucide-react";
import {
  categoryLabelFor,
  campusNameFor,
} from "@/services/opportunity";
import {
  OPPORTUNITY_STATUS_META,
  OPPORTUNITY_TYPE_META,
  DURATION_LABEL,
  JOB_EXPERIENCE_LEVELS,
  WORK_ARRANGEMENT_LABEL,
} from "@/config/opportunity";
import { isHiringType } from "@/types/opportunity";
import { formatDate } from "@/lib/utils";
import { closesText, monthsText, openingsText } from "@/lib/opportunity-display";
import { reviewLink } from "@/lib/employer-job-groups";
import { OpportunityTypeBadge } from "@/components/employer/jobs/OpportunityTypeBadge";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { useEmployerJob } from "@/hooks/use-jobs";
import { EmployerJobActions } from "@/components/employer/jobs/EmployerJobActions";
import { OpportunityStatusBadge } from "@/components/freelancer/opportunities/StatusBadges";
import { Button } from "@/components/ui";
import { budgetText } from "@/components/freelancer/opportunities/OpportunityCard";

function DetailRow({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 py-2.5 last:border-0">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-neutral-800">{children ?? "—"}</dd>
    </div>
  );
}

export default function EmployerJobDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = String(params.id);
  const jobQuery = useEmployerJob(jobId);

  const displayName = useMemo(
    () => OPPORTUNITY_STATUS_META[jobQuery.data?.status as keyof typeof OPPORTUNITY_STATUS_META]?.label,
    [jobQuery.data?.status]
  );

  if (jobQuery.isPending) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-neutral-200" />
        ))}
      </div>
    );
  }

  if (jobQuery.isError) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 text-error-600 ring-1 ring-error-100">
          <ShieldAlert className="h-7 w-7" aria-hidden />
        </div>
        <h2 className="mt-4 text-lg font-bold text-neutral-900">
          {(jobQuery.error as { code?: string }).code === "NOT_FOUND"
            ? "We couldn't find that job."
            : "We couldn't load this job."}
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-neutral-500">
          {(jobQuery.error as { code?: string }).code === "NOT_FOUND"
            ? "It may have been removed, or you don't have access to it."
            : getFriendlyErrorMessage(jobQuery.error)}
        </p>
        <Button variant="outline" className="mt-5" onClick={() => router.push("/employer/jobs")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back to my jobs
        </Button>
      </div>
    );
  }

  const o = jobQuery.data!;
  const campus = campusNameFor(o.location.campusId);
  const isListed = o.status === "open";
  const hiring = isHiringType(o.opportunityType);
  const closes = o.status === "open" ? closesText(o.deadline) : null;
  const review = o.status === "draft" ? null : reviewLink(o);
  const experience = JOB_EXPERIENCE_LEVELS.find((l) => l.value === o.experienceLevel)?.label ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/employer/jobs"
            className="inline-flex items-center gap-1 rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
          <span className="text-xs font-medium uppercase tracking-wider text-primary-600">
            {categoryLabelFor(o)}
          </span>
          <OpportunityTypeBadge type={o.opportunityType} />
        </div>
        <OpportunityStatusBadge status={o.status} />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h1 className="text-xl font-bold text-neutral-900">{o.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {o.employer.name} · {o.employer.descriptor}
        </p>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-600">
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-neutral-400" aria-hidden /> {budgetText(o)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-neutral-400" aria-hidden /> {WORK_ARRANGEMENT_LABEL[o.workArrangement]}
          </span>
          {o.location.city && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-neutral-400" aria-hidden />
              {o.location.city}
              {campus ? ` · ${campus}` : ""}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-neutral-400" aria-hidden />{" "}
            {hiring
              ? o.hiring.durationMonths !== undefined
                ? monthsText(o.hiring.durationMonths)
                : "Length not set"
              : DURATION_LABEL[o.duration]}
          </span>
          {closes && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-neutral-400" aria-hidden />
              {closes}
            </span>
          )}
        </div>

        {review && (
          <Link
            href={review.enabled ? review.href : "#"}
            aria-disabled={!review.enabled}
            onClick={(ev) => !review.enabled && ev.preventDefault()}
            className={`mt-5 flex items-center gap-3 rounded-lg border p-4 ${review.enabled ? "border-primary-200 bg-primary-50 hover:bg-primary-100" : "border-neutral-200 bg-neutral-50"}`}
          >
            <Users className="h-5 w-5 text-primary-700" aria-hidden />
            <span>
              <span className="block text-sm font-semibold text-neutral-900">{review.label}</span>
              <span className="block text-xs text-neutral-500">
                {hiring ? "People who applied, with their CV and answers." : review.enabled ? "Open them to compare prices and reply." : "Proposals show up here with their price."}
              </span>
            </span>
          </Link>
        )}

        {o.summary && <p className="mt-4 text-sm leading-relaxed text-neutral-700">{o.summary}</p>}

        <div className="mt-5">
          {experience && <p className="text-sm font-medium text-neutral-700">Experience: {experience}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {o.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      <EmployerJobActions job={o} onPage onDiscarded={() => router.replace("/employer/jobs")} />

      {(o.description?.trim() || o.requirements?.trim()) && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-900">About this job</h2>
          <div className="mt-3 space-y-4">
            {o.description?.trim() && (
              <div>
                <h3 className="text-sm font-medium text-neutral-800">Description</h3>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">{o.description}</p>
              </div>
            )}
            {o.requirements?.trim() && (
              <div>
                <h3 className="text-sm font-medium text-neutral-800">Requirements</h3>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">{o.requirements}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {o.screeningQuestions.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-900">Screening questions</h2>
          <ul className="mt-3 space-y-2">
            {o.screeningQuestions.map((q, idx) => (
              <li key={q.id} className="text-sm text-neutral-700">
                <span className="font-medium">{idx + 1}. {q.question}</span>
                {q.optional && <span className="ml-1 text-xs text-neutral-400">(optional)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-neutral-900">Details</h2>
        <dl className="mt-2">
          <DetailRow label="Status">{displayName}</DetailRow>
          <DetailRow label="Type">{OPPORTUNITY_TYPE_META[o.opportunityType].label}</DetailRow>
          {hiring ? (
            <>
              <DetailRow label="Pay">{budgetText(o)}</DetailRow>
              {o.hiring.startDate && <DetailRow label="Start date">{formatDate(o.hiring.startDate)}</DetailRow>}
              {o.hiring.durationMonths !== undefined && <DetailRow label="Length">{monthsText(o.hiring.durationMonths)}</DetailRow>}
              <DetailRow label="Openings">{openingsText(o.hiring.openings)}</DetailRow>
              {o.hiring.eligibility && <DetailRow label="Who can apply">{o.hiring.eligibility}</DetailRow>}
              <DetailRow label="Certificate">
                {o.hiring.offersCertificate ? "Offered" : "Not offered"}
              </DetailRow>
              {o.expiresAt && (
                <DetailRow label="Live until">{formatDate(o.expiresAt)}</DetailRow>
              )}
            </>
          ) : (
            <>
              <DetailRow label="Budget">{budgetText(o)}</DetailRow>
              <DetailRow label="Duration">{DURATION_LABEL[o.duration]}</DetailRow>
            </>
          )}
          {experience && <DetailRow label="Experience">{experience}</DetailRow>}
          {closesText(o.deadline) && <DetailRow label="Deadline">{`${formatDate(o.deadline)} · ${closesText(o.deadline)}`}</DetailRow>}
          <DetailRow label="Posted">{formatDate(o.postedAt)}</DetailRow>
        </dl>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
        <div>
          <p className="font-medium text-neutral-800">Public listing preview</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {o.status === "open"
              ? "This job is live. You can copy its marketplace link to share it."
              : o.status === "pending_review"
              ? "This job is waiting for moderation. You can't edit it or share it yet."
              : "Remember to publish your draft to submit it for moderation."}
          </p>
          {isListed ? (
            <Link
              href={`/jobs/${o.id}`}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5 rotate-180" aria-hidden /> See it the way candidates do
            </Link>
          ) : (
            <Link
              href={`/employer/jobs/${o.id}/edit`}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline"
            >
              <PenLine className="h-3.5 w-3.5" aria-hidden /> Edit this {o.status === "draft" ? "draft" : "job"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}