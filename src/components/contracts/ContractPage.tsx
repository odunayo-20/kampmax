"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getEngagementById } from "@/services/jobs";
import { engagementToContract } from "@/services/contract";
import { dashboardKeys, freelancerDashboardKeys } from "@/lib/query-keys";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { contractPriceLabel, describeCurrentMilestone } from "@/lib/engagement-milestones";
import { isMyMove, nextStep, type Party } from "@/lib/contract-groups";
import { Skeleton } from "@/components/ui/Skeleton";
import { ContractStatusBadge } from "@/components/contracts/ContractStatusBadge";
import { EngagementActions } from "@/components/engagements/EngagementActions";
import { ContractFeeNote } from "@/components/engagements/ContractFeeNote";
import { EngagementMilestones } from "@/components/engagements/EngagementMilestones";
import { HourlyTimesheet } from "@/components/engagements/HourlyTimesheet";
import { EngagementNotices } from "@/components/engagements/EngagementNotices";
import { EngagementRevisions } from "@/components/engagements/EngagementRevisions";
import { ContractMoneyPanel } from "@/components/trust/ContractMoneyPanel";
import { Avatar } from "@/components/ui";
import { MessagePersonButton } from "@/components/messages/MessagePersonButton";

/**
 * One contract, for either side: where it stands and what to do next, the other person, the payment parts, the
 * money, any revisions, the timesheet for hourly work, and the actions. These used to sit inside every card on the
 * contract lists. The same page as the mobile app's contract/[id], which also serves both sides.
 */
export function ContractPage({ id, party }: { id: string; party: Party }) {
  const queryClient = useQueryClient();
  const employer = party === "employer";
  const q = useQuery({
    queryKey: ["contracts", "one", party, id],
    queryFn: async () => {
      const { engagement, error } = await getEngagementById(id);
      if (error || !engagement) throw error ?? new Error("Not found");
      return engagement;
    },
    retry: false,
  });

  function changed() {
    void q.refetch();
    if (employer) {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    } else {
      void queryClient.invalidateQueries({ queryKey: freelancerDashboardKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["freelancer", "contracts"] });
    }
  }

  const back = (
    <Link href={employer ? "/employer/contracts" : "/freelancer/contracts"} className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900">
      <ArrowLeft className="h-4 w-4" aria-hidden /> Back to my contracts
    </Link>
  );

  if (q.isPending) {
    return (
      <div className="space-y-4">
        {back}
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="space-y-4">
        {back}
        <div role="alert" className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <p className="font-semibold text-neutral-900">We couldn&apos;t open this contract.</p>
          <p className="mt-1 text-sm text-neutral-500">{getFriendlyErrorMessage(q.error)}</p>
          <button type="button" onClick={() => void q.refetch()} className="mt-3 text-sm font-semibold text-primary-700 underline">Try again</button>
        </div>
      </div>
    );
  }

  const e = q.data;
  const contract = engagementToContract(e);
  const step = nextStep(e, party);
  const other = employer ? e.freelancer : e.employer;
  const otherName = other.fullName || other.username;

  return (
    <div className="space-y-5">
      {back}
      <header className="rounded-xl border border-kampmax-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-kampmax-text">{e.job.title}</h1>
            <p className="mt-0.5 text-sm text-kampmax-text-secondary">{employer ? "Freelancer" : "Client"} · {otherName} · {contractPriceLabel(e)}</p>
          </div>
          <ContractStatusBadge status={contract.status} />
        </div>
        {step && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${isMyMove(e, party) ? "bg-warning-50 font-semibold text-warning-700" : "bg-kampmax-bg text-kampmax-text-secondary"}`}>
            {step}
          </p>
        )}
      </header>

      <PersonCard userId={other.userId} name={otherName} avatar={other.avatar} role={employer ? "Your freelancer" : "Your client"} canOffer={!employer && e.status !== "CANCELLED"} />

      <section className="space-y-4 rounded-xl border border-kampmax-border bg-white p-5">
        <EngagementNotices engagement={e} role={party} />
        <EngagementMilestones milestones={e.milestones} showFee={!employer} />
        {!employer && <ContractFeeNote engagement={e} />}
        <ContractMoneyPanel engagement={e} party={party} />
        <EngagementRevisions revisions={e.revisions} status={e.status} role={party} />
        {e.paymentType === "HOURLY" && <HourlyTimesheet engagementId={e.id} role={party} status={e.status} onChanged={changed} />}
        <EngagementActions
          engagementId={e.id}
          status={e.status}
          role={party}
          revisions={e.revisions}
          milestone={describeCurrentMilestone(e)}
          onChanged={changed}
        />
      </section>
    </div>
  );
}

/** The other person, with a way to message them; a freelancer can also offer more work in the chat (mobile's PersonCard). */
function PersonCard({ userId, name, avatar, role, canOffer }: { userId: string; name: string; avatar: string | null; role: string; canOffer: boolean }) {
  return (
    <section className="flex flex-wrap items-center gap-3 rounded-xl border border-kampmax-border bg-white p-4">
      <Avatar src={avatar ?? undefined} name={name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-kampmax-text">{name}</span>
        <span className="block text-xs text-kampmax-text-secondary">{role}</span>
      </span>
      <MessagePersonButton userId={userId} />
      {canOffer && <MessagePersonButton userId={userId} offer label="Send an offer for extra work" className="text-sm font-semibold text-primary-700 underline disabled:opacity-50" />}
    </section>
  );
}
