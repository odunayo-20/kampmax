"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Star,
  XCircle,
} from "lucide-react";
import { cn, formatDate, formatDateTime, formatNairaCompact } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  EmployerAvatar,
  EmployerStatusBadge,
  EmployerVerificationBadge,
} from "@/components/admin/employers/EmployerBadges";
import { getEmployerActionAvailability } from "@/components/admin/employers/employers-meta";
import {
  useAdminEmployer,
  useAdminEmployerActivity,
  useAdminEmployerApproveMutation,
  useAdminEmployerRejectMutation,
  useAdminEmployerRestoreMutation,
  useAdminEmployerSuspendMutation,
} from "@/hooks/admin/use-admin-employers";
import type {
  EmployerActivityKind,
  ManagedEmployerDetail,
} from "@/types/admin";
import type { EmployerApplicationStatus } from "@/types/opportunity";

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

const APPLICATION_STATUS_LABELS: Record<EmployerApplicationStatus | "all", string> = {
  all: "All applications",
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const JOB_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  closed: "Closed",
  expired: "Expired",
  draft: "Draft",
  pending_review: "Pending review",
  cancelled: "Cancelled",
};

const ACTIVITY_ICONS: Record<EmployerActivityKind, typeof Clock> = {
  profile: Building2,
  verification: ShieldCheck,
  jobs: Briefcase,
  hiring: Globe,
  reviews: Star,
  admin: ShieldAlert,
};

export default function AdminEmployerDetailPage() {
  const params = useParams<{ id: string }>();
  const employerId = typeof params.id === "string" ? params.id : "";

  // ----- data hooks (always called at top level) -----
  const { data, error, isLoading, isError } = useAdminEmployer(employerId);
  const { data: activityData, isLoading: isActLoading } =
    useAdminEmployerActivity(employerId);

  // ----- overlays / feedback -----
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [confirmWorking, setConfirmWorking] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);

  const suspendMut = useAdminEmployerSuspendMutation();
  const restoreMut = useAdminEmployerRestoreMutation();
  const approveMut = useAdminEmployerApproveMutation();
  const rejectMut = useAdminEmployerRejectMutation();

  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  async function runStatusAction(status: "approve" | "reject" | "suspend" | "restore", reason = "") {
    setConfirmWorking(true);
    try {
      if (status === "approve") await approveMut.mutateAsync(employerId);
      else if (status === "reject") await rejectMut.mutateAsync({ id: employerId, reason });
      else if (status === "suspend") await suspendMut.mutateAsync({ id: employerId, reason });
      else await restoreMut.mutateAsync(employerId);
      pushToast("success", "Employer updated.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "The action failed. Try again.");
    } finally {
      setConfirmWorking(false);
      setApproveOpen(false);
      setRejectOpen(false);
      setSuspendOpen(false);
      setRestoreOpen(false);
    }
  }

  // ----- render guards -----

  if (!employerId || (isError && !data)) {
    return (
      <div className="rounded-lg border border-kampmax-border bg-white p-4">
        <ErrorState
          title="Employer not found"
          message="This profile may have been removed or the link is incorrect."
        />
        <div className="mt-3 text-center">
          <Link
            href="/admin/employers"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-kampmax-blue hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to employers
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || isActLoading || !data) {
    return <LoadingSkeleton variant="cards" rows={6} />;
  }

  if (error || !data.employer) {
    return (
      <ErrorState
        title="Employer not found"
        message="The requested employer profile could not be loaded."
      />
    );
  }

  const detail: ManagedEmployerDetail = data;
  const { employer, profile, organization, hiring, jobs, reviews, verification, activity } =
    detail;
  const availability = getEmployerActionAvailability(employer);
  const activityEvents = activityData ?? activity;
  const locationText = [employer.city, employer.state].filter(Boolean).join(", ") || "No location";

  return (
    <>
      {/* Back link */}
      <Link
        href="/admin/employers"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:text-kampmax-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All employers
      </Link>

      <AdminPageHeader
        title={employer.name}
        description={`${employer.descriptor} · ${locationText} · joined ${formatDate(employer.joinedAt)}`}
        actions={
          <>
            <EmployerStatusBadge status={employer.status} />
            {availability.canApprove && (
              <button
                type="button"
                onClick={() => setApproveOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-success/40 bg-white px-3 text-sm font-medium text-kampmax-success transition-colors hover:bg-kampmax-success/5"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Approve
              </button>
            )}
            {availability.canRestore && (
              <button
                type="button"
                onClick={() => setRestoreOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-success/40 bg-white px-3 text-sm font-medium text-kampmax-success transition-colors hover:bg-kampmax-success/5"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Restore
              </button>
            )}
            {availability.canSuspend && (
              <button
                type="button"
                onClick={() => setSuspendOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Suspend
              </button>
            )}
            {availability.canReject && (
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-error/30 bg-white px-3 text-sm font-medium text-kampmax-error transition-colors hover:bg-kampmax-error/5"
              >
                <ShieldX className="h-3.5 w-3.5" />
                Reject
              </button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- Left column: identity, profile, hiring, reviews, verification ---------- */}
        <div className="space-y-4">
          {/* Identity overview */}
          <section aria-label="Employer overview" className="rounded-lg border border-kampmax-border bg-white">
            <div className="border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">Employer</h2>
            </div>
            <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row">
              <div className="flex items-center gap-3">
                <EmployerAvatar name={employer.name} />
                <div>
                  <p className="font-medium text-kampmax-text-primary">{employer.name}</p>
                  <p className="text-sm text-kampmax-text-secondary">
                    {organization?.name ?? "No organization registered"}
                  </p>
                </div>
              </div>
              <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <InfoRow label="ID" value={employer.id} mono />
                <InfoRow label="Slug" value={employer.slug ?? "—"} mono />
                <InfoRow label="Email" value={employer.email ?? "—"} href={employer.email ? `mailto:${employer.email}` : undefined} />
                <InfoRow label="Phone" value={employer.phone ?? "—"} href={employer.phone ? `tel:${employer.phone.replace(/\s+/g, "")}` : undefined} />
                <InfoRow label="Website" value={employer.website ?? "—"} href={employer.website ?? undefined} />
                <InfoRow label="Campus" value={employer.campusName ?? "—"} />
              </dl>
            </div>
            <div className="space-y-1 border-t border-kampmax-border px-4 py-3 text-sm text-kampmax-text-secondary">
              <p>Industry: {employer.industry ?? "Not specified"}</p>
              <p>
                {employer.hasEmployerProfile
                  ? `Onboarding profile ${employer.profileCompletion}% complete`
                  : "No Kampmax employer profile — external client posting jobs directly."}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-3 border-t border-kampmax-border px-4 py-3 text-center">
              <MetricCard label="Profile" value={`${employer.profileCompletion}%`} />
              <MetricCard label="Rating" value={employer.reviewsCount > 0 ? `${employer.rating.toFixed(1)} / 5` : "No reviews"} />
              <MetricCard label="Hiring" value={employer.hiringStatus === "hiring" ? "Active" : "Not hiring"} />
            </dl>
          </section>

          {/* Onboarding profile */}
          {profile ? (
            <section aria-label="Onboarding profile" className="rounded-lg border border-kampmax-border bg-white">
              <div className="border-b border-kampmax-border px-4 py-3">
                <h2 className="text-sm font-semibold text-kampmax-text">Profile</h2>
              </div>
              <div className="flex items-center gap-3 px-4 pt-4">
                <div className="flex-1">
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-kampmax-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={employer.profileCompletion}>
                    <div
                      className="h-full rounded-full bg-kampmax-blue transition-all"
                      style={{ width: `${employer.profileCompletion}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-kampmax-text-secondary">
                    Onboarding completion: {employer.profileCompletion}%
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
                <InfoRow label="Headline" value={profile.headline || "—"} />
                <InfoRow label="Location" value={profile.location} />
                <InfoRow label="Industry" value={profile.industry || "—"} />
                <InfoRow label="Work preference" value={profile.workPreference ?? "—"} />
                <InfoRow label="Remote available" value={profile.remoteAvailable ? "Yes" : "No"} />
                <InfoRow label="Experience" value={profile.experience ?? "—"} />
                <InfoRow label="Work type" value={profile.workType ?? "—"} />
                <InfoRow label="Project duration" value={profile.projectDuration ?? "—"} />
                {profile.budgetMin !== null && profile.budgetMax !== null && (
                  <InfoRow
                    label="Budget range"
                    value={`${formatNairaCompact(profile.budgetMin)} - ${formatNairaCompact(profile.budgetMax)}`}
                  />
                )}
                {profile.categories.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-kampmax-text-secondary">Looking for</dt>
                    <dd className="mt-0.5 flex flex-wrap gap-1.5">
                      {profile.categories.map((c) => (
                        <span key={c} className="rounded-full bg-kampmax-surface px-2 py-0.5 text-xs text-kampmax-text">
                          {c}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
              {profile.about && (
                <p className="border-t border-kampmax-border px-4 py-3 text-sm leading-relaxed text-kampmax-text-secondary">
                  {profile.about}
                </p>
              )}
            </section>
          ) : (
            <section aria-label="Profile" className="rounded-lg border border-kampmax-border bg-white px-4 py-6 text-center">
              <Building2 className="mx-auto h-6 w-6 text-kampmax-text-secondary/50" />
              <p className="mt-2 text-sm font-medium text-kampmax-text">No onboarding profile</p>
              <p className="mt-0.5 text-xs text-kampmax-text-secondary">
                This entity posts jobs directly as an external client and has not onboarded as a Kampmax employer.
              </p>
            </section>
          )}

          {/* Hiring summary */}
          <section aria-label="Hiring activity" className="rounded-lg border border-kampmax-border bg-white">
            <div className="border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">Hiring activity</h2>
            </div>
            <dl className="grid grid-cols-3 gap-3 px-4 py-3 text-center">
              <MetricCard label="Open jobs" value={String(employer.activeJobs)} />
              <MetricCard label="Applications" value={employer.applicationsReceived.toLocaleString("en-NG")} />
              <MetricCard label="Hires" value={String(employer.hires)} />
              <MetricCard label="Active contracts" value={String(hiring.contractsActive)} />
              <MetricCard label="Completed" value={String(hiring.contractsCompleted)} />
              <MetricCard label="Total contracts" value={String(hiring.contractsTotal)} />
            </dl>
            <div className="grid gap-4 border-t border-kampmax-border px-4 py-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-kampmax-text-secondary">Jobs by status</dt>
                <dd className="mt-1.5 space-y-1">
                  {["open", "pending_review", "closed", "expired", "draft", "cancelled"].map((s) => (
                    <div key={s} className="flex items-center justify-between text-sm">
                      <span className="text-kampmax-text-secondary">{JOB_STATUS_LABELS[s] ?? s}</span>
                      <span className="font-medium tabular-nums text-kampmax-text">{hiring.jobCounts[s] ?? 0}</span>
                    </div>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-kampmax-text-secondary">Applications by status</dt>
                <dd className="mt-1.5 space-y-1">
                  {(["submitted", "under_review", "shortlisted", "accepted", "rejected", "withdrawn"] as const).map((s) => (
                    <div key={s} className="flex items-center justify-between text-sm">
                      <span className="text-kampmax-text-secondary">{APPLICATION_STATUS_LABELS[s]}</span>
                      <span className="font-medium tabular-nums text-kampmax-text">{hiring.applicationCounts[s] ?? 0}</span>
                    </div>
                  ))}
                </dd>
              </div>
            </div>
          </section>

          {/* Reviews */}
          <section aria-label="Reviews" className="rounded-lg border border-kampmax-border bg-white">
            <div className="border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">
                Reviews <span className="font-normal text-kampmax-text-secondary">({reviews.count})</span>
              </h2>
            </div>
            {reviews.count > 0 ? (
              <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row">
                <div className="text-center sm:w-36">
                  <p className="text-2xl font-semibold tabular-nums text-kampmax-text">{reviews.averageRating.toFixed(1)}</p>
                  <p className="mt-0.5 text-xs text-kampmax-text-secondary">out of 5</p>
                  <div className="mt-1 flex items-center justify-center gap-0.5" aria-label={`${reviews.averageRating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        aria-hidden
                        className={cn(
                          "h-4 w-4",
                          n <= Math.round(reviews.averageRating) ? "fill-kampmax-gold text-kampmax-gold" : "text-kampmax-border"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex-1 space-y-1.5" aria-label="Rating distribution">
                  {([5, 4, 3, 2, 1] as const).map((star) => {
                    const n = reviews.distribution[star] ?? 0;
                    const pct = reviews.count > 0 ? (n / reviews.count) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-6 shrink-0 tabular-nums text-kampmax-text-secondary">{star}★</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-kampmax-muted">
                          <div className="h-full rounded-full bg-kampmax-gold" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 shrink-0 text-right tabular-nums text-kampmax-text-tertiary">{n}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="px-4 py-4 text-sm text-kampmax-text-secondary">No reviews have been published for this employer yet.</p>
            )}
          </section>

          {/* Verification */}
          <section aria-label="Verification" className="rounded-lg border border-kampmax-border bg-white">
            <div className="border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">Verification</h2>
            </div>
            {verification ? (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-kampmax-text-secondary">Status</dt>
                  <dd className="mt-1"><EmployerVerificationBadge status={verification.status} /></dd>
                </div>
                <InfoRow label="Type" value={verification.type ?? "—"} />
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-kampmax-text-secondary">Note</dt>
                  <dd className="mt-0.5 text-sm text-kampmax-text">{verification.note ?? "No note on file."}</dd>
                </div>
              </dl>
            ) : (
              <p className="px-4 py-4 text-sm text-kampmax-text-secondary">
                No verification on file — this entity has not completed employer onboarding.
              </p>
            )}
          </section>
        </div>

        {/* ---------- Right column: organization, jobs, activity ---------- */}
        <div className="space-y-4">
          {/* Organization */}
          {organization ? (
            <section aria-label="Organization" className="rounded-lg border border-kampmax-border bg-white">
              <div className="border-b border-kampmax-border px-4 py-3">
                <h2 className="text-sm font-semibold text-kampmax-text">Organization</h2>
              </div>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
                <InfoRow label="Name" value={organization.name} />
                <InfoRow label="Business type" value={organization.businessType || "—"} />
                <InfoRow label="Industry" value={organization.industry || "—"} />
                <InfoRow label="Size" value={organization.size || "—"} />
                {organization.website && <InfoRow label="Website" value={organization.website} href={organization.website} />}
              </dl>
              {organization.description && (
                <p className="border-t border-kampmax-border px-4 py-3 text-sm leading-relaxed text-kampmax-text-secondary">
                  {organization.description}
                </p>
              )}
            </section>
          ) : (
            <section aria-label="Organization" className="rounded-lg border border-kampmax-border bg-white px-4 py-6 text-center">
              <Building2 className="mx-auto h-6 w-6 text-kampmax-text-secondary/50" />
              <p className="mt-2 text-sm font-medium text-kampmax-text">No organization details</p>
              <p className="mt-0.5 text-xs text-kampmax-text-secondary">
                Organization information appears once this entity completes employer onboarding.
              </p>
            </section>
          )}

          {/* Jobs */}
          <section aria-label="Jobs" className="rounded-lg border border-kampmax-border bg-white">
            <div className="border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">
                Jobs <span className="font-normal text-kampmax-text-secondary">({jobs.length})</span>
              </h2>
            </div>
            {jobs.length > 0 ? (
              <ul role="list" className="divide-y divide-kampmax-border/70">
                {jobs.map((job) => (
                  <li key={job.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="truncate text-sm font-medium text-kampmax-text transition-colors hover:text-kampmax-blue"
                      >
                        {job.title}
                      </Link>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <p className="mt-1 text-xs text-kampmax-text-tertiary">
                      Posted {formatDate(job.postedAt)}
                      {job.deadline ? ` · deadline ${formatDate(job.deadline)}` : ""} · {job.applications} applications ·{" "}
                      {job.viewCount.toLocaleString("en-NG")} views · {job.id}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-sm text-kampmax-text-secondary">No jobs have been posted by this employer.</p>
            )}
          </section>

          {/* Activity */}
          {activityEvents.length > 0 && (
            <section aria-label="Activity" className="rounded-lg border border-kampmax-border bg-white">
              <div className="border-b border-kampmax-border px-4 py-3">
                <h2 className="text-sm font-semibold text-kampmax-text">Activity</h2>
              </div>
              <ul role="list" className="divide-y divide-kampmax-border/70">
                {activityEvents.map((event) => {
                  const Icon = ACTIVITY_ICONS[event.kind] ?? Clock;
                  return (
                    <li key={event.id} className="flex items-start gap-2 px-4 py-2.5">
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kampmax-text-secondary/60" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-kampmax-text">{event.message}</p>
                        <p className="text-xs text-kampmax-text-tertiary">
                          {formatDateTime(event.at)}
                          {event.meta ? ` · ${event.meta}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* ---------- Overlays ---------- */}

      <ConfirmDialog
        open={approveOpen}
        title={`Approve ${detail.employer.name}?`}
        message="Approval activates this employer profile. The public profile becomes discoverable."
        confirmLabel="Approve employer"
        tone="default"
        loading={confirmWorking}
        onConfirm={() => void runStatusAction("approve")}
        onCancel={() => setApproveOpen(false)}
      />

      <ConfirmDialog
        open={restoreOpen}
        title={`Restore ${detail.employer.name}?`}
        message="Restoring returns the employer profile to active status and lets this employer operate again."
        confirmLabel="Restore employer"
        tone="default"
        loading={confirmWorking}
        onConfirm={() => void runStatusAction("restore")}
        onCancel={() => setRestoreOpen(false)}
      />

      <ConfirmDialog
        open={suspendOpen}
        title={`Suspend ${detail.employer.name}?`}
        message="Their employer profile is suspended immediately. The profile stays recoverable via Restore."
        confirmLabel="Suspend employer"
        tone="warning"
        loading={confirmWorking}
        reasonLabel="Reason for suspension (emailed to the employer)"
        onConfirm={(reason) => void runStatusAction("suspend", reason)}
        onCancel={() => setSuspendOpen(false)}
      />

      <ConfirmDialog
        open={rejectOpen}
        title={`Reject ${detail.employer.name}?`}
        message="The employer profile is rejected and closed for onboarding. Reactivation requires an explicit admin decision."
        confirmLabel="Reject employer"
        tone="danger"
        loading={confirmWorking}
        reasonLabel="Reason for rejection (emailed to the employer)"
        onConfirm={(reason) => void runStatusAction("reject", reason)}
        onCancel={() => setRejectOpen(false)}
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

function JobStatusBadge({ status }: { status: string }) {
  let variant: "success" | "warning" | "neutral" | "error" = "neutral";
  if (status === "open") variant = "success";
  else if (status === "pending_review") variant = "warning";
  else if (status === "cancelled") variant = "error";
  return (
    <StatusBadge
      variant={variant}
      label={JOB_STATUS_LABELS[status] ?? status.replace(/_/g, " ")}
      dot
      className="gap-1.5"
    />
  );
}