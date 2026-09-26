"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserRound,
  XCircle,
} from "lucide-react";
import { cn, formatDate, formatDateTime, formatNairaCompact } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import {
  FreelancerStatusBadge,
  FreelancerProfileCell,
} from "@/components/admin/freelancers/FreelancerBadges";
import { getFreelancerActionAvailability } from "@/components/admin/freelancers/freelancers-meta";
import {
  useAdminFreelancer,
  useAdminFreelancerActivity,
  useAdminFreelancerSuspendMutation,
  useAdminFreelancerActivateMutation,
  useAdminFreelancerDeactivateMutation,
  useAdminFreelancerFeatureMutation,
  useAdminFreelancerUnfeatureMutation,
} from "@/hooks/admin/use-admin-freelancers";
import type { ManagedFreelancer, ManagedFreelancerDetail } from "@/types/admin";

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

export default function AdminFreelancerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const freelancerId = typeof params.id === "string" ? params.id : "";

  // ----- data hooks (always called at top level) -----
  const { data, error, isLoading, isError } = useAdminFreelancer(freelancerId);
  const { data: activityData, isLoading: isActLoading } =
    useAdminFreelancerActivity(freelancerId);

  // ----- overlays / feedback -----
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [confirmWorking, setConfirmWorking] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);

  const suspendMut = useAdminFreelancerSuspendMutation();
  const activateMut = useAdminFreelancerActivateMutation();
  const deactivateMut = useAdminFreelancerDeactivateMutation();
  const featureMut = useAdminFreelancerFeatureMutation();
  const unfeatureMut = useAdminFreelancerUnfeatureMutation();

  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  async function runStatusAction(status: "suspended" | "approved" | "rejected", reason = "") {
    setConfirmWorking(true);
    try {
      if (status === "suspended") await suspendMut.mutateAsync({ id: freelancerId, reason });
      else if (status === "approved") await activateMut.mutateAsync(freelancerId);
      else await deactivateMut.mutateAsync({ id: freelancerId, reason });
      pushToast("success", "Freelancer updated.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "The action failed. Try again.");
    } finally {
      setConfirmWorking(false);
      setSuspendOpen(false);
      setActivateOpen(false);
      setDeactivateOpen(false);
    }
  }

  async function runFeature(freelancer: ManagedFreelancer, feature: boolean) {
    try {
      await (feature ? featureMut.mutateAsync : unfeatureMut.mutateAsync)(freelancer.id);
      pushToast(
        "success",
        feature
          ? `${freelancer.displayName} featured on the marketplace.`
          : `${freelancer.displayName} unfeatured.`
      );
    } catch {
      pushToast("error", "The action failed. Try again.");
    }
  }

  // ----- render guards -----

  if (!freelancerId || (isError && !data)) {
    return (
      <div className="rounded-lg border border-kampmax-border bg-white p-4">
        <ErrorState
          title="Freelancer not found"
          message="This profile may have been removed or the link is incorrect."
        />
        <div className="mt-3 text-center">
          <Link
            href="/admin/freelancers"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-kampmax-blue hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to freelancers
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || isActLoading || !data) {
    return <LoadingSkeleton variant="cards" rows={6} />;
  }

  if (error || !data.freelancer) {
    return (
      <ErrorState
        title="Freelancer not found"
        message="The requested freelancer profile could not be loaded."
      />
    );
  }

  const detail: ManagedFreelancerDetail = data;
  const { freelancer, services, portfolio, reviews, availability, activity, review: reviewInfo } = detail;
  const availabilityStatus = getFreelancerActionAvailability(freelancer);
  const activityEvents = activityData ?? activity;

  return (
    <>
      {/* Back link */}
      <Link
        href="/admin/freelancers"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:text-kampmax-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All freelancers
      </Link>

      <AdminPageHeader
        title={freelancer.displayName}
        description={`${freelancer.headline || "No headline provided"} · ${freelancer.city || "City not specified"} · joined ${formatDate(freelancer.joinedAt)}`}
        actions={
          <>
            <FreelancerStatusBadge status={freelancer.status} />
            {freelancer.featured && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-gold/40 bg-kampmax-gold/10 px-3 py-1.5 text-xs font-medium text-kampmax-gold-dark">
                <Star className="h-3.5 w-3.5" />
                Featured
              </span>
            )}
            {availabilityStatus.canActivate && (
              <button
                type="button"
                onClick={() => setActivateOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-success/40 bg-white px-3 text-sm font-medium text-kampmax-success transition-colors hover:bg-kampmax-success/5"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Activate
              </button>
            )}
            {availabilityStatus.canFeature && (
              <button
                type="button"
                onClick={() => void runFeature(freelancer, true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-gold/40 bg-white px-3 text-sm font-medium text-kampmax-gold-dark transition-colors hover:bg-kampmax-gold/5"
              >
                <Star className="h-3.5 w-3.5" />
                Feature
              </button>
            )}
            {availabilityStatus.canUnfeature && (
              <button
                type="button"
                onClick={() => void runFeature(freelancer, false)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
              >
                <Star className="h-3.5 w-3.5 opacity-50" />
                Unfeature
              </button>
            )}
            {availabilityStatus.canSuspend && (
              <button
                type="button"
                onClick={() => setSuspendOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Suspend
              </button>
            )}
            {availabilityStatus.canDeactivate && (
              <button
                type="button"
                onClick={() => setDeactivateOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-error/30 bg-white px-3 text-sm font-medium text-kampmax-error transition-colors hover:bg-kampmax-error/5"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- Left column: profile, availability, reviews, activity ---------- */}
        <div className="space-y-4">
          {/* Profile overview */}
          <section aria-label="Freelancer profile" className="rounded-lg border border-kampmax-border bg-white">
            <div className="border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">Profile</h2>
            </div>
            <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row">
              <FreelancerProfileCell freelancer={freelancer} />
              <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <InfoRow label="Slug" value={freelancer.slug} mono />
                <InfoRow label="Email" value={freelancer.email} href={`mailto:${freelancer.email}`} />
                <InfoRow label="Phone" value={freelancer.phone} href={`tel:${freelancer.phone.replace(/\s+/g, "")}`} />
                <InfoRow label="Verified" value={freelancer.verified ? "Yes" : "No"} />
                <InfoRow label="ID" value={freelancer.id} mono />
              </dl>
            </div>
            <div className="space-y-1 border-t border-kampmax-border px-4 py-3 text-sm text-kampmax-text-secondary">
              <p>
                Categories:{" "}
                {freelancer.categories.length > 0 ? freelancer.categories.join(", ") : "No categories assigned"}
              </p>
              <p>
                Skills: {freelancer.skills.slice(0, 5).join(", ")}
                {freelancer.skills.length > 5 ? ` +${freelancer.skills.length - 5} more` : ""}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-3 border-t border-kampmax-border px-4 py-3 text-center">
              <MetricCard label="Bookings" value={freelancer.totalBookings.toLocaleString("en-NG")} />
              <MetricCard label="Services" value={freelancer.servicesCount.toLocaleString("en-NG")} />
              <MetricCard label="Rating" value={`${freelancer.rating.toFixed(1)} / 5`} />
            </dl>
          </section>

          {/* Review dossier: what an admin needs to approve or reject */}
          {reviewInfo && (
            <section aria-label="Review information" className="rounded-lg border border-kampmax-border bg-white">
              <div className="border-b border-kampmax-border px-4 py-3">
                <h2 className="text-sm font-semibold text-kampmax-text">Review information</h2>
              </div>

              {(reviewInfo.rejectionReason || reviewInfo.suspendedReason) && (
                <div className="mx-4 mt-4 rounded-md border border-kampmax-error/30 bg-kampmax-error/5 px-3 py-2 text-sm text-kampmax-text">
                  {reviewInfo.suspendedReason ? "Suspended: " : "Rejected: "}
                  {reviewInfo.suspendedReason ?? reviewInfo.rejectionReason}
                </div>
              )}

              <div className="flex gap-3 px-4 py-4">
                {reviewInfo.avatar ? (
                  <img src={reviewInfo.avatar} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-kampmax-muted text-xs text-kampmax-text-secondary">
                    No photo
                  </span>
                )}
                <p className="text-sm leading-relaxed text-kampmax-text-secondary">
                  {reviewInfo.bio || "No bio written."}
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-kampmax-border px-4 py-4 sm:grid-cols-2">
                <InfoRow
                  label="Hourly rate"
                  value={reviewInfo.hourlyRate === null ? "Not set" : `${reviewInfo.currency} ${reviewInfo.hourlyRate.toLocaleString("en-NG")}`}
                />
                <InfoRow label="Experience level" value={reviewInfo.experienceLevel ?? "Not set"} />
                <InfoRow
                  label="Years of experience"
                  value={reviewInfo.yearsOfExperience === null ? "Not set" : String(reviewInfo.yearsOfExperience)}
                />
                <InfoRow label="Location" value={reviewInfo.location || "Not set"} />
                <InfoRow label="Website" value={reviewInfo.links.website ?? "—"} href={reviewInfo.links.website ?? undefined} />
                <InfoRow label="LinkedIn" value={reviewInfo.links.linkedin ?? "—"} href={reviewInfo.links.linkedin ?? undefined} />
                <InfoRow label="GitHub" value={reviewInfo.links.github ?? "—"} href={reviewInfo.links.github ?? undefined} />
              </dl>

              <ReviewList title="Work experience" empty="No work experience added." items={reviewInfo.experience.map((e) => ({
                id: e.id,
                primary: `${e.title} · ${e.company}`,
                secondary: `${e.startDate} – ${e.current ? "Present" : (e.endDate ?? "—")}`,
                body: e.description,
              }))} />
              <ReviewList title="Education" empty="No education added." items={reviewInfo.education.map((e) => ({
                id: e.id,
                primary: `${e.qualification}, ${e.fieldOfStudy}`,
                secondary: `${e.institution} · ${e.startYear} – ${e.endYear ?? "Present"}`,
              }))} />
              <ReviewList title="Certifications" empty="No certifications added." items={reviewInfo.certifications.map((c) => ({
                id: c.id,
                primary: c.name,
                secondary: `${c.issuer} · issued ${c.issueDate}${c.expirationDate ? ` · expires ${c.expirationDate}` : ""}`,
                href: c.credentialUrl ?? undefined,
              }))} />
            </section>
          )}

          {/* Availability */}
          <section aria-label="Availability" className="rounded-lg border border-kampmax-border bg-white">
            <div className="border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">Availability</h2>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
              <InfoRow label="Status" value={availability.status || "—"} />
              {availability.workingDays.length > 0 && (
                <InfoRow
                  label="Working days"
                  value={availability.workingDays
                    .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
                    .join(", ")}
                />
              )}
              {availability.workingHoursStart && availability.workingHoursEnd && (
                <InfoRow label="Hours" value={`${availability.workingHoursStart} - ${availability.workingHoursEnd}`} />
              )}
              {availability.timezone && <InfoRow label="Timezone" value={availability.timezone} />}
            </dl>
          </section>

          {/* Reviews */}
          {reviews.length > 0 && (
            <section aria-label="Reviews" className="rounded-lg border border-kampmax-border bg-white">
              <div className="border-b border-kampmax-border px-4 py-3">
                <h2 className="text-sm font-semibold text-kampmax-text">
                  Reviews <span className="font-normal text-kampmax-text-secondary">({reviews.length})</span>
                </h2>
              </div>
              <ul role="list" className="divide-y divide-kampmax-border/70">
                {reviews.slice(0, 5).map((review) => (
                  <li key={review.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span aria-label={`${review.rating} out of 5 stars`} className="inline-flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            aria-hidden
                            className={cn(
                              "h-3.5 w-3.5",
                              n <= review.rating ? "fill-kampmax-gold text-kampmax-gold" : "text-kampmax-border"
                            )}
                          />
                        ))}
                      </span>
                      <span className="text-sm font-medium text-kampmax-text">{review.authorName}</span>
                      {review.createdAt && (
                        <span className="tabular-nums text-xs text-kampmax-text-secondary">
                          {formatDate(review.createdAt)}
                        </span>
                      )}
                    </div>
                    {review.comment && (
                      <p className="mt-1.5 text-sm leading-relaxed text-kampmax-text-secondary">
                        “{review.comment}”
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Activity */}
          {activityEvents.length > 0 && (
            <section aria-label="Activity" className="rounded-lg border border-kampmax-border bg-white">
              <div className="border-b border-kampmax-border px-4 py-3">
                <h2 className="text-sm font-semibold text-kampmax-text">Activity</h2>
              </div>
              <ul role="list" className="divide-y divide-kampmax-border/70">
                {activityEvents.map((event) => (
                  <li key={event.id} className="flex items-start gap-2 px-4 py-2.5">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kampmax-text-secondary/60" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-kampmax-text">{event.message}</p>
                      <p className="text-xs text-kampmax-text-tertiary">
                        {formatDateTime(event.at)}
                        {event.meta ? ` · ${event.meta}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ---------- Right column: services + portfolio ---------- */}
        <div className="space-y-4">
          {/* Services */}
          {services.length > 0 && (
            <section aria-label="Services" className="rounded-lg border border-kampmax-border bg-white">
              <div className="border-b border-kampmax-border px-4 py-3">
                <h2 className="text-sm font-semibold text-kampmax-text">
                  Services <span className="font-normal text-kampmax-text-secondary">({services.length})</span>
                </h2>
              </div>
              <ul role="list" className="divide-y divide-kampmax-border/70">
                {services.map((svc) => (
                  <li key={svc.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                    <span className="truncate text-sm font-medium text-kampmax-text">{svc.title}</span>
                    <span className="text-xs text-kampmax-text-secondary">
                      {svc.price === null ? "No price set" : `${svc.pricingModel}: ${formatNairaCompact(svc.price)}`}
                    </span>
                    {svc.status && svc.status !== "published" && (
                      <span className="rounded-full bg-kampmax-muted px-2 py-0.5 text-[11px] font-medium capitalize text-kampmax-text-secondary">
                        {svc.status}
                      </span>
                    )}
                    {svc.isFeatured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-kampmax-gold/15 px-2 py-0.5 text-[11px] font-medium text-kampmax-gold-dark">
                        <Star className="h-3 w-3" />
                        Featured
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Portfolio */}
          {portfolio.length > 0 && (
            <section aria-label="Portfolio" className="rounded-lg border border-kampmax-border bg-white">
              <div className="border-b border-kampmax-border px-4 py-3">
                <h2 className="text-sm font-semibold text-kampmax-text">
                  Portfolio <span className="font-normal text-kampmax-text-secondary">({portfolio.length})</span>
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4">
                {portfolio.map((item) => (
                  <div key={item.id} className="rounded-lg bg-kampmax-surface/50 p-2">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-20 w-full rounded-md object-cover"
                      />
                    ) : null}
                    <p className="mt-1 line-clamp-1 text-xs font-medium text-kampmax-text">{item.title}</p>
                    {!item.image && item.description && (
                      <p className="line-clamp-2 text-[11px] text-kampmax-text-secondary">{item.description}</p>
                    )}
                    {item.technologies && item.technologies.length > 0 && (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-kampmax-text-secondary">
                        {item.technologies.join(", ")}
                      </p>
                    )}
                    {item.projectUrl && (
                      <a
                        href={item.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block truncate text-[11px] font-medium text-kampmax-blue hover:underline"
                      >
                        View project
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {services.length === 0 && portfolio.length === 0 && (
            <section className="rounded-lg border border-dashed border-kampmax-border bg-white px-4 py-10 text-center">
              <UserRound className="mx-auto h-6 w-6 text-kampmax-text-secondary/50" />
              <p className="mt-2 text-sm font-medium text-kampmax-text">No marketplace activity yet</p>
              <p className="mt-0.5 text-xs text-kampmax-text-secondary">
                Services and portfolio items appear once this freelancer lists on the marketplace.
              </p>
            </section>
          )}
        </div>
      </div>

      {/* ---------- Overlays ---------- */}

      <ConfirmDialog
        open={suspendOpen}
        title={`Suspend ${freelancer.displayName}?`}
        message="Their services are hidden from the marketplace immediately. The account stays recoverable via Activate."
        confirmLabel="Suspend freelancer"
        tone="warning"
        loading={confirmWorking}
        reasonLabel="Reason for suspension (recorded in the audit log)"
        onConfirm={(reason) => void runStatusAction("suspended", reason)}
        onCancel={() => setSuspendOpen(false)}
      />

      <ConfirmDialog
        open={activateOpen}
        title={`Activate ${freelancer.displayName}?`}
        message="Approval restores full marketplace visibility and lets this freelancer take bookings again."
        confirmLabel="Activate freelancer"
        tone="default"
        loading={confirmWorking}
        onConfirm={() => void runStatusAction("approved")}
        onCancel={() => setActivateOpen(false)}
      />

      <ConfirmDialog
        open={deactivateOpen}
        title={`Reject ${freelancer.displayName}?`}
        message="The profile is retired and hidden from the marketplace. Reactivation requires an explicit admin decision."
        confirmLabel="Reject freelancer"
        tone="danger"
        loading={confirmWorking}
        reasonLabel="Reason for rejection (emailed to the freelancer)"
        onConfirm={(reason) => void runStatusAction("rejected", reason)}
        onCancel={() => setDeactivateOpen(false)}
      />

      {/* ---------- Toasts ---------- */}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex max-w-sm items-start gap-2 rounded-lg border px-3.5 py-2.5 text-sm shadow-lg animate-[kampmax-fade-in_.18s_ease-out] ${
              t.tone === "success"
                ? "border-kampmax-success/30 bg-white text-kampmax-text"
                : "border-kampmax-error/30 bg-white text-kampmax-text"
            }`}
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-success" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-error" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ------------------------------------------------------------
// Shared pieces
// ------------------------------------------------------------

function InfoRow({
  label,
  value,
  href,
  mono,
}: {
  label: string;
  value: string;
  href?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-kampmax-text-secondary">{label}</dt>
      <dd className={cn("mt-0.5 break-all text-sm text-kampmax-text", mono && "font-mono text-xs")}>
        {href ? (
          <a href={href} className="transition-colors hover:text-kampmax-blue">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-kampmax-surface/50 px-2 py-2">
      <dt className="text-[11px] font-medium text-kampmax-text-secondary">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-kampmax-text">{value}</dd>
    </div>
  );
}
function ReviewList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { id: string; primary: string; secondary?: string; body?: string; href?: string }[];
}) {
  return (
    <div className="border-t border-kampmax-border px-4 py-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-kampmax-text-secondary">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1.5 text-sm text-kampmax-text-secondary">{empty}</p>
      ) : (
        <ul role="list" className="mt-1.5 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <p className="text-sm font-medium text-kampmax-text">
                {item.href ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-kampmax-blue hover:underline">
                    {item.primary}
                  </a>
                ) : (
                  item.primary
                )}
              </p>
              {item.secondary && <p className="text-xs text-kampmax-text-secondary">{item.secondary}</p>}
              {item.body && <p className="mt-0.5 line-clamp-3 text-xs text-kampmax-text-secondary">{item.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
