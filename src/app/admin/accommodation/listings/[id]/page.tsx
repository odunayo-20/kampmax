"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Info } from "lucide-react";
import { cn, formatDate, formatDateTime, formatNaira } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AgentStatusBadge, ModerationBadge, PublicationBadge } from "@/components/admin/accommodation/status-badges";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import {
  useAdminListing,
  useApproveListing,
  useRejectListing,
  useRestoreListing,
  useSuspendListing,
} from "@/hooks/admin/use-admin-accommodation";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { canAdminPerform } from "@/lib/admin/permissions";

const buttonClass =
  "inline-flex h-8 items-center rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-50";
const primaryClass =
  "inline-flex h-8 items-center rounded-md bg-kampmax-blue px-3 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50";

const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "per month",
  QUARTERLY: "per quarter",
  BIANNUALLY: "every 6 months",
  ANNUALLY: "per year",
  PER_SEMESTER: "per semester",
  PER_NIGHT: "per night",
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-kampmax-text-secondary">{label}</dt>
      <dd className="mt-0.5 text-sm text-kampmax-text">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

export default function AdminAccommodationListingPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { admin } = useAdminSession();
  const canModerate = admin ? canAdminPerform(admin, "accommodation", "moderateListings") : false;

  const { data: listing, isPending, isError, refetch } = useAdminListing(id);
  const approve = useApproveListing();
  const reject = useRejectListing();
  const suspend = useSuspendListing();
  const restore = useRestoreListing();
  const busy = approve.isPending || reject.isPending || suspend.isPending || restore.isPending;

  const [dialog, setDialog] = useState<"reject" | "suspend" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  }

  if (isPending) {
    return (
      <div className="p-4">
        <LoadingSkeleton variant="table" rows={6} />
      </div>
    );
  }
  if (isError || !listing) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const sub = listing.subscription;
  const paidFirstSubmission = sub?.status === "PENDING_APPROVAL" && sub.amount > 0;
  const agentOk = listing.agent?.status === "APPROVED";
  const hasMapPoint = listing.location.latitude !== null && listing.location.longitude !== null;
  const rows: [string, number][] = [
    ["Rent", listing.rentAmount],
    ["Caution deposit", listing.cautionFee],
    ["Agency fee", listing.agencyFee],
    ["Agreement fee", listing.agreementFee],
    ["Other compulsory charges", listing.otherCharges],
  ];

  return (
    <>
      <Link
        href="/admin/accommodation/listings"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:text-kampmax-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All listings
      </Link>

      <AdminPageHeader
        title={listing.title}
        description={`${listing.unit ? `${listing.unit.unitName} · ` : ""}${listing.property ? `${listing.property.title}, ${listing.property.city}, ${listing.property.state}` : ""}`}
        actions={
          <div className="flex items-center gap-1.5">
            <ModerationBadge status={listing.moderationStatus} />
            <PublicationBadge status={listing.publicationStatus} />
          </div>
        }
      />

      {actionError && (
        <p role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {listing.rejectionReason && (listing.moderationStatus === "REJECTED" || listing.moderationStatus === "ADMIN_SUSPENDED") && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="font-medium">
            {listing.moderationStatus === "REJECTED" ? "Rejected" : "Suspended"}:
          </span>{" "}
          {listing.rejectionReason}
        </p>
      )}

      {listing.moderationStatus === "PENDING_APPROVAL" && !agentOk && (
        <p className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            This agent is {listing.agent ? listing.agent.status.toLowerCase() : "not available"}, so the listing cannot be
            approved. Restore the agent first, or reject the listing.
          </span>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section aria-label="Photos" className="rounded-lg border border-kampmax-border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-kampmax-text">Photos</h2>
            {listing.media.length === 0 ? (
              <p className="text-sm text-kampmax-text-secondary">No photos.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {listing.media.map((m) => (
                  <li key={m.id} className="overflow-hidden rounded-md border border-kampmax-border bg-kampmax-muted/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt={m.caption ?? listing.title} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    {m.caption && <p className="truncate px-2 py-1 text-[11px] text-kampmax-text-secondary">{m.caption}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Description" className="rounded-lg border border-kampmax-border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-kampmax-text">Description</h2>
            <p className="whitespace-pre-line text-sm text-kampmax-text">{listing.description?.trim() || "No description."}</p>
            {listing.amenities.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Facilities">
                {listing.amenities.map((a) => (
                  <li key={a.id} className="rounded-full bg-kampmax-muted px-2 py-0.5 text-[11px] font-medium text-kampmax-text-secondary">
                    {a.name}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Charges" className="rounded-lg border border-kampmax-border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-kampmax-text">What the tenant pays up front</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-kampmax-border">
                {rows.map(([label, amount]) => (
                  <tr key={label}>
                    <th scope="row" className="py-1.5 text-left font-normal text-kampmax-text-secondary">
                      {label}
                      {label === "Rent" && (
                        <span className="ml-1 text-[11px]">({FREQUENCY_LABELS[listing.paymentFrequency] ?? listing.paymentFrequency})</span>
                      )}
                    </th>
                    <td className="py-1.5 text-right tabular-nums text-kampmax-text">{formatNaira(amount)}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="py-2 text-left font-semibold text-kampmax-text">Total up front</th>
                  <td className="py-2 text-right font-semibold tabular-nums text-kampmax-text">{formatNaira(listing.totalUpfrontCost)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <div className="space-y-4">
          <section aria-label="Agent" className="rounded-lg border border-kampmax-border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-kampmax-text">Agent</h2>
            {listing.agent ? (
              <>
                <p className="text-sm font-medium text-kampmax-text">{listing.agent.name}</p>
                <div className="mt-1">
                  <AgentStatusBadge status={listing.agent.status} />
                </div>
                <Link
                  href={`/admin/accommodation/agents/${listing.agent.id}`}
                  className="mt-2 inline-block text-xs font-medium text-kampmax-blue hover:underline"
                >
                  Open the agent&apos;s application and listing history
                </Link>
              </>
            ) : (
              <p className="text-sm text-kampmax-text-secondary">Agent not found.</p>
            )}
          </section>

          <section aria-label="Location" className="rounded-lg border border-kampmax-border bg-white p-4">
            <h2 className="mb-1 text-sm font-semibold text-kampmax-text">Location</h2>
            <p className="mb-3 text-[11px] text-kampmax-text-secondary">The street address is private. The public sees the neighbourhood only.</p>
            <dl className="grid gap-3">
              <Field label="Street address" value={listing.location.address} />
              <Field label="Neighbourhood" value={listing.location.neighbourhood} />
              <Field label="Landmark" value={listing.location.landmark} />
            </dl>
            {hasMapPoint && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${listing.location.latitude}&mlon=${listing.location.longitude}#map=17/${listing.location.latitude}/${listing.location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-kampmax-blue hover:underline"
              >
                Check the map point
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
          </section>

          <section aria-label="Subscription" className="rounded-lg border border-kampmax-border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-kampmax-text">Subscription</h2>
            {sub ? (
              <dl className="grid gap-3">
                <Field label="Status" value={sub.status.replace(/_/g, " ").toLowerCase()} />
                <Field label="Price per 30 days" value={sub.amount > 0 ? formatNaira(sub.amount) : "Free"} />
                <Field label="Paid until" value={sub.endsAt ? formatDate(sub.endsAt) : "Starts when approved"} />
                <Field label="Renews automatically" value={sub.autoRenew ? "Yes" : "No"} />
              </dl>
            ) : (
              <p className="text-sm text-kampmax-text-secondary">No subscription in play.</p>
            )}
            <dl className="mt-3 grid gap-3 border-t border-kampmax-border pt-3">
              <Field label="Submitted" value={listing.submittedAt ? formatDateTime(listing.submittedAt) : null} />
              <Field label="Last approved" value={listing.approvedAt ? formatDateTime(listing.approvedAt) : null} />
              <Field label="Availability" value={listing.availabilityStatus.toLowerCase()} />
            </dl>
          </section>
        </div>
      </div>

      {canModerate && (
        <section aria-label="Decisions" className="mt-4 rounded-lg border border-kampmax-border bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-kampmax-text">Decision</h2>
          {listing.moderationStatus === "PENDING_APPROVAL" && (
            <p className="mb-3 text-xs text-kampmax-text-secondary">
              {sub?.status === "PENDING_APPROVAL"
                ? "Approving puts it on the site and starts the paid month today."
                : "Approving puts the changes live again. The paid period carries on."}
              {paidFirstSubmission &&
                ` Rejecting marks the agent's ${formatNaira(sub.amount)} payment for refund.`}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {listing.moderationStatus === "PENDING_APPROVAL" && (
              <>
                <button
                  type="button"
                  className={primaryClass}
                  disabled={busy || !agentOk}
                  title={!agentOk ? "The agent is not in good standing" : undefined}
                  onClick={() => void run(() => approve.mutateAsync(id))}
                >
                  Approve listing
                </button>
                <button type="button" className={cn(buttonClass, "text-kampmax-error")} disabled={busy} onClick={() => setDialog("reject")}>
                  Reject
                </button>
              </>
            )}
            {listing.moderationStatus === "APPROVED" && (
              <button type="button" className={buttonClass} disabled={busy} onClick={() => setDialog("suspend")}>
                Suspend (take down)
              </button>
            )}
            {listing.moderationStatus === "ADMIN_SUSPENDED" && (
              <button type="button" className={primaryClass} disabled={busy} onClick={() => void run(() => restore.mutateAsync(id))}>
                Restore listing
              </button>
            )}
            {(listing.moderationStatus === "DRAFT" || listing.moderationStatus === "REJECTED") && (
              <p className="text-sm text-kampmax-text-secondary">
                {listing.moderationStatus === "DRAFT"
                  ? "This is a draft. It reaches you for review once the agent has paid."
                  : "Waiting for the agent to fix it. There is nothing to decide."}
              </p>
            )}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={dialog === "reject"}
        title="Reject this listing?"
        message={
          paidFirstSubmission
            ? `It will not go on the site, and the agent's ${formatNaira(sub?.amount ?? 0)} payment is marked for refund. The agent is told why.`
            : "It stays off the site until the agent fixes it. The agent is told why."
        }
        confirmLabel="Reject listing"
        tone="warning"
        reasonLabel="Reason shown to the agent"
        loading={reject.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={(reason) =>
          void run(async () => {
            await reject.mutateAsync({ id, reason });
            setDialog(null);
          })
        }
      />

      <ConfirmDialog
        open={dialog === "suspend"}
        title="Take this listing down?"
        message="It disappears from the site at once. The agent is told why, and you can restore it later."
        confirmLabel="Suspend listing"
        tone="warning"
        reasonLabel="Reason shown to the agent"
        loading={suspend.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={(reason) =>
          void run(async () => {
            await suspend.mutateAsync({ id, reason });
            setDialog(null);
          })
        }
      />
    </>
  );
}
