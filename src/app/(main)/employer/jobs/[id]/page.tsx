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
  Eye,
  EyeOff,
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
import { OPPORTUNITY_STATUS_META, DURATION_LABEL, WORK_ARRANGEMENT_LABEL } from "@/config/opportunity";
import { formatNaira, formatDate } from "@/lib/utils";
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
            <Clock className="h-4 w-4 text-neutral-400" aria-hidden /> {DURATION_LABEL[o.duration]}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-neutral-400" aria-hidden />
            Closing {formatDate(o.deadline)}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-neutral-400" aria-hidden />
            {o.viewCount} views
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4 text-neutral-400" aria-hidden />
            {o.proposalCount} proposals
          </span>
          <span className="inline-flex items-center gap-1.5">
            {isListed ? (
              <Eye className="h-4 w-4 text-neutral-400" aria-hidden />
            ) : (
              <EyeOff className="h-4 w-4 text-neutral-400" aria-hidden />
            )}
            {isListed
              ? "Listed on the marketplace"
              : "Not visible on the marketplace"}
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-neutral-700">{o.summary}</p>

        <div className="mt-5">
          <p className="text-sm font-medium capitalize text-neutral-700">
            Experience: {o.experienceLevel.replace(/_/g, " ")}
          </p>
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

      <EmployerJobActions job={o} />

      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-neutral-900">About this job</h2>
        <div className="mt-3 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-neutral-800">Description</h3>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
              {o.description}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-800">Requirements</h3>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
              {o.requirements}
            </p>
          </div>
        </div>
      </div>

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
          <DetailRow label="Budget type">{o.budget.type}</DetailRow>
          <DetailRow label="Budget range">
            {o.budget.min !== undefined || o.budget.max !== undefined
              ? `${o.budget.min !== undefined ? formatNaira(o.budget.min) : "0"} – ${
                  o.budget.max !== undefined ? formatNaira(o.budget.max) : "Open"
                }`
              : "Negotiable"}
          </DetailRow>
          <DetailRow label="Duration">{DURATION_LABEL[o.duration]}</DetailRow>
          <DetailRow label="Experience level">{o.experienceLevel.replace(/_/g, " ")}</DetailRow>
          <DetailRow label="Deadline">{formatDate(o.deadline)}</DetailRow>
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
              <ArrowLeft className="h-3.5 w-3.5 rotate-180" aria-hidden /> View on marketplace
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