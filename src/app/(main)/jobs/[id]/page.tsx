"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  Eye,
  MapPin,
  Send,
  ShieldAlert,
  Bookmark,
  BookmarkCheck,
  Users,
  Wallet,
  Settings2,
} from "lucide-react";
import { ELIGIBILITY_CODE, type JobEligibility } from "@/types/opportunity";
import { getJobEligibilityApi } from "@/services/proposals";
import {
  categoryLabelFor,
  campusNameFor,
} from "@/services/opportunity";
import { DURATION_LABEL, WORK_ARRANGEMENT_LABEL } from "@/config/opportunity";
import { formatDate } from "@/lib/utils";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { useAuth } from "@/lib/auth-context";
import { useJob, useSavedJobIds, useSaveJob, useUnsaveJob } from "@/hooks/use-jobs";
import { OpportunityStatusBadge } from "@/components/freelancer/opportunities/StatusBadges";
import { Button } from "@/components/ui";
import { budgetText } from "@/components/freelancer/opportunities/OpportunityCard";

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = String(params.id);
  const { user } = useAuth();

  const jobQuery = useJob(jobId);
  const savedIdsQuery = useSavedJobIds();
  const saveMutation = useSaveJob();
  const unsaveMutation = useUnsaveJob();

  const saved = useMemo(
    () => (savedIdsQuery.data ?? []).includes(jobId),
    [savedIdsQuery.data, jobId]
  );
  const saveError =
    saveMutation.isError ? getFriendlyErrorMessage(saveMutation.error)
    : unsaveMutation.isError ? getFriendlyErrorMessage(unsaveMutation.error)
    : null;

  const job = jobQuery.data;
  const eligibilityQuery = useQuery({
    queryKey: ["jobs", "eligibility", jobId, user?.id],
    enabled: !!job,
    queryFn: () => getJobEligibilityApi(job!),
  });
  const eligibility: JobEligibility = eligibilityQuery.data ?? {
    code: ELIGIBILITY_CODE.NOT_APPLICABLE,
    eligible: false,
    reasons: ["Checking your eligibility…"],
  };

  if (jobQuery.isPending) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <div className="h-8 w-24 animate-pulse rounded bg-neutral-200" />
        <div className="mt-6 space-y-4">
          <div className="h-40 animate-pulse rounded-xl border border-neutral-200" />
          <div className="h-24 animate-pulse rounded-xl border border-neutral-200" />
          <div className="h-32 animate-pulse rounded-xl border border-neutral-200" />
        </div>
      </div>
    );
  }

  if (jobQuery.isError && (jobQuery.error as { code?: string }).code === "NOT_FOUND") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 text-error-600 ring-1 ring-error-100">
            <ShieldAlert className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-bold text-neutral-900">
            This job is no longer available.
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-neutral-500">
            It may still be a draft, awaiting moderation, or has been closed,
            expired or removed.
          </p>
          <div className="mt-5">
            <Button variant="outline" onClick={() => router.push("/jobs")}>
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back to Jobs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (jobQuery.isError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 text-error-600 ring-1 ring-error-100">
            <ShieldAlert className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-bold text-neutral-900">
            We couldn't load this job.
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500">
            {getFriendlyErrorMessage(jobQuery.error)}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" onClick={() => jobQuery.refetch()}>
              Try again
            </Button>
            <Button variant="outline" onClick={() => router.push("/jobs")}>
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back to Jobs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const o = jobQuery.data!;
  const category = categoryLabelFor(o);
  const campus = campusNameFor(o.location.campusId);
  const isOwner = o.employerUserId === user?.id;
  const canApply = eligibility.eligible;
  const alreadyApplied = eligibility.code === ELIGIBILITY_CODE.ALREADY_APPLIED;

  function toggleSave() {
    if (saved) unsaveMutation.mutate(jobId);
    else saveMutation.mutate(jobId);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => router.push("/jobs")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Jobs
        </button>

        {saveError && (
          <div role="alert" className="rounded-lg border border-error-100 bg-error-50 p-3 text-sm text-error-700">
            {saveError}
          </div>
        )}

        <section className="rounded-xl border border-neutral-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-primary-600">
                {category}
              </span>
              <h1 className="mt-1 text-xl font-bold text-neutral-900">{o.title}</h1>
              <p className="mt-1 text-sm text-neutral-500">
                {o.employer.name} · {o.employer.descriptor}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <OpportunityStatusBadge status={o.status} />
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSave}
                disabled={saveMutation.isPending || unsaveMutation.isPending}
                aria-pressed={saved}
              >
                {saved ? (
                  <>
                    <BookmarkCheck className="mr-1.5 h-4 w-4" aria-hidden /> Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="mr-1.5 h-4 w-4" aria-hidden /> Save
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-600">
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-neutral-400" aria-hidden /> {budgetText(o)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-neutral-400" aria-hidden />{" "}
              {WORK_ARRANGEMENT_LABEL[o.workArrangement]}
            </span>
            {o.location.city && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-neutral-400" aria-hidden /> {o.location.city}
                {campus ? ` · ${campus}` : ""}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-neutral-400" aria-hidden /> {DURATION_LABEL[o.duration]}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-neutral-400" aria-hidden /> {o.viewCount} views
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-neutral-400" aria-hidden /> {o.proposalCount} proposals
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-neutral-400" aria-hidden />
              Closing {formatDate(o.deadline)}
            </span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-neutral-700">{o.summary}</p>

          <div className="mt-5">
            <p className="text-sm font-medium capitalize text-neutral-700">
              Experience: {o.experienceLevel}
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
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                {isOwner
                  ? "This is your posting"
                  : alreadyApplied
                  ? "You've already applied"
                  : "Ready to apply?"}
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                {isOwner
                  ? "Manage this job's status and visibility from your employer dashboard."
                  : alreadyApplied
                  ? "Your proposal is with the client. Track it under My Proposals."
                  : eligibility.reasons.join(" ")}
              </p>
            </div>
            {isOwner ? (
              <Link href={`/employer/jobs/${o.id}`} className="sm:shrink-0">
                <Button className="w-full sm:w-auto">
                  <Settings2 className="mr-1.5 h-4 w-4" aria-hidden /> Manage job
                </Button>
              </Link>
            ) : (
              <Button
                disabled={!canApply}
                className="sm:shrink-0"
                onClick={() =>
                  router.push(`/freelancer/proposals/create?jobId=${encodeURIComponent(o.id)}`)
                }
              >
                <Send className="mr-1.5 h-4 w-4" aria-hidden />
                {alreadyApplied ? "View my proposal" : "Apply now"}
              </Button>
            )}
          </div>
          {!isOwner && !alreadyApplied && eligibility.code !== ELIGIBILITY_CODE.ELIGIBLE && (
            <p className="mt-3 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
              {eligibility.code === ELIGIBILITY_CODE.PROFILE_INCOMPLETE && (
                <>Complete your freelancer profile to apply.</>
              )}
              {eligibility.code === ELIGIBILITY_CODE.SKILL_MISMATCH && (
                <>You don't currently match all required skills.</>
              )}
              {eligibility.code === ELIGIBILITY_CODE.VERIFICATION_REQUIRED && (
                <>Sign in as an approved freelancer to apply.</>
              )}
              {eligibility.code === ELIGIBILITY_CODE.CLOSED && (
                <>This opportunity is no longer accepting proposals.</>
              )}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-6">
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
        </section>

        {o.screeningQuestions.length > 0 && (
          <section className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Client questions</h2>
            <p className="mt-1 text-xs text-neutral-500">
              You&apos;ll be asked these when you apply.
            </p>
            <ul className="mt-3 space-y-2">
              {o.screeningQuestions.map((q, idx) => (
                <li key={q.id} className="text-sm text-neutral-700">
                  <span className="font-medium">{idx + 1}. {q.question}</span>
                  {q.optional && <span className="ml-1 text-xs text-neutral-400">(optional)</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
            <Building2 className="h-4 w-4 text-neutral-400" aria-hidden /> About the client
          </h2>
          <div className="mt-2">
            <p className="text-sm font-medium text-neutral-800">{o.employer.name}</p>
            <p className="text-sm text-neutral-500">
              {o.employer.descriptor} · {o.employer.location}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {o.employer.verified ? "Verified client account" : "Client account"}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}