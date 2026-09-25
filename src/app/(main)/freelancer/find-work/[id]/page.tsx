"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
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
} from "lucide-react";
import type { JobEligibility, Opportunity } from "@/types/opportunity";
import { ELIGIBILITY_CODE, OPPORTUNITY_STATUS } from "@/types/opportunity";
import { getJobEligibilityApi } from "@/services/proposals";
import { listSavedJobIds, saveJob, unsaveJob } from "@/services/jobs";
import {
  getDiscoverableOpportunity,
  getJobByIdApi,
  isBackendId,
  getJobEligibility,
  saveJobForUser,
  unsaveJobForUser,
  isJobSavedForUser,
  recordOpportunityView,
  categoryLabelFor,
  campusNameFor,
} from "@/services/opportunity";
import {
  DURATION_LABEL,
  WORK_ARRANGEMENT_LABEL,
} from "@/config/opportunity";
import { formatNaira, formatDate } from "@/lib/utils";
import { OpportunityStatusBadge } from "@/components/freelancer/opportunities/StatusBadges";
import { Button } from "@/components/ui";
import { budgetText } from "@/components/freelancer/opportunities/OpportunityCard";

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = String(params.id);

  // Real jobs (UUID ids) come from the backend; legacy demo ids stay on the
  // local mock store, including its save/view/eligibility behaviour.
  const backend = isBackendId(jobId);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(() =>
    backend ? null : getDiscoverableOpportunity(jobId)
  );
  const [loading, setLoading] = useState(backend);
  const [remoteEligibility, setRemoteEligibility] = useState<JobEligibility | null>(null);
  const [saved, setSaved] = useState<boolean>(() => (backend ? false : isJobSavedForUser(jobId)));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!backend) {
      // Record a view exactly once per mount (backend-authoritative counter).
      recordOpportunityView(jobId);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { job } = await getJobByIdApi(jobId);
      if (cancelled) return;
      // Only published jobs are discoverable.
      const visible = job && job.status === OPPORTUNITY_STATUS.OPEN ? job : null;
      setOpportunity(visible);
      setLoading(false);
      if (visible) {
        const [result, savedIds] = await Promise.all([
          getJobEligibilityApi(visible),
          listSavedJobIds(),
        ]);
        if (cancelled) return;
        setRemoteEligibility(result);
        setSaved(savedIds.ids.includes(visible.id));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backend, jobId]);

  const localEligibility = useMemo(
    () => (backend ? null : getJobEligibility(jobId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [backend, jobId, saved]
  );
  const eligibility: JobEligibility = (backend ? remoteEligibility : localEligibility) ?? {
    code: ELIGIBILITY_CODE.NOT_APPLICABLE,
    eligible: false,
    reasons: ["Checking your eligibility…"],
  };

  if (loading) {
    return <div className="pt-8 text-center text-sm text-neutral-500">Loading…</div>;
  }

  if (!opportunity) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 text-error-600 ring-1 ring-error-100">
          <ShieldAlert className="h-7 w-7" aria-hidden />
        </div>
        <h2 className="mt-4 text-lg font-bold text-neutral-900">
          This opportunity is no longer available.
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-neutral-500">
          It may have been closed, expired, or removed by the client.
        </p>
        <div className="mt-5">
          <Button variant="outline" onClick={() => router.push("/freelancer/find-work")}>
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back to Find Work
          </Button>
        </div>
      </div>
    );
  }

  const o = opportunity;
  const category = categoryLabelFor(o);
  const campus = campusNameFor(o.location.campusId);
  const canApply = eligibility.eligible;
  const alreadyApplied = eligibility.code === ELIGIBILITY_CODE.ALREADY_APPLIED;

  async function toggleSave() {
    if (backend) {
      const { error: saveError } = saved ? await unsaveJob(o.id) : await saveJob(o.id);
      if (saveError) setError(saveError.message ?? "Couldn't update your saved jobs.");
      else {
        setError(null);
        setSaved(!saved);
      }
      return;
    }
    if (saved) {
      const res = unsaveJobForUser(o.id);
      if (!res.ok) setError(res.message);
      else setSaved(false);
    } else {
      const res = saveJobForUser(o.id);
      if (!res.ok) setError(res.message);
      else setSaved(true);
    }
  }

  function goToCreateProposal() {
    router.push(`/freelancer/proposals/create?jobId=${encodeURIComponent(o.id)}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <button
          type="button"
          onClick={() => router.push("/freelancer/find-work")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Find Work
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-error-100 bg-error-50 p-3 text-sm text-error-700">
          {error}
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
              {[o.employer.name, o.employer.descriptor].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <OpportunityStatusBadge status={o.status} />
            <Button variant="outline" size="sm" onClick={() => void toggleSave()} aria-pressed={saved}>
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
          {!backend && (
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-neutral-400" aria-hidden /> {o.viewCount} views
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4 text-neutral-400" aria-hidden /> {o.proposalCount} proposals
          </span>
          {o.deadline && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-neutral-400" aria-hidden />
              Closing {formatDate(o.deadline)}
            </span>
          )}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-neutral-700">{o.summary}</p>

        <div className="mt-5">
          <p className="text-sm font-medium capitalize text-neutral-700">
            Experience: {o.experienceLevel}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {o.skills.map((skill) => (
              <span key={skill} className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Apply panel */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              {alreadyApplied ? "You've already applied" : "Ready to apply?"}
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              {alreadyApplied
                ? "Your proposal is with the client. Track it under My Proposals."
                : eligibility.reasons.join(" ")}
            </p>
          </div>
          <Button onClick={goToCreateProposal} disabled={!canApply} className="sm:shrink-0">
            <Send className="mr-1.5 h-4 w-4" aria-hidden />
            {alreadyApplied ? "View my proposal" : "Apply now"}
          </Button>
        </div>
        {!alreadyApplied && eligibility.code !== ELIGIBILITY_CODE.ELIGIBLE && (
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
          {o.requirements && (
            <div>
              <h3 className="text-sm font-medium text-neutral-800">Requirements</h3>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                {o.requirements}
              </p>
            </div>
          )}
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

      {o.attachments.length > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-900">Documents</h2>
          <ul className="mt-3 space-y-1.5">
            {o.attachments.map((a) => (
              <li key={a.id} className="text-sm text-neutral-700">
                {a.filename}
                <span className="ml-2 text-xs text-neutral-400">
                  {(a.sizeBytes / 1024 / 1024).toFixed(2)}MB
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-neutral-900">About the client</h2>
        <div className="mt-2">
          <p className="text-sm font-medium text-neutral-800">{o.employer.name}</p>
          <p className="text-sm text-neutral-500">
            {[o.employer.descriptor, o.employer.location].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {o.employer.verified ? "Verified client account" : "Client account"}
          </p>
        </div>
      </section>
    </div>
  );
}