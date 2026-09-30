"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Loader2, Lock, MapPin, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchMyWalletBalance } from "@/services/wallet";
import { useEvent, usePurchaseTicket } from "@/hooks/use-events";
import { cn } from "@/lib/utils";
import { eventDate, eventTime, naira } from "@/components/events/event-format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EventCheckoutPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { data: event, isPending, isError, error } = useEvent(id);
  const purchase = usePurchaseTicket(id);
  const [tierId, setTierId] = useState<string | null>(null);

  const wallet = useQuery({
    queryKey: ["wallet", "balance", user?.id ?? ""],
    queryFn: fetchMyWalletBalance,
    enabled: Boolean(user?.id),
  });

  // Pick the first ticket type that is still available.
  useEffect(() => {
    if (event && tierId === null) {
      setTierId(event.tiers.find((t) => !t.soldOut)?.id ?? null);
    }
  }, [event, tierId]);

  // Already holding a ticket: nothing to buy.
  useEffect(() => {
    if (event?.attending && !purchase.isPending && !purchase.isSuccess) {
      router.replace("/tickets");
    }
  }, [event?.attending, purchase.isPending, purchase.isSuccess, router]);

  if (isPending) {
    return <div className="mx-auto max-w-lg p-4" aria-busy="true"><div className="h-72 animate-pulse rounded-3xl bg-neutral-200/70" /></div>;
  }
  if (isError || !event) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-sm text-neutral-600">
        {error?.message ?? "Event not found."}{" "}
        <Link href="/events" className="font-semibold text-primary-700">Back to events</Link>
      </div>
    );
  }

  const tier = event.tiers.find((t) => t.id === tierId) ?? null;
  const price = tier?.price ?? 0;
  const fee = price > 0 ? event.serviceFee : 0;
  const total = price + fee;
  const balance = wallet.data?.balance;
  const insufficient = total > 0 && balance !== undefined && balance < total;

  function pay() {
    if (!tier || purchase.isPending) return;
    purchase.mutate(tier.id, {
      onSuccess: (ticket) => router.replace(`/events/${id}/success?ticket=${ticket.id}`),
    });
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-52 lg:pb-32">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3">
        <button onClick={() => router.back()} aria-label="Back" className="flex items-center gap-1 text-sm text-neutral-600">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="flex-1 text-center text-base font-bold text-neutral-900 pr-10">Get Ticket</h1>
      </header>

      <div className="mx-auto max-w-lg space-y-4 p-4">
        <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-primary-950">
            {event.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.coverImageUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-neutral-900">{event.title}</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500">
              <Calendar className="h-3 w-3" /> {eventDate(event.startsAt)} &middot; {eventTime(event.startsAt)}
            </p>
            <p className="flex items-center gap-1 truncate text-[11px] text-neutral-500">
              <MapPin className="h-3 w-3" /> {event.location}
            </p>
          </div>
        </div>

        <section aria-labelledby="tier-heading" className="space-y-2">
          <h2 id="tier-heading" className="text-sm font-bold text-neutral-900">Select Ticket Type</h2>
          <div role="radiogroup" aria-labelledby="tier-heading" className="space-y-2">
            {event.tiers.map((t) => {
              const selected = t.id === tierId;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={t.soldOut}
                  onClick={() => setTierId(t.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border bg-white p-3.5 text-left transition",
                    selected ? "border-primary-600 ring-1 ring-primary-600" : "border-neutral-200",
                    t.soldOut && "opacity-50"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                      {t.name}
                      {t.isLimited && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">Limited</span>
                      )}
                    </p>
                    <p className="text-base font-extrabold text-neutral-900">{t.price > 0 ? naira(t.price) : "Free"}</p>
                    <p className="text-[11px] text-neutral-500">
                      {t.soldOut ? "Sold out" : `${t.remaining} available`}
                      {t.description ? ` · ${t.description}` : ""}
                    </p>
                  </div>
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border-2", selected ? "border-primary-600" : "border-neutral-300")}>
                    {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary-600" />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {tier && (
          <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-neutral-900">Summary</h2>
            <Row label={`${tier.name} Ticket (1)`} value={price > 0 ? naira(price) : "Free"} />
            {fee > 0 && <Row label="Service Fee" value={naira(fee)} />}
            <div className="border-t border-neutral-100 pt-2">
              <Row label="Total" value={total > 0 ? naira(total) : "Free"} bold />
            </div>
          </section>
        )}

        {total > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-900">Payment Method</h2>
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
                <Wallet className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-neutral-900">Kampmax Pay</p>
                <p className="text-[11px] text-neutral-500">
                  {balance !== undefined ? `Balance ${naira(balance)}` : "Fast · Secure · Reliable"}
                </p>
              </div>
              {insufficient && (
                <Link href="/profile/wallet" className="text-xs font-bold text-primary-700">Top up</Link>
              )}
            </div>
            {insufficient && (
              <p role="alert" className="text-xs text-error-700">
                Your wallet balance is too low for this ticket. Top up to continue.
              </p>
            )}
          </section>
        )}

        {purchase.isError && (
          <p role="alert" className="rounded-xl border border-error-100 bg-error-50 p-3 text-xs font-medium text-error-700">
            {purchase.error.message || "We couldn't complete your purchase."}
          </p>
        )}
      </div>

      {/* Sits above the mobile bottom navigation (62px + safe area). */}
      <div className="fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-40 border-t border-neutral-200 bg-white p-3 lg:bottom-0 lg:p-4">
        <div className="mx-auto max-w-lg space-y-1.5">
          <button
            onClick={pay}
            disabled={!tier || purchase.isPending || insufficient}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {purchase.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {total > 0 ? `Pay ${naira(total)}` : "Get free ticket"}
          </button>
          <p className="flex items-center justify-center gap-1 text-[10px] text-neutral-400">
            <Lock className="h-3 w-3" /> Your payment is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between text-sm", bold ? "font-extrabold text-neutral-900" : "text-neutral-600")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
