/**
 * Plain-language "where is my money" steps for the highest-anxiety moments:
 * an order in escrow and a freelance contract. Pure functions, no UI, so the
 * wording and the rules are easy to test. The words say what has happened,
 * what happens next, and when money moves, and only claim what the server
 * has actually recorded.
 */
import type { Order } from "@/types";
import type { Engagement } from "@/services/jobs";
import { formatDate, formatNaira } from "@/lib/utils";

export type MoneyStepState = "done" | "current" | "upcoming" | "blocked";

export interface MoneyStep {
  id: string;
  title: string;
  /** What this means for the person's money, in one or two plain sentences. */
  detail: string;
  state: MoneyStepState;
}

export interface MoneyTimelineModel {
  /** One sentence: where the money is right now. */
  headline: string;
  steps: MoneyStep[];
}

function mark(steps: Omit<MoneyStep, "state">[], currentIndex: number, blocked = false): MoneyStep[] {
  return steps.map((s, i) => ({
    ...s,
    state: i < currentIndex ? "done" : i === currentIndex ? (blocked ? "blocked" : "current") : "upcoming",
  }));
}

// ── Orders (the customer's view) ────────────────────────────────────────────

export function orderMoneyTimeline(order: Pick<Order, "status" | "total" | "dispute" | "settled">): MoneyTimelineModel {
  const total = formatNaira(order.total);

  if (order.status === "cancelled") {
    return {
      headline: "This order was cancelled.",
      steps: [
        {
          id: "cancelled",
          title: "Order cancelled",
          detail:
            "If you had already paid, the money goes back to your Kampmax wallet. If you don't see it, contact support and we will trace it.",
          state: "done",
        },
      ],
    };
  }

  const base: Omit<MoneyStep, "state">[] = [
    {
      id: "pay",
      title: "You pay",
      detail: `${total} is charged when you pay. Nothing is charged before that, and there are no extra fees on top.`,
    },
    {
      id: "held",
      title: "Kampmax holds your payment",
      detail: "The vendor can see the order is paid, but they are not paid yet. Your money is held safely.",
    },
    {
      id: "handover",
      title: "The vendor hands over your order",
      detail: "You get it by delivery or by showing your pickup code on campus.",
    },
    {
      id: "confirm",
      title: "You confirm you received it",
      detail: "This is when the vendor is paid. If something is wrong, report it before you confirm.",
    },
    {
      id: "paid",
      title: "The vendor is paid",
      detail: "The money moves from Kampmax to the vendor. After this, a problem goes through support.",
    },
  ];

  const index: Record<Order["status"], number> = {
    placed: 0,
    confirmed: 1,
    preparing: 1,
    ready: 2,
    out_for_delivery: 2,
    delivered: order.settled ? 5 : 3,
    cancelled: 0,
  };
  let current = index[order.status];

  // An open dispute freezes the last steps, whatever the delivery status says.
  if (order.dispute && !order.dispute.resolvedAt) {
    const steps = mark(base, Math.min(current, 3), true).map((s, i) => (i === 3 ? { ...s, state: "blocked" as const } : s));
    steps[3] = {
      ...steps[3],
      title: "Dispute open: payout on hold",
      detail:
        "The vendor will not be paid while Kampmax Trust & Safety reviews your report. If your claim is upheld, the refund goes to your wallet.",
    };
    return {
      headline: "Your report is being reviewed. The vendor has not been paid.",
      steps: steps.map((s, i) => (i > 3 ? { ...s, state: "upcoming" as const } : s)),
    };
  }

  if (order.dispute?.resolvedAt) current = Math.max(current, 3);

  const headlines = [
    "You haven't paid yet, so no money has moved.",
    "Your payment is held safely by Kampmax. The vendor is not paid yet.",
    "Your payment is held safely by Kampmax until you confirm you received your order.",
    "Your payment is still held. Confirm receipt to pay the vendor.",
    "",
    "The vendor has been paid. This order is complete.",
  ];
  return { headline: headlines[current] || headlines[3], steps: mark(base, current) };
}

// ── Contracts (a freelancer and an employer) ────────────────────────────────

type ContractParty = "employer" | "freelancer";

export function contractMoneyTimeline(
  engagement: Pick<
    Engagement,
    | "status"
    | "agreedAmount"
    | "paymentType"
    | "feeRate"
    | "autoReleaseAt"
    | "milestones"
    | "currentMilestonePosition"
  >,
  party: ContractParty
): MoneyTimelineModel {
  const { status } = engagement;
  const hourly = engagement.paymentType === "HOURLY";
  const amount = formatNaira(engagement.agreedAmount);
  const fee = engagement.feeRate ? `${engagement.feeRate}%` : null;

  if (status === "CANCELLED") {
    return {
      headline: "This contract was cancelled.",
      steps: [
        {
          id: "cancelled",
          title: "Contract cancelled",
          detail:
            party === "employer"
              ? "Any money you had put in escrow that was not yet paid out goes back to your wallet. If it doesn't, contact support."
              : "Work that was not paid for is not owed. Money already released to you stays yours.",
          state: "done",
        },
      ],
    };
  }

  const releaseLine = engagement.autoReleaseAt
    ? `If the employer doesn't respond, the payment releases to the freelancer automatically on ${formatDate(new Date(engagement.autoReleaseAt))}.`
    : "The employer has a review window. If they don't respond in time, the payment releases automatically.";

  const base: Omit<MoneyStep, "state">[] = [
    {
      id: "agree",
      title: "Contract agreed",
      detail: hourly
        ? "Both sides agreed the hourly rate and the weekly hour limit."
        : `Both sides agreed the price: ${amount}.`,
    },
    {
      id: "fund",
      title: hourly ? "The employer funds each week" : "The employer funds the work",
      detail:
        party === "employer"
          ? "Your money goes into escrow, held safely by Kampmax. Nobody can spend it yet, and you never pay more than the agreed price."
          : "The employer puts the money into escrow before you start, so you know it's there. You can't be asked to work for nothing.",
    },
    {
      id: "work",
      title: "Work is done and delivered",
      detail: "The freelancer works and submits the result. The money stays in escrow.",
    },
    {
      id: "review",
      title: "The employer reviews",
      detail: `They can approve it or ask for changes. ${releaseLine}`,
    },
    {
      id: "release",
      title: "Payment is released",
      detail:
        party === "freelancer"
          ? fee
            ? `The freelancer receives the payment minus Kampmax's ${fee} service fee. The exact amount is shown before you accept.`
            : "The freelancer receives the full payment. No service fee is charged on this contract."
          : "The money moves from escrow to the freelancer. You are never charged a service fee on top.",
    },
  ];

  if (status === "DISPUTED") {
    const steps = mark(base, 3, true);
    steps[3] = {
      ...steps[3],
      title: "Dispute open: money on hold",
      detail:
        "The escrow is frozen. Kampmax Trust & Safety reviews both sides and decides: release to the freelancer or refund to the employer.",
    };
    return { headline: "A dispute is open. The money stays in escrow until Kampmax decides.", steps };
  }

  const at: Record<Exclude<Engagement["status"], "DISPUTED" | "CANCELLED">, number> = {
    PENDING_PAYMENT: 1,
    FUNDED: 2,
    IN_PROGRESS: 2,
    REVISION_REQUESTED: 2,
    SUBMITTED: 3,
    COMPLETED: 5,
  };
  const current = at[status as keyof typeof at] ?? 1;

  const headlines: Record<number, string> =
    party === "employer"
      ? {
          1: "Nothing has been charged yet. Fund the contract when you're ready.",
          2: "Your money is held safely in escrow while the work is done.",
          3: "The work is delivered. Your money is still in escrow until you approve it.",
          5: "The contract is complete and the freelancer has been paid.",
        }
      : {
          1: "Waiting for the employer to fund the contract. Don't start until it's funded.",
          2: "The money is in escrow, so it's there for you. Deliver the work to get paid.",
          3: "You've delivered. The payment releases when the employer approves, or automatically.",
          5: "The contract is complete and you have been paid.",
        };
  return { headline: headlines[current] ?? headlines[2], steps: mark(base, current) };
}
