"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, FileText } from "lucide-react";
import { cn, formatNaira } from "@/lib/utils";
import { useOffer, useOfferAction } from "@/hooks/use-offers";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { formatDueDate } from "@/lib/engagement-milestones";
import type { Offer, OfferStatus } from "@/services/offers-api";

const STATUS_LABEL: Record<OfferStatus, string> = {
  PENDING: "Waiting for a reply",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  WITHDRAWN: "Withdrawn",
  EXPIRED: "Expired",
};

const STATUS_STYLE: Record<OfferStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-emerald-50 text-emerald-700",
  DECLINED: "bg-neutral-100 text-neutral-600",
  WITHDRAWN: "bg-neutral-100 text-neutral-600",
  EXPIRED: "bg-neutral-100 text-neutral-600",
};

function describeError(err: unknown): { text: string; needsEmployerProfile: boolean } {
  // The backend answers 403 when the accepting user has no employer profile yet.
  if ((err as { status?: number })?.status === 403) {
    return { text: "Set up an employer profile to accept offers.", needsEmployerProfile: true };
  }
  return { text: getFriendlyErrorMessage(err), needsEmployerProfile: false };
}

function OfferActions({ offer }: { offer: Offer }) {
  const router = useRouter();
  const accept = useOfferAction("accept");
  const decline = useOfferAction("decline");
  const withdraw = useOfferAction("withdraw");
  const [error, setError] = useState<{ text: string; needsEmployerProfile: boolean } | null>(null);

  const busy = accept.isPending || decline.isPending || withdraw.isPending;
  const fail = (err: unknown) => setError(describeError(err));

  function run(mutation: typeof accept, onDone?: () => void) {
    setError(null);
    mutation.mutate(offer.id, { onSuccess: onDone, onError: fail });
  }

  if (offer.status === "ACCEPTED" && offer.engagementId) {
    const href =
      offer.viewerRole === "RECIPIENT"
        ? "/employer/contracts"
        : `/freelancer/contracts/${offer.engagementId}`;
    return (
      <Link href={href} className="mt-3 block text-center text-xs font-semibold text-kampmax-blue hover:underline">
        {offer.viewerRole === "RECIPIENT" ? "Fund it from your contracts" : "View contract"}
      </Link>
    );
  }

  if (offer.status !== "PENDING") return null;

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        {offer.viewerRole === "RECIPIENT" ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(accept, () => router.push("/employer/contracts"))}
              className="flex-1 rounded-lg bg-kampmax-blue px-3 py-2 text-xs font-semibold text-white hover:bg-kampmax-blue/90 disabled:opacity-60"
            >
              {accept.isPending ? "Accepting…" : "Accept offer"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(decline)}
              className="rounded-lg border border-kampmax-border px-3 py-2 text-xs font-semibold text-kampmax-text hover:bg-kampmax-muted/50 disabled:opacity-60"
            >
              Decline
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(withdraw)}
            className="rounded-lg border border-kampmax-border px-3 py-2 text-xs font-semibold text-kampmax-text hover:bg-kampmax-muted/50 disabled:opacity-60"
          >
            {withdraw.isPending ? "Withdrawing…" : "Withdraw offer"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-kampmax-error">
          {error.text}{" "}
          {error.needsEmployerProfile && (
            <Link href="/onboarding/employer" className="underline">
              Set it up
            </Link>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * A freelancer's priced offer, shown inside the chat bubble that announced it.
 * The recipient can accept (which creates the contract to fund) or decline; the
 * freelancer can withdraw it until it is answered.
 */
export function OfferCard({ offerId }: { offerId: string }) {
  const query = useOffer(offerId);

  if (query.isPending) {
    return <div className="h-24 w-64 animate-pulse rounded-xl bg-kampmax-muted" aria-label="Loading offer" />;
  }
  if (query.isError || !query.data) {
    return <p className="text-xs text-kampmax-text-secondary">This offer isn&apos;t available.</p>;
  }

  const offer = query.data;
  return (
    <div className="w-64 max-w-full text-kampmax-text sm:w-72">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-kampmax-text-secondary">
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Offer
        </p>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_STYLE[offer.status])}>
          {STATUS_LABEL[offer.status]}
        </span>
      </div>

      <p className="mt-2 font-semibold leading-snug">{offer.title}</p>
      <p className="mt-1 line-clamp-4 whitespace-pre-line text-xs text-kampmax-text-secondary">{offer.description}</p>

      <p className="mt-3 text-lg font-bold">{formatNaira(offer.amount)}</p>
      {offer.milestones.length > 0 && (
        <details className="mt-2 rounded-lg border border-kampmax-border px-2.5 py-1.5 text-xs">
          <summary className="cursor-pointer font-medium">
            {offer.milestones.length} milestones · paid one at a time
          </summary>
          <ol className="mt-1.5 space-y-1.5">
            {offer.milestones.map((m, index) => (
              <li key={index} className="flex items-start justify-between gap-2">
                <span className="min-w-0 break-words">
                  {index + 1}. {m.title}
                  {m.dueDate && (
                    <span className="block text-[11px] text-kampmax-text-secondary">
                      Due {formatDueDate(m.dueDate)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-semibold">{formatNaira(m.amount)}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-kampmax-text-secondary">
        <Clock className="h-3 w-3" aria-hidden />
        {offer.deliveryDays ? `${offer.deliveryDays} days delivery · ` : ""}
        {offer.status === "PENDING"
          ? `expires ${new Date(offer.expiresAt).toLocaleDateString()}`
          : STATUS_LABEL[offer.status].toLowerCase()}
      </p>

      <OfferActions offer={offer} />
    </div>
  );
}
