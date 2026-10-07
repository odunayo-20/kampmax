"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ShieldAlert, ArrowLeft } from "lucide-react";
import {
  getJobByIdApi,
  isBackendId,
} from "@/services/opportunity";
import {
  getJobEligibilityApi,
  getMyDraftForJobApi,
  saveProposalDraftApi,
  submitProposalApi,
} from "@/services/proposals";
import { ELIGIBILITY_CODE, OPPORTUNITY_STATUS } from "@/types/opportunity";
import type { JobEligibility, Opportunity, Proposal, ProposalInput } from "@/types/opportunity";
import {
  ProposalForm,
  ProposalReview,
  emptyProposalFormValues,
} from "@/components/freelancer/proposals";
import type { ProposalFormValues } from "@/components/freelancer/proposals";
import { Button } from "@/components/ui";

type Step = "form" | "review" | "success";

function CreateProposalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  const backend = !!jobId && isBackendId(jobId);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(backend);
  const [remoteEligibility, setRemoteEligibility] = useState<JobEligibility | null>(null);

  const [step, setStep] = useState<Step>("form");
  const [values, setValues] = useState<ProposalFormValues>(emptyProposalFormValues());
  const [submittedProposal, setSubmittedProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!jobId || !backend) return;
    let cancelled = false;
    void (async () => {
      const { job } = await getJobByIdApi(jobId);
      if (cancelled) return;
      const visible = job && job.status === OPPORTUNITY_STATUS.OPEN ? job : null;
      setOpportunity(visible);
      setLoading(false);
      if (visible) {
        const [result, { draft }] = await Promise.all([
          getJobEligibilityApi(visible),
          getMyDraftForJobApi(visible.id),
        ]);
        if (cancelled) return;
        setRemoteEligibility(result);
        // Pick up where the freelancer left off.
        if (draft) {
          setValues({
            coverLetter: draft.coverLetter,
            proposedAmount:
              draft.proposedAmount && draft.proposedAmount > 0 ? String(draft.proposedAmount) : "",
            deliveryValue: draft.delivery.value > 0 ? String(draft.delivery.value) : "",
            deliveryUnit: draft.delivery.unit,
            screeningAnswers: Object.fromEntries(
              draft.screeningAnswers.map((a) => [a.questionId, a.answer])
            ),
            attachments: draft.attachments,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, backend]);

  const eligibility = remoteEligibility;

  if (!jobId || (!loading && !opportunity)) {
    return <MissingJob />;
  }

  if (loading || !opportunity) {
    return <div className="pt-8 text-center text-sm text-neutral-500">Loading…</div>;
  }

  const canApply = eligibility?.eligible ?? false;
  const alreadyApplied = eligibility?.code === ELIGIBILITY_CODE.ALREADY_APPLIED;

  function buildInput(v: ProposalFormValues): ProposalInput {
    const amount = Number(v.proposedAmount);
    const delivery = Number(v.deliveryValue);
    return {
      opportunityId: opportunity!.id,
      coverLetter: v.coverLetter.trim(),
      proposedAmount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
      delivery: {
        value: Number.isFinite(delivery) && delivery > 0 ? delivery : 0,
        unit: v.deliveryUnit,
      },
      screeningAnswers: Object.entries(v.screeningAnswers)
        .filter(([, answer]) => answer.trim().length > 0)
        .map(([questionId, answer]) => ({ questionId, answer: answer.trim() })),
      attachments: v.attachments,
    };
  }

  async function handleSaveDraft() {
    setBusy(true);
    setError(null);
    const res = await saveProposalDraftApi(buildInput(values));
    setBusy(false);
    if (res.error || !res.proposal) {
      setError(res.error?.message ?? "We couldn't save your draft.");
      return;
    }
    router.push("/freelancer/proposals?status=draft");
  }

  async function handleSubmit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await submitProposalApi(buildInput(values));
    setBusy(false);
    if (res.error || !res.proposal) {
      setError(res.error?.message ?? "We couldn't submit your proposal.");
      return;
    }
    setSubmittedProposal(res.proposal);
    setStep("success");
  }

  if (step === "success" && submittedProposal) {
    return (
      <div className="mx-auto max-w-md pt-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-600">
          <CheckCircle2 className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-bold text-neutral-900">Proposal submitted!</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Your proposal for <span className="font-semibold text-neutral-800">{opportunity.title}</span>{" "}
          has been sent to {opportunity.employer.name}. You&apos;ll be able to track it under My Proposals.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => router.push("/freelancer/proposals")}>View my proposals</Button>
          <Button variant="outline" onClick={() => router.push("/freelancer/find-work")}>
            Find more work
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <button
          type="button"
          onClick={() => router.push(`/freelancer/find-work/${opportunity.id}`)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to job
        </button>
        <h1 className="mt-2 text-xl font-bold text-neutral-900">
          {step === "review" ? "Review your proposal" : "Apply to this job"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {opportunity.title} · {opportunity.employer.name}
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-error-100 bg-error-50 p-3 text-sm text-error-700">
          {error}
        </div>
      )}

      {!canApply && !alreadyApplied && (
        <div role="note" className="flex items-start gap-2 rounded-lg border border-warning-100 bg-warning-50 p-3 text-sm text-warning-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {eligibility?.code === ELIGIBILITY_CODE.PROFILE_INCOMPLETE &&
              "Complete your freelancer profile before applying."}
            {eligibility?.code === ELIGIBILITY_CODE.SKILL_MISMATCH &&
              "You don't currently match all required skills for this opportunity."}
            {eligibility?.code === ELIGIBILITY_CODE.CLOSED &&
              "This opportunity is no longer accepting proposals."}
            {!eligibility && "This opportunity is no longer available."}
          </span>
        </div>
      )}

      {alreadyApplied && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center">
          <h2 className="text-sm font-semibold text-neutral-900">You've already applied</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Head to My Proposals to track or manage your existing application.
          </p>
          <div className="mt-4">
            <Button onClick={() => router.push("/freelancer/proposals")}>
              View my proposals
            </Button>
          </div>
        </div>
      )}

      {step === "form" && !alreadyApplied && (
        <ProposalForm
          opportunity={opportunity}
          values={values}
          onChange={setValues}
          onSubmit={() => {
            // Gate against applying when not eligible.
            if (!canApply) return;
            setError(null);
            setStep("review");
          }}
          requireAmount={backend}
          onSaveDraft={canApply ? () => void handleSaveDraft() : undefined}
          submitting={busy}
        />
      )}

      {step === "review" && !alreadyApplied && (
        <ProposalReview
          opportunity={opportunity}
          values={values}
          onEdit={() => setStep("form")}
          onSubmit={handleSubmit}
          submitting={busy}
        />
      )}
    </div>
  );
}

function MissingJob() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-md pt-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-50 text-error-600">
        <ShieldAlert className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="mt-4 text-lg font-bold text-neutral-900">Opportunity unavailable</h1>
      <p className="mt-1 text-sm text-neutral-500">
        We couldn&apos;t find that job, or it&apos;s no longer accepting proposals.
      </p>
      <div className="mt-5">
        <Button onClick={() => router.push("/freelancer/find-work")}>Browse opportunities</Button>
      </div>
    </div>
  );
}

export default function CreateProposalPage() {
  return (
    <Suspense fallback={<div className="pt-8 text-center text-sm text-neutral-500">Loading…</div>}>
      <CreateProposalContent />
    </Suspense>
  );
}