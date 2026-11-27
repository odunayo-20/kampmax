"use client";

import Image from "next/image";
import { useState } from "react";
import {
  useArchiveAccommodationListing,
  useCancelAccommodationRenewal,
  useConfirmAccommodationAvailability,
  useEnableAccommodationRenewal,
  useSubmitAccommodationListing,
} from "@/hooks/use-accommodation";
import { describeHousingError } from "@/lib/accommodation-text";
import { canRenewNow, renewalAction, subscriptionView } from "@/lib/agent-billing";
import {
  AVAILABILITY_LABEL,
  AVAILABILITY_OPTIONS,
  canArchiveListing,
  canEditListing,
  canPublish,
  canResubmit,
  joinAnd,
  listingStatus,
  listingTip,
  missingOnListing,
  placeLine,
  rentLine,
  type Availability,
  type ListingTone,
} from "@/lib/agent-listings";
import { formatNaira } from "@/lib/utils";
import type { AccommodationListing, AccommodationPackage } from "@/types/accommodation";
import { Pill, useAsk, useRun } from "./enquiry-parts";
import { ListingFormPanel } from "./ListingFormPanel";
import { PublishDialog } from "./PublishDialog";

const NOTICE: Record<ListingTone, string> = {
  bad: "bg-red-50 text-red-900",
  attention: "bg-amber-50 text-amber-900",
  positive: "bg-emerald-50 text-emerald-900",
  info: "bg-blue-50 text-blue-900",
  neutral: "bg-kampmax-muted/60 text-kampmax-text",
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });

/**
 * One of the agent's listings: where it stands and the one thing to do next, its price, details, interest,
 * availability and subscription. The same screen as the mobile app's agent-listing/[id].
 */
export function AccommodationListingManager({
  listing: l,
  packages,
}: {
  listing: AccommodationListing;
  packages: AccommodationPackage[];
}) {
  const archive = useArchiveAccommodationListing();
  const resubmit = useSubmitAccommodationListing();
  const confirmAvailability = useConfirmAccommodationAvailability();
  const cancelRenewal = useCancelAccommodationRenewal();
  const enableRenewal = useEnableAccommodationRenewal();
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState<"publish" | "renew" | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { error, run } = useRun();
  const busy = archive.isPending || resubmit.isPending || confirmAvailability.isPending || cancelRenewal.isPending || enableRenewal.isPending;
  const { confirm, dialog } = useAsk(busy);

  const status = listingStatus(l);
  const missing = missingOnListing(l);
  const sub = l.subscription;
  const subView = sub ? subscriptionView(sub) : null;
  const stats = l.stats ?? { views: 0, saves: 0, enquiries: 0 };
  const tip = listingTip(l);
  const photo = l.media[0]?.url;
  const toggle = sub ? renewalAction(sub) : null;

  // The one thing to do next.
  let main: { label: string; onClick: () => void } | null = null;
  if (canPublish(l)) main = missing.length > 0 ? { label: "Finish your listing", onClick: () => setEditing(true) } : { label: "Publish", onClick: () => setPaying("publish") };
  else if (l.moderationStatus === "REJECTED")
    main = canResubmit(l) ? { label: "Send back for review", onClick: () => void run(() => resubmit.mutateAsync(l.id)) } : { label: "Publish again", onClick: () => setPaying("publish") };
  else if (sub && canRenewNow(sub) && l.moderationStatus === "APPROVED") main = { label: "Renew listing", onClick: () => setPaying("renew") };

  function setRenewal(on: boolean) {
    if (!sub) return;
    if (on) return void run(() => enableRenewal.mutateAsync(sub.id));
    confirm({
      title: "Turn off automatic renewal?",
      body: sub.endsAt ? `Your listing stays up until ${day(sub.endsAt)}, then it will be hidden unless you renew.` : "Your listing will not renew by itself.",
      confirmLabel: "Turn off",
      cancelLabel: "Keep it on",
      destructive: false,
      run: () => run(() => cancelRenewal.mutateAsync(sub.id)),
    });
  }

  function saveAvailability() {
    if (!availability) return;
    const go = () => run(async () => {
      await confirmAvailability.mutateAsync({ id: l.id, availabilityStatus: availability });
      setAvailability(null);
    });
    if (availability === "AVAILABLE") return void go();
    confirm({ title: "Hide this listing?", body: "Students will not see it while the room is not available. Mark it available again to show it.", confirmLabel: "Update", cancelLabel: "Cancel", destructive: false, run: go });
  }

  return (
    <article className="space-y-4 py-4">
      {photo && (
        <div className="relative h-48 w-full overflow-hidden rounded-xl bg-kampmax-muted">
          <Image src={photo} alt="Main photo of the listing" fill unoptimized sizes="(max-width: 1024px) 100vw, 640px" className="object-cover" />
        </div>
      )}

      <header className="space-y-1">
        <h2 className="text-lg font-bold text-kampmax-text">{l.title}</h2>
        <p className="text-sm text-kampmax-text-secondary">{placeLine(l)}</p>
        <Pill label={status.label} tone={status.tone} />
      </header>

      {status.text && <p className={`rounded-lg p-3 text-sm ${NOTICE[status.tone]}`}>{status.text}</p>}
      {canPublish(l) && missing.length > 0 && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-950">
          <p className="font-semibold">Before you can publish</p>
          <p>Add {joinAnd(missing)}.</p>
        </div>
      )}

      {main && (
        <button type="button" disabled={busy} onClick={main.onClick} className="w-full rounded-lg bg-kampmax-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">
          {main.label}
        </button>
      )}
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {editing && <ListingFormPanel mode="edit" listing={l} onCancel={() => setEditing(false)} onSaved={(note) => { setEditing(false); setMessage(note); }} />}

      <Section title="Rent and charges">
        <Line label="Rent" value={rentLine(l, formatNaira)} bold />
        {l.cautionFee > 0 && <Line label="Caution fee" value={formatNaira(l.cautionFee)} />}
        {l.agencyFee > 0 && <Line label="Agency fee" value={formatNaira(l.agencyFee)} />}
        {l.agreementFee > 0 && <Line label="Agreement fee" value={formatNaira(l.agreementFee)} />}
        {l.otherCharges > 0 && <Line label="Other charges" value={formatNaira(l.otherCharges)} />}
        <Line label="Students pay up front" value={formatNaira(l.totalUpfrontCost)} bold />
      </Section>

      {l.description && (
        <Section title="Description">
          <p className="whitespace-pre-wrap text-sm text-kampmax-text">{l.description}</p>
        </Section>
      )}
      {l.amenities.length > 0 && (
        <Section title="Facilities">
          <p className="text-sm text-kampmax-text">{l.amenities.map((a) => a.name).join(" · ")}</p>
        </Section>
      )}

      {l.moderationStatus === "APPROVED" && (
        <Section title="How it is doing" hint="Views are page opens, not people.">
          <Line label="Views" value={String(stats.views)} />
          <Line label="Saved by students" value={String(stats.saves)} />
          <Line label="Enquiries" value={String(stats.enquiries)} />
          {tip && <p className="text-sm text-kampmax-text-secondary">{tip}</p>}
        </Section>
      )}

      {l.moderationStatus === "APPROVED" && (
        <Section title="Availability" hint="Keep this up to date. Students lose trust in rooms that are already taken.">
          <Line label="Right now" value={AVAILABILITY_LABEL[l.availabilityStatus] ?? l.availabilityStatus} bold />
          {availability ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-kampmax-text-secondary">
                Availability
                <select value={availability} onChange={(e) => setAvailability(e.target.value as Availability)} className="mt-1 block rounded-md border border-kampmax-border bg-white px-2 py-2 text-sm text-kampmax-text">
                  {AVAILABILITY_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </label>
              <button type="button" disabled={busy} onClick={saveAvailability} className="rounded-md bg-kampmax-blue px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Update</button>
              <button type="button" onClick={() => setAvailability(null)} className="rounded-md border border-kampmax-border px-3 py-2 text-xs">Cancel</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || l.availabilityStatus !== "AVAILABLE"}
                onClick={() => void run(() => confirmAvailability.mutateAsync({ id: l.id }))}
                className="rounded-md border border-kampmax-border px-3 py-2 text-xs disabled:opacity-50"
              >
                Yes, still available
              </button>
              <button type="button" disabled={busy} onClick={() => setAvailability(l.availabilityStatus as Availability)} className="px-3 py-2 text-xs text-kampmax-text-secondary underline disabled:opacity-50">
                Change availability
              </button>
            </div>
          )}
        </Section>
      )}

      {sub && subView && (
        <Section title="Subscription">
          <Pill label={subView.label} tone={subView.tone} />
          {subView.text && <p className="text-sm text-kampmax-text">{subView.text}</p>}
          <Line label="Price" value={sub.amount > 0 ? `${formatNaira(sub.amount)} per period` : "Free"} />
          {toggle && (
            <button type="button" disabled={busy} onClick={() => setRenewal(toggle === "turn-on")} className="rounded-md border border-kampmax-border px-3 py-2 text-xs disabled:opacity-50">
              {toggle === "turn-on" ? "Turn on automatic renewal" : "Turn off automatic renewal"}
            </button>
          )}
        </Section>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-kampmax-border pt-4">
        {canEditListing(l) && !editing && (
          <button type="button" disabled={busy} onClick={() => setEditing(true)} className="rounded-md border border-kampmax-border px-3 py-2 text-xs disabled:opacity-50">Edit listing</button>
        )}
        {canArchiveListing(l) ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => confirm({ title: `Archive "${l.title}"?`, body: "It will be removed from your listings. This cannot be undone.", confirmLabel: "Archive", run: () => run(() => archive.mutateAsync(l.id)) })}
            className="px-3 py-2 text-xs text-red-700 underline disabled:opacity-50"
          >
            Archive listing
          </button>
        ) : (
          <p className="text-xs text-kampmax-text-secondary">This listing can be archived after its subscription ends. Turn off automatic renewal and let it run out.</p>
        )}
      </div>

      <PublishDialog
        open={paying !== null}
        onClose={() => setPaying(null)}
        onDone={setMessage}
        listingId={l.id}
        packages={packages}
        renew={paying === "renew" && sub ? { id: sub.id, amount: sub.amount } : undefined}
      />
      {dialog}
    </article>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-lg border border-kampmax-border p-4">
      <h3 className="text-sm font-semibold text-kampmax-text">{title}</h3>
      {hint && <p className="text-xs text-kampmax-text-secondary">{hint}</p>}
      {children}
    </section>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-kampmax-text-secondary">{label}</span>
      <span className={`text-right text-kampmax-text ${bold ? "font-bold" : ""}`}>{value}</span>
    </div>
  );
}
