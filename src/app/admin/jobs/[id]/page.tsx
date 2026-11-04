"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  CalendarClock,
  ClipboardList,
  Clock,
  ExternalLink,
  Eye,
  FileWarning,
  Handshake,
  MapPin,
  ShieldAlert,
  Tag,
  UserRound,
  Wallet,
} from "lucide-react";
import { cn, formatDate, formatDateTime, formatNaira, timeAgo } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { StatCard } from "@/components/admin/StatCard";
import { badgeVariantClasses, type BadgeVariant } from "@/components/admin/StatusBadge";
import { useAdminJob, useAdminJobActivity, useTakeDownJob } from "@/hooks/admin/use-admin-jobs";
import { useAdminJobReports } from "@/hooks/admin/use-admin-job-reports";
import { REASON_LABEL, TARGET_LABEL } from "@/config/job-reports";
import { OpportunityTypeBadge } from "@/components/employer/jobs/OpportunityTypeBadge";
import { JobApplicantsTable } from "@/components/admin/jobs/JobApplicantsTable";
import type {
  ManagedJobActivityEvent,
  ManagedJobApplicationStatus,
  ManagedJobDetail,
} from "@/types/admin";
import {
  JobModerationBadge,
  JobPublicationBadge,
  JobStatusBadge,
} from "@/components/admin/jobs/JobBadges";
import {
  budgetTypeLabelOf,
  durationLabelOf,
  experienceLabelOf,
  formatJobBudget,
  JOB_MODERATION_LABELS,
  JOB_PUBLICATION_LABELS,
} from "@/components/admin/jobs/jobs-meta";

type DetailTab = "overview" | "applications" | "contracts" | "moderation" | "activity";

const TABS: { key: DetailTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "applications", label: "Applications" },
  { key: "contracts", label: "Contracts" },
  { key: "moderation", label: "Reports & moderation" },
  { key: "activity", label: "Activity" },
];

const APPLICATION_LABELS: Record<ManagedJobApplicationStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const accountStatusVariant: Record<string, BadgeVariant> = {
  active: "success",
  pending_review: "info",
  suspended: "warning",
  rejected: "error",
  external: "neutral",
};

const accountStatusLabel: Record<string, string> = {
  active: "Active",
  pending_review: "Pending review",
  suspended: "Suspended",
  rejected: "Rejected",
  external: "External client",
};

export default function AdminJobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = typeof params.id === "string" ? params.id : "";

  const [tab, setTab] = useState<DetailTab>("overview");
  const [takeDownKind, setTakeDownKind] = useState<"remove" | "reject" | "refund" | null>(null);
  const [takeDownNotice, setTakeDownNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const { data: detail, isPending, isError, refetch } = useAdminJob(jobId);
  const { data: activity } = useAdminJobActivity(jobId);
  const takeDown = useTakeDownJob(jobId);

  if (!jobId) {
    return <JobNotFound />;
  }

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-72 animate-pulse rounded bg-kampmax-muted" />
        <LoadingSkeleton variant="cards" rows={6} />
        <div className="h-64 animate-pulse rounded-lg bg-white ring-1 ring-kampmax-border" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  if (!detail) {
    return <JobNotFound />;
  }

  const { listing } = detail;
  // Closed jobs cannot be taken down. A cancelled one can only be refunded.
  const canTakeDown = ["open", "paused", "draft", "expired", "pending_review"].includes(listing.status);
  const canRefundOnly = listing.status === "cancelled";

  const runTakeDown = (reason: string) => {
    const refund = takeDownKind === "reject" || takeDownKind === "refund";
    setTakeDownNotice(null);
    takeDown.mutate(
      { reason, refund },
      {
        onSuccess: (result) => {
          setTakeDownKind(null);
          setTakeDownNotice({
            tone: "ok",
            text: refund
              ? result.refundedAmount > 0
                ? `Posting taken down. ${formatNaira(result.refundedAmount)} refunded to the employer's wallet.`
                : result.restoredFreePostings > 0
                  ? "Posting taken down. The employer's free posting was restored."
                  : "Posting taken down. Nothing had been charged for it, so there was nothing to refund."
              : "Posting taken down.",
          });
        },
        onError: (err) => {
          setTakeDownKind(null);
          setTakeDownNotice({
            tone: "error",
            text: err instanceof Error ? err.message : "Couldn't take the posting down.",
          });
        },
      }
    );
  };

  return (
    <>
      <Link
        href="/admin/jobs"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:text-kampmax-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All jobs
      </Link>

      <AdminPageHeader
        title={listing.title}
        description={`${listing.categoryName} · ${listing.workArrangement.replaceAll("_", " ")} · posted ${formatDate(listing.postedAt)}`}
        actions={
          <>
            <OpportunityTypeBadge type={listing.opportunityType ?? "gig"} />
            <JobStatusBadge status={listing.status} />
            <JobPublicationBadge publication={listing.publication} />
            <JobModerationBadge moderation={listing.moderation} />
            <a
              href={`/jobs/${listing.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View public job
            </a>
            {canTakeDown && (
              <>
                <button
                  type="button"
                  onClick={() => setTakeDownKind("reject")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
                >
                  Reject &amp; refund
                </button>
                <button
                  type="button"
                  onClick={() => setTakeDownKind("remove")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-error px-3 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  Take down
                </button>
              </>
            )}
            {canRefundOnly && (
              <button
                type="button"
                onClick={() => setTakeDownKind("refund")}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
              >
                Refund posting fee
              </button>
            )}
          </>
        }
      />

      {takeDownNotice && (
        <p
          role={takeDownNotice.tone === "error" ? "alert" : "status"}
          className={cn(
            "mb-4 rounded-lg px-3 py-2 text-sm",
            takeDownNotice.tone === "error"
              ? "bg-kampmax-error/10 text-kampmax-error"
              : "bg-emerald-50 text-emerald-700"
          )}
        >
          {takeDownNotice.text}
        </p>
      )}

      <ConfirmDialog
        open={takeDownKind !== null}
        tone={takeDownKind === "remove" ? "danger" : "warning"}
        title={
          takeDownKind === "remove"
            ? "Take this posting down?"
            : takeDownKind === "reject"
              ? "Reject this posting and refund the employer?"
              : "Refund this posting's fee?"
        }
        message={
          takeDownKind === "remove"
            ? "The posting comes off the marketplace and the employer is told. Nothing is refunded: use this for a posting that breaks the rules."
            : takeDownKind === "reject"
              ? "The posting comes off the marketplace. The fee the employer paid goes back to their wallet, or their free posting is restored."
              : "Gives back what the employer was charged for this posting, or restores their free posting. Safe to repeat: a charge is only refunded once."
        }
        confirmLabel={takeDownKind === "remove" ? "Take down" : takeDownKind === "reject" ? "Reject & refund" : "Refund"}
        reasonLabel="Reason (the employer can see this)"
        loading={takeDown.isPending}
        onConfirm={runTakeDown}
        onCancel={() => setTakeDownKind(null)}
      />

      {/* ---------- Overview stats ---------- */}
      <section aria-label="Job metrics" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Budget"
          value={formatJobBudget(listing.budgetMin, listing.budgetMax)}
          icon={Wallet}
          tone="blue"
          hint={budgetTypeLabelOf(listing.budgetType)}
        />
        <StatCard label="Applications" value={String(detail.applications.visible)} icon={UserRound} tone="gold" hint={`${detail.applications.total} total ${listing.opportunityType && listing.opportunityType !== "gig" ? "applications" : "proposals"}`} />
        <StatCard label="Views" value={listing.viewCount.toLocaleString("en-NG")} icon={Eye} tone="blue" hint="Lifetime" />
        <StatCard label="Deadline" value={formatDate(listing.deadline)} icon={CalendarClock} tone="default" hint={timeAgo(listing.deadline)} />
        <StatCard label="Arrangement" value={listing.workArrangement.replaceAll("_", " ")} icon={Briefcase} tone="default" hint={listing.location.city ?? listing.location.state ?? "Location not stated"} />
        <StatCard label="Open reports" value={String(listing.employersReported)} icon={FileWarning} tone={listing.employersReported > 0 ? "error" : "default"} hint={listing.employersReported > 0 ? "Waiting for an admin" : "None waiting"} />
      </section>

      {/* ---------- Tabs ---------- */}
      <div
        role="tablist"
        aria-label="Job profile sections"
        className="mt-5 flex gap-1 overflow-x-auto border-b border-kampmax-border no-scrollbar"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
              tab === t.key
                ? "border-kampmax-blue text-kampmax-blue"
                : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
            )}
          >
            {t.label}
            {t.key === "applications" && detail.applications.visible > 0 && (
              <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-kampmax-text-secondary">
                {detail.applications.visible}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4" role="tabpanel">
        {tab === "overview" && (
          <OverviewTab
            detail={detail}
            onOpenEmployer={(id) => router.push(`/admin/employers/${id}`)}
          />
        )}
        {tab === "applications" && (
          <ApplicationsTab
            jobId={listing.id}
            applications={detail.applications}
            hiring={!!listing.opportunityType && listing.opportunityType !== "gig"}
          />
        )}
        {tab === "contracts" && <ContractsTab detail={detail} />}
        {tab === "moderation" && <ModerationTab detail={detail} />}
        {tab === "activity" && <ActivityTab events={activity ?? detail.activity} />}
      </div>
    </>
  );
}

// ------------------------------------------------------------
// Overview tab
// ------------------------------------------------------------

function OverviewTab({
  detail,
  onOpenEmployer,
}: {
  detail: ManagedJobDetail;
  onOpenEmployer: (employerId: string) => void;
}) {
  const { listing, employer } = detail;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Left column */}
      <div className="space-y-4 lg:col-span-2">
        {/* Job information */}
        <section aria-label="Job information" className="rounded-lg border border-kampmax-border bg-white">
          <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
            <h2 className="text-sm font-semibold text-kampmax-text">Job information</h2>
            <span className="font-mono text-xs text-kampmax-text-secondary">{listing.id}</span>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
            <InfoRow icon={Tag} label="Category" value={listing.categoryName} />
            <InfoRow icon={Briefcase} label="Arrangement" value={listing.workArrangement.replaceAll("_", " ")} />
            <InfoRow icon={MapPin} label="Location" value={locationLabel(listing)} />
            <InfoRow label="Experience" value={experienceLabelOf(listing.experienceLevel)} />
            <InfoRow label="Duration" value={durationLabelOf(listing.duration)} />
            <InfoRow label="Budget type" value={budgetTypeLabelOf(listing.budgetType)} />
            <InfoRow label="Posting status" value={listing.status} />
            <InfoRow label="Views" value={listing.viewCount.toLocaleString("en-NG")} />
            <InfoRow label="Posted" value={`${timeAgo(listing.postedAt)} · ${formatDate(listing.postedAt)}`} />
            <InfoRow label="Deadline" value={`${timeAgo(listing.deadline)} · ${formatDate(listing.deadline)}`} />
          </dl>

          <div className="border-t border-kampmax-border px-4 py-3">
            <dt className="text-xs font-medium text-kampmax-text-secondary">Summary</dt>
            <dd className="mt-1 text-sm leading-relaxed text-kampmax-text">{listing.summary || "—"}</dd>

            <dt className="mt-3 text-xs font-medium text-kampmax-text-secondary">Description</dt>
            <dd className="mt-1 text-sm leading-relaxed text-kampmax-text">{listing.description || "—"}</dd>

            <dt className="mt-3 text-xs font-medium text-kampmax-text-secondary">Requirements</dt>
            <dd className="mt-1 text-sm leading-relaxed text-kampmax-text">{listing.requirements || "—"}</dd>

            {listing.skills.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {listing.skills.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-full bg-kampmax-muted px-2 py-0.5 text-[11px] font-medium text-kampmax-text-secondary"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Moderation state */}
        <section aria-label="Moderation state" className="rounded-lg border border-kampmax-border bg-white">
          <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
            <h2 className="text-sm font-semibold text-kampmax-text">Moderation state</h2>
            <JobModerationBadge moderation={listing.moderation} />
          </div>
          <div className="space-y-3 px-4 py-3">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <InfoRow label="Status" value={listing.status} />
              <InfoRow label="Publication" value={JOB_PUBLICATION_LABELS[listing.publication]} />
              <InfoRow label="Moderation" value={JOB_MODERATION_LABELS[listing.moderation]} />
            </dl>
            <p className="text-[11px] leading-relaxed text-kampmax-text-secondary">
              Publication and moderation are derived from the single real status field. The
              platform has no job-approval moderation pipeline, so <span className="font-medium text-kampmax-text">“pending_review”</span>{" "}
              is the only moderation-like state in the dataset — nothing else is invented.
            </p>
          </div>
        </section>
      </div>

      {/* Right column */}
      <div className="space-y-4">
        {/* Employer */}
        <EmployerCard employer={employer} onOpen={onOpenEmployer} />

        {/* Budget */}
        <section aria-label="Budget" className="rounded-lg border border-kampmax-border bg-white">
          <div className="border-b border-kampmax-border px-4 py-3">
            <h2 className="text-sm font-semibold text-kampmax-text">Budget</h2>
          </div>
          <dl className="divide-y divide-kampmax-border/70 px-4 py-1">
            <MoneyRow label="Range" value={formatJobBudget(listing.budgetMin, listing.budgetMax)} strong />
            <MoneyRow label="Type" value={budgetTypeLabelOf(listing.budgetType)} />
          </dl>
          <p className="border-t border-kampmax-border px-4 py-2 text-[11px] text-kampmax-text-secondary">
            Where a range was not stated, it reads as “Not stated” — never estimated.
          </p>
        </section>

        {/* Engagement */}
        <section aria-label="Engagement" className="rounded-lg border border-kampmax-border bg-white">
          <div className="border-b border-kampmax-border px-4 py-3">
            <h2 className="text-sm font-semibold text-kampmax-text">Engagement</h2>
          </div>
          <dl className="divide-y divide-kampmax-border/70 px-4 py-1">
            <MoneyRow label="Views" value={listing.viewCount.toLocaleString("en-NG")} />
            <MoneyRow label="Applications" value={String(detail.applications.visible)} />
            <MoneyRow label="Last activity" value={detail.applications.latestAt ? timeAgo(detail.applications.latestAt) : timeAgo(listing.postedAt)} />
          </dl>
        </section>
      </div>
    </div>
  );
}

function locationLabel(listing: ManagedJobDetail["listing"]): string {
  const parts = [listing.location.city, listing.location.state, listing.location.campusName].filter(
    (p): p is string => Boolean(p)
  );
  if (listing.location.remote) parts.push("Remote");
  return parts.length > 0 ? parts.join(", ") : "Not stated";
}

function EmployerCard({
  employer,
  onOpen,
}: {
  employer: ManagedJobDetail["employer"];
  onOpen: (employerId: string) => void;
}) {
  return (
    <section aria-label="Employer" className="rounded-lg border border-kampmax-border bg-white">
      <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
        <h2 className="text-sm font-semibold text-kampmax-text">Employer</h2>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            badgeVariantClasses(accountStatusVariant[employer.accountStatus] ?? "neutral")
          )}
        >
          {accountStatusLabel[employer.accountStatus] ?? employer.accountStatus}
        </span>
      </div>
      <div className="space-y-2.5 px-4 py-3.5">
        <p className="flex items-center gap-1.5 font-medium text-kampmax-text">
          {employer.name}
          {employer.verified && (
            <BadgeCheck aria-label="Verified employer" className="h-4 w-4 shrink-0 text-kampmax-success" />
          )}
          <span className="ml-auto font-mono text-[11px] font-normal text-kampmax-text-secondary">
            {employer.id}
          </span>
        </p>
        {employer.organizationName && (
          <p className="text-xs text-kampmax-text-secondary">{employer.organizationName}</p>
        )}
        <p className="text-xs leading-relaxed text-kampmax-text-secondary">“{employer.descriptor}”</p>

        <dl className="grid grid-cols-1 gap-x-5 gap-y-2 border-t border-kampmax-border/70 pt-2.5 text-xs">
          <InfoRow label="Campus" value={employer.campusName ?? "—"} />
          <InfoRow label="Location" value={employer.location ?? "—"} />
          <InfoRow label="Job posts on platform" value={String(employer.jobsTotal)} />
          <InfoRow label="Slug" value={employer.slug ? `/e/${employer.slug}` : "—"} mono />
        </dl>

        <button
          type="button"
          onClick={() => onOpen(employer.id)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
        >
          <Handshake className="h-3.5 w-3.5" />
          Open employer profile
        </button>
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// Applications tab
// ------------------------------------------------------------

function ApplicationsTab({
  jobId,
  applications,
  hiring,
}: {
  jobId: string;
  applications: ManagedJobDetail["applications"];
  /** A vacancy or internship: CV applications instead of proposals. */
  hiring: boolean;
}) {
  const statusKeyOrder: ManagedJobApplicationStatus[] = [
    "under_review",
    "shortlisted",
    "accepted",
    "submitted",
    "rejected",
    "withdrawn",
  ];

  return (
    <div className="space-y-4">
      <section aria-label="Application summary" className="rounded-lg border border-kampmax-border bg-white">
        <div className="border-b border-kampmax-border px-4 py-3">
          <h2 className="text-sm font-semibold text-kampmax-text">Application summary</h2>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-4">
          <MoneyRow
            label={hiring ? "Total applications" : "Total proposals"}
            value={String(applications.total)}
            strong
          />
          <MoneyRow label="Visible" value={String(applications.visible)} />
          <MoneyRow label={hiring ? "Hired" : "Accepted"} value={String(applications.byStatus.accepted)} />
          <MoneyRow label="Latest activity" value={applications.latestAt ? timeAgo(applications.latestAt) : "—"} />
        </dl>

        <div className="border-t border-kampmax-border px-4 py-4">
          <p className="text-xs font-medium text-kampmax-text-secondary">Breakdown by status</p>
          <ul className="mt-2 space-y-1.5">
            {statusKeyOrder.map((key) => {
              const count = applications.byStatus[key] ?? 0;
              const max = Math.max(applications.total, 1);
              return (
                <li key={key} className="flex items-center gap-3 text-xs">
                  <span className="w-28 shrink-0 text-kampmax-text-secondary">
                    {APPLICATION_LABELS[key]}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-kampmax-muted">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        barClass(key)
                      )}
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-right tabular-nums text-kampmax-text">{count}</span>
                </li>
              );
            })}
          </ul>
        </div>

      </section>

      <JobApplicantsTable jobId={jobId} />
    </div>
  );
}

function barClass(status: ManagedJobApplicationStatus): string {
  switch (status) {
    case "accepted":
      return "bg-kampmax-success";
    case "shortlisted":
      return "bg-kampmax-gold";
    case "under_review":
      return "bg-kampmax-info";
    case "submitted":
      return "bg-kampmax-blue";
    case "rejected":
      return "bg-kampmax-error/60";
    case "withdrawn":
      return "bg-kampmax-text-secondary/40";
  }
}

// ------------------------------------------------------------
// Contracts tab
// ------------------------------------------------------------

function ContractsTab({ detail }: { detail: ManagedJobDetail }) {
  return (
    <div className="space-y-4">
      <section aria-label="Contracts" className="rounded-lg border border-kampmax-border bg-white">
        <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
          <h2 className="text-sm font-semibold text-kampmax-text">Contracts</h2>
          <span className="inline-flex items-center gap-1 text-xs text-kampmax-text-secondary">
            <Handshake className="h-3.5 w-3.5" />
            {detail.contracts.count} linked
          </span>
        </div>
        <div className="px-4 py-6 text-center">
          <Handshake className="mx-auto h-6 w-6 text-kampmax-text-secondary/50" />
          <p className="mt-2 text-sm font-medium text-kampmax-text">
            No contracts linked to this job&apos;s proposals.
          </p>
          <p className="mx-auto mt-0.5 max-w-md text-xs text-kampmax-text-secondary">
            {detail.contracts.note}
          </p>
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------
// Reports & moderation tab
// ------------------------------------------------------------

function ModerationTab({ detail }: { detail: ManagedJobDetail }) {
  const { listing } = detail;
  const reports = useAdminJobReports({ jobId: listing.id, status: "OPEN", pageSize: 5 });

  return (
    <div className="space-y-4">
      {/* How moderation works */}
      <div className="flex items-start gap-2.5 rounded-lg border border-kampmax-info/30 bg-kampmax-info/5 px-4 py-3 text-xs leading-relaxed text-kampmax-text-secondary">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-info" />
        <p>
          Postings go live without being approved first. When something is wrong, an admin acts
          afterwards: use <span className="font-semibold text-kampmax-text">Take down</span> or{" "}
          <span className="font-semibold text-kampmax-text">Reject &amp; refund</span> above, or
          resolve a user&apos;s report below.
        </p>
      </div>

      {/* Moderation state */}
      <section aria-label="Moderation state" className="rounded-lg border border-kampmax-border bg-white">
        <div className="border-b border-kampmax-border px-4 py-3">
          <h2 className="text-sm font-semibold text-kampmax-text">Moderation state</h2>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-kampmax-text">
              {JOB_MODERATION_LABELS[listing.moderation]}
            </p>
            <p className="mt-0.5 text-xs text-kampmax-text-secondary">
              {listing.status === "cancelled"
                ? "This posting has been taken down."
                : "This posting is not held back by any approval step."}
            </p>
          </div>
          <JobModerationBadge moderation={listing.moderation} />
        </div>
      </section>

      {/* Reports */}
      <section aria-label="Reports and flags" className="rounded-lg border border-kampmax-border bg-white">
        <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
          <h2 className="text-sm font-semibold text-kampmax-text">Open reports</h2>
          <Link
            href={`/admin/job-reports?jobId=${listing.id}`}
            className="text-xs font-medium text-kampmax-blue hover:underline"
          >
            All job reports
          </Link>
        </div>
        {reports.isPending ? (
          <div className="p-4">
            <LoadingSkeleton variant="table" rows={2} />
          </div>
        ) : reports.isError ? (
          <ErrorState onRetry={() => void reports.refetch()} />
        ) : reports.data.items.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <FileWarning className="mx-auto h-6 w-6 text-kampmax-text-secondary/50" />
            <p className="mt-2 text-sm font-medium text-kampmax-text">No open reports</p>
            <p className="mx-auto mt-0.5 max-w-sm text-xs text-kampmax-text-secondary">
              Nobody has reported this posting or its applicants, or every report has been resolved.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-kampmax-border">
            {reports.data.items.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-kampmax-text">
                    {REASON_LABEL[r.reason]}
                    <span className="ml-2 text-xs font-normal text-kampmax-text-secondary">
                      {TARGET_LABEL[r.targetType]}
                      {r.applicant ? `: ${r.applicant.name}` : ""} · {timeAgo(r.createdAt)}
                    </span>
                  </p>
                  {r.details && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-kampmax-text-secondary">{r.details}</p>
                  )}
                </div>
                <Link
                  href={`/admin/job-reports/${r.id}`}
                  aria-label={`Review the ${REASON_LABEL[r.reason].toLowerCase()} report`}
                  className="inline-flex h-7 shrink-0 items-center rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ------------------------------------------------------------
// Activity tab
// ------------------------------------------------------------

function ActivityTab({ events }: { events: ManagedJobActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-kampmax-border bg-white px-4 py-10 text-center">
        <Clock className="mx-auto h-6 w-6 text-kampmax-text-secondary/50" />
        <p className="mt-2 text-sm font-medium text-kampmax-text">No activity recorded</p>
      </div>
    );
  }

  return (
    <section aria-label="Job activity" className="rounded-lg border border-kampmax-border bg-white px-4 py-4">
      <ol className="relative space-y-4 before:absolute before:bottom-1.5 before:left-[13px] before:top-1.5 before:w-px before:bg-kampmax-border">
        {events.map((event) => {
          const Icon = kindIcon(event.kind);
          return (
            <li key={event.id} className="relative flex gap-3 pl-0">
              <span
                aria-hidden
                className={cn(
                  "z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ring-white",
                  kindClasses(event.kind)
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[13px] font-medium leading-snug text-kampmax-text">{event.message}</p>
                <p className="mt-0.5 text-xs text-kampmax-text-secondary">
                  <span title={formatDateTime(event.at)}>{timeAgo(event.at)}</span>
                  {" · "}
                  {event.meta}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function kindIcon(kind: ManagedJobActivityEvent["kind"]) {
  switch (kind) {
    case "application":
      return UserRound;
    case "hiring":
      return Handshake;
    case "deadline":
      return Clock;
    case "job":
    default:
      return ClipboardList;
  }
}

function kindClasses(kind: ManagedJobActivityEvent["kind"]): string {
  switch (kind) {
    case "application":
      return "bg-kampmax-blue/10 text-kampmax-blue";
    case "hiring":
      return "bg-kampmax-success/10 text-kampmax-success";
    case "deadline":
      return "bg-kampmax-warning/10 text-amber-700";
    case "job":
    default:
      return "bg-kampmax-info/10 text-kampmax-info";
  }
}

// ------------------------------------------------------------
// Shared pieces
// ------------------------------------------------------------

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon?: typeof Tag;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-kampmax-text-secondary">
        <span className="inline-flex items-center gap-1">
          {Icon && <Icon className="h-3 w-3 opacity-60" />}
          {label}
        </span>
      </dt>
      <dd className={cn("mt-0.5 break-all text-sm text-kampmax-text capitalize", mono && "font-mono text-xs normal-case")}>
        {value}
      </dd>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="text-kampmax-text-secondary">{label}</dt>
      <dd className={cn("tabular-nums", strong ? "font-semibold text-kampmax-text" : "font-medium text-kampmax-text")}>
        {value}
      </dd>
    </div>
  );
}

function JobNotFound() {
  return (
    <div className="rounded-lg border border-kampmax-border bg-white p-4">
      <ErrorState
        title="Job not found"
        message="This job may have been removed or the link is incorrect."
      />
      <div className="mt-3 text-center">
        <Link
          href="/admin/jobs"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-kampmax-blue hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to jobs
        </Link>
      </div>
    </div>
  );
}