"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getEngagementById } from "@/services/jobs";
import { engagementToContract } from "@/services/contract";
import { freelancerDashboardKeys } from "@/lib/query-keys";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { contractPriceLabel, describeCurrentMilestone } from "@/lib/engagement-milestones";
import { isMyMove, nextStep } from "@/lib/contract-groups";
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
import { openDirectConversation } from "@/services/messages-api";

/**
 * One contract, the freelancer's side: where it stands and what to do next, the payment parts, the money, any
 * revisions, the timesheet for hourly work, and the actions. These used to sit inside every card on the list. The
 * same page as the mobile app's contract/[id].
 */
export default function FreelancerContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["freelancer", "contracts", "one", id],
    queryFn: async () => {
      const { engagement, error } = await getEngagementById(id);
      if (error || !engagement) throw error ?? new Error("Not found");
      return engagement;
    },
    retry: false,
  });

  function changed() {
    void q.refetch();
    void queryClient.invalidateQueries({ queryKey: freelancerDashboardKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["freelancer", "contracts"] });
  }

  const back = (
    <Link href="/freelancer/contracts" className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900">
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
  const step = nextStep(e);
  const client = e.employer.fullName || e.employer.username;

  return (
    <div className="space-y-5">
      {back}
      <header className="rounded-xl border border-kampmax-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-kampmax-text">{e.job.title}</h1>
            <p className="mt-0.5 text-sm text-kampmax-text-secondary">Client · {client} · {contractPriceLabel(e)}</p>
          </div>
          <ContractStatusBadge status={contract.status} />
        </div>
        {step && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${isMyMove(e) ? "bg-warning-50 font-semibold text-warning-700" : "bg-kampmax-bg text-kampmax-text-secondary"}`}>
            {step}
          </p>
        )}
      </header>

      <ClientCard userId={e.employer.userId} name={client} avatar={e.employer.avatar} open={e.status !== "CANCELLED"} />

      <section className="space-y-4 rounded-xl border border-kampmax-border bg-white p-5">
        <EngagementNotices engagement={e} role="freelancer" />
        <EngagementMilestones milestones={e.milestones} showFee />
        <ContractFeeNote engagement={e} />
        <ContractMoneyPanel engagement={e} party="freelancer" />
        <EngagementRevisions revisions={e.revisions} status={e.status} role="freelancer" />
        {e.paymentType === "HOURLY" && <HourlyTimesheet engagementId={e.id} role="freelancer" status={e.status} onChanged={changed} />}
        <EngagementActions
          engagementId={e.id}
          status={e.status}
          role="freelancer"
          revisions={e.revisions}
          milestone={describeCurrentMilestone(e)}
          onChanged={changed}
        />
      </section>
    </div>
  );
}

/** The client, with a way to message them, and to offer more work in the chat (as on mobile's contract PersonCard). */
function ClientCard({ userId, name, avatar, open }: { userId: string; name: string; avatar: string | null; open: boolean }) {
  const router = useRouter();
  const [opening, setOpening] = useState<"chat" | "offer" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function go(then: "chat" | "offer") {
    setOpening(then);
    setProblem(null);
    try {
      const id = await openDirectConversation(userId);
      router.push(then === "offer" ? `/chat/${id}?offer=1` : `/chat/${id}`);
    } catch (e) {
      setProblem(getFriendlyErrorMessage(e));
      setOpening(null);
    }
  }

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-xl border border-kampmax-border bg-white p-4">
      <Avatar src={avatar ?? undefined} name={name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-kampmax-text">{name}</span>
        <span className="block text-xs text-kampmax-text-secondary">Your client</span>
      </span>
      <button type="button" disabled={opening !== null} onClick={() => void go("chat")} className="rounded-md border border-kampmax-border px-3 py-1.5 text-sm font-semibold disabled:opacity-50">
        {opening === "chat" ? "Opening…" : "Message"}
      </button>
      {open && (
        <button type="button" disabled={opening !== null} onClick={() => void go("offer")} className="text-sm font-semibold text-primary-700 underline disabled:opacity-50">
          {opening === "offer" ? "Opening…" : "Send an offer for extra work"}
        </button>
      )}
      {problem && <p role="alert" className="w-full text-xs text-error-600">{problem}</p>}
    </section>
  );
}
