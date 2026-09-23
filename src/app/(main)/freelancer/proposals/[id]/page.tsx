"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldAlert, FileText, Paperclip } from "lucide-react";
import {
  getProposal,
  getOpportunity,
  getJobByIdApi,
  isBackendId,
  withdrawProposal,
  categoryLabelFor,
} from "@/services/opportunity";
import {
  discardProposalDraftApi,
  getProposalByIdApi,
  withdrawProposalApi,
} from "@/services/proposals";
import type { Opportunity, Proposal } from "@/types/opportunity";
import { PROPOSAL_STATUS } from "@/types/opportunity";
import { PROPOSAL_STATUS_META } from "@/config/opportunity";
import { formatNaira, formatDate } from "@/lib/utils";
import { ProposalStatusBadge } from "@/components/freelancer/opportunities/StatusBadges";
import { ProposalTimeline } from "@/components/freelancer/proposals";
import { ServiceConfirmDialog } from "@/components/freelancer/services/ServiceConfirmDialog";
import { Button } from "@/components/ui";

export default function ProposalDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const proposalId = String(params.id);

  const backend = isBackendId(proposalId);
  const [proposal, setProposal] = useState<Proposal | null>(() =>
    backend ? null : getProposal(proposalId)
  );
  const [remoteJob, setRemoteJob] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(backend);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const job = useMemo(
    () => (proposal ? getOpportunity(proposal.opportunityId) ?? remoteJob : null),
    [proposal, remoteJob]
  );

  const canWithdraw =
    !!proposal &&
    (proposal.status === PROPOSAL_STATUS.SUBMITTED ||
      proposal.status === PROPOSAL_STATUS.UNDER_REVIEW ||
      proposal.status === PROPOSAL_STATUS.SHORTLISTED);

  useEffect(() => {
    if (!backend) return;
    let cancelled = false;
    void (async () => {
      const { proposal: found } = await getProposalByIdApi(proposalId);
      if (cancelled) return;
      setProposal(found);
      if (found) {
        const { job: fetched } = await getJobByIdApi(found.opportunityId);
        if (!cancelled) setRemoteJob(fetched);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [backend, proposalId]);

  useEffect(() => {
    if (!loading && !proposal) {
      setError("This proposal could not be found or you don't have access to it.");
    }
  }, [loading, proposal]);

  async function runWithdraw() {
    if (busy) return;
    setBusy(true);
    setError(null);
    if (backend) {
      const res = await withdrawProposalApi(proposalId);
      setBusy(false);
      if (res.proposal) {
        setShowWithdraw(false);
        setProposal(res.proposal);
      } else {
        setError(res.error?.message ?? "We couldn't withdraw your proposal.");
      }
      return;
    }
    const res = withdrawProposal(proposalId);
    setBusy(false);
    if (res.ok && res.proposal) {
      setShowWithdraw(false);
      setProposal(res.proposal);
    } else {
      setError(res.message);
    }
  }

  async function discardDraft() {
    if (busy || !window.confirm("Discard this draft? This can't be undone.")) return;
    setBusy(true);
    setError(null);
    const { error: discardError } = await discardProposalDraftApi(proposalId);
    setBusy(false);
    if (discardError) {
      setError(discardError.message ?? "We couldn't discard your draft.");
      return;
    }
    router.push("/freelancer/proposals");
  }

  if (loading) {
    return <div className="pt-8 text-center text-sm text-neutral-500">Loading…</div>;
  }

  if (!proposal) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 text-error-600 ring-1 ring-error-100">
          <ShieldAlert className="h-7 w-7" aria-hidden />
        </div>
        <h2 className="mt-4 text-lg font-bold text-neutral-900">Proposal not found</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-neutral-500">
          This proposal may have been removed, or you no longer have access to it.
        </p>
        <div className="mt-5">
          <Button variant="outline" onClick={() => router.push("/freelancer/proposals")}>
            Back to My Proposals
          </Button>
        </div>
      </div>
    );
  }

  const p = proposal;
  const statusMeta = PROPOSAL_STATUS_META[p.status];

  return (
    <div className="space-y-5">
      <div>
        <button
          type="button"
          onClick={() => router.push("/freelancer/proposals")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to My Proposals
        </button>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">
              {job?.title ?? proposal.jobTitle ?? "Opportunity"}
            </h1>
            {job && (
              <p className="mt-0.5 text-sm text-neutral-500">
                {categoryLabelFor(job.categoryId)} · {job.employer.name}
              </p>
            )}
          </div>
          <ProposalStatusBadge status={p.status} />
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-error-100 bg-error-50 p-3 text-sm text-error-700">
          {error}
        </div>
      )}

      {p.status !== PROPOSAL_STATUS.WITHDRAWN && p.status !== PROPOSAL_STATUS.ACCEPTED && (
        <div className="rounded-xl border border-info-100 bg-info-50 p-4 text-sm text-info-700">
          {statusMeta.hint}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <FileText className="h-4 w-4 text-primary-600" aria-hidden /> Cover letter
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
              {p.coverLetter}
            </p>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Proposal details</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-neutral-500">Proposed amount</dt>
                <dd className="mt-0.5 font-semibold text-neutral-900">
                  {p.proposedAmount !== undefined && p.proposedAmount > 0
                    ? formatNaira(p.proposedAmount)
                    : "Not specified"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Delivery estimate</dt>
                <dd className="mt-0.5 font-semibold text-neutral-900">
                  {p.delivery.value > 0 ? `${p.delivery.value} ${p.delivery.unit}` : "Not specified"}
                </dd>
              </div>
              {p.submittedAt && (
                <div>
                  <dt className="text-xs text-neutral-500">Submitted</dt>
                  <dd className="mt-0.5 text-neutral-800">{formatDate(p.submittedAt)}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-neutral-500">Last updated</dt>
                <dd className="mt-0.5 text-neutral-800">{formatDate(p.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          {p.screeningAnswers.length > 0 && (
            <section className="rounded-xl border border-neutral-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-neutral-900">Client questions</h2>
              <div className="mt-3 space-y-3">
                {p.screeningAnswers.map((a) => {
                  const question = job?.screeningQuestions.find((q) => q.id === a.questionId);
                  return (
                    <div key={a.questionId}>
                      <p className="text-sm font-medium text-neutral-800">
                        {question?.question ?? "Screening question"}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">{a.answer}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {p.attachments.length > 0 && (
            <section className="rounded-xl border border-neutral-200 bg-white p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <Paperclip className="h-4 w-4 text-primary-600" aria-hidden /> Attachments
              </h2>
              <ul className="mt-3 space-y-1.5">
                {p.attachments.map((a) => (
                  <li key={a.id} className="text-sm text-neutral-700">
                    • {a.filename}
                    <span className="ml-2 text-xs text-neutral-400">
                      {(a.sizeBytes / 1024 / 1024).toFixed(2)}MB
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Actions */}
          {(canWithdraw || p.status === PROPOSAL_STATUS.DRAFT) && (
            <div className="flex flex-wrap gap-2">
              {canWithdraw && (
                <Button variant="destructive" size="sm" onClick={() => setShowWithdraw(true)}>
                  Withdraw proposal
                </Button>
              )}
              {/* Draft proposals can still be completed elsewhere; direct edit link */}
              {p.status === PROPOSAL_STATUS.DRAFT && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(
                        `/freelancer/proposals/create?jobId=${encodeURIComponent(p.opportunityId)}`
                      )
                    }
                  >
                    Continue editing
                  </Button>
                  {backend && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busy}
                      onClick={() => void discardDraft()}
                    >
                      Discard draft
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Side column */}
        <div className="space-y-5">
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-neutral-900">Timeline</h2>
            <div className="mt-3">
              <ProposalTimeline proposal={p} />
            </div>
          </section>

          {job && (
            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-neutral-900">Job</h2>
              <p className="mt-1 text-sm font-medium text-neutral-800">{job.title}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{job.employer.name}</p>
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/freelancer/find-work/${job.id}`)}
                >
                  View job
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>

      <ServiceConfirmDialog
        open={showWithdraw}
        title="Withdraw this proposal?"
        description="Withdrawing removes your proposal from active consideration by this client. This can be done before the client has accepted your application."
        confirmLabel={busy ? "Withdrawing…" : "Withdraw proposal"}
        tone="destructive"
        isBusy={busy}
        onConfirm={runWithdraw}
        onCancel={() => setShowWithdraw(false)}
      />
    </div>
  );
}