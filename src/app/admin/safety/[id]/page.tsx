"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Eye,
  ExternalLink,
  FileWarning,
  Flag,
  Handshake,
  Image as ImageIcon,
  Link2,
  ShieldAlert,
  UserRound,
  XCircle,
} from "lucide-react";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { StatCard } from "@/components/admin/StatCard";
import {
  SafetySourceBadge,
  SafetyStatusBadge,
  SafetyTargetTypeBadge,
} from "@/components/admin/safety/SafetyBadges";
import {
  safetySourceLabel,
  safetyStatusLabel,
  safetyTargetTypeLabel,
} from "@/components/admin/safety/safety-meta";
import {
  useAdminSafetyReport,
  useSetSafetyReportStatusMutation,
} from "@/hooks/admin/use-admin-safety";
import type {
  TrustSafetyReportDetail,
  TrustSafetyResolutionStatus,
} from "@/types/admin";

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

type DetailTab = "overview" | "evidence" | "actions";

const TABS: { key: DetailTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "evidence", label: "Evidence & details" },
  { key: "actions", label: "Moderation actions" },
];

export default function AdminSafetyReportPage() {
  const params = useParams<{ id: string }>();
  const reportId = typeof params.id === "string" ? params.id : "";

  const [tab, setTab] = useState<DetailTab>("overview");
  const [confirmStatus, setConfirmStatus] =
    useState<TrustSafetyResolutionStatus | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);
  const setStatusMut = useSetSafetyReportStatusMutation();

  const { data: detail, isPending, isError, refetch } = useAdminSafetyReport(reportId);

  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const tid = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id: tid, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== tid)), 3800);
  }, []);

  async function resolve(status: TrustSafetyResolutionStatus, note: string) {
    try {
      await setStatusMut.mutateAsync({
        id: reportId,
        input: { status, note: note.trim() || undefined },
      });
      setConfirmStatus(null);
      pushToast("success", `Report marked ${status}.`);
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Couldn't update the report.");
    }
  }

  if (!reportId) {
    return <SafetyReportNotFound />;
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
    return <SafetyReportNotFound />;
  }

  return (
    <>
      <Link
        href="/admin/safety"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:text-kampmax-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All reports
      </Link>

      <AdminPageHeader
        title={`Report on ${detail.targetName}`}
        description={`${safetySourceLabel(detail.source)} · ${detail.id} · filed ${formatDate(detail.createdAt)}`}
        actions={
          <>
            <SafetyStatusBadge status={detail.status} />
            <SafetySourceBadge source={detail.source} />
            <SafetyTargetTypeBadge type={detail.targetType} />
          </>
        }
      />

      {/* ---------- Overview stats ---------- */}
      <section
        aria-label="Report metrics"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
      >
        <StatCard label="Status" value={safetyStatusLabel(detail.status)} icon={Flag} tone="default" hint="derived status" />
        <StatCard label="Source" value={safetySourceLabel(detail.source)} icon={ShieldAlert} tone="default" hint="real report store" />
        <StatCard label="Entity reports" value={String(detail.entityReportCount)} icon={Link2} tone={detail.entityReportCount > 1 ? "error" : "default"} hint="same target" />
        <StatCard label="Reporter" value={detail.reporterName} icon={UserRound} tone="default" hint={detail.reporter.campusName ? `${detail.reporter.campusName} campus` : "campus unknown"} />
        <StatCard label="Reason" value={detail.reason} icon={Flag} tone="error" hint="reported reason" />
      </section>

      {/* ---------- Tabs ---------- */}
      <div
        role="tablist"
        aria-label="Report profile sections"
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
          </button>
        ))}
      </div>

      <div className="mt-4" role="tabpanel">
        {tab === "overview" && <OverviewTab detail={detail} />}
        {tab === "evidence" && <EvidenceTab detail={detail} />}
        {tab === "actions" && (
          <ActionsTab detail={detail} onResolve={(status) => setConfirmStatus(status)} />
        )}
      </div>

      <ConfirmDialog
        open={confirmStatus !== null}
        title={confirmStatus ? `Move this report to "${safetyStatusLabel(confirmStatus)}"?` : ""}
        message="This updates the post report's status immediately in the community moderation queue."
        confirmLabel={confirmStatus ? safetyStatusLabel(confirmStatus) : "Confirm"}
        tone={confirmStatus === "dismissed" ? "default" : confirmStatus === "resolved" ? "default" : "warning"}
        loading={setStatusMut.isPending}
        reasonLabel={
          confirmStatus === "reviewing" ? undefined : "Note (recorded on the report)"
        }
        onConfirm={(note) => {
          if (confirmStatus) void resolve(confirmStatus, note);
        }}
        onCancel={() => setConfirmStatus(null)}
      />

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-80 flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`rounded-md px-3.5 py-2 text-sm font-medium text-white shadow-lg ${
                t.tone === "success" ? "bg-kampmax-success" : "bg-kampmax-error"
              }`}
            >
              {t.text}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------
// Overview tab
// ------------------------------------------------------------

function OverviewTab({ detail }: { detail: TrustSafetyReportDetail }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Left column */}
      <div className="space-y-4 lg:col-span-2">
        {/* Report information */}
        <section aria-label="Report information" className="rounded-lg border border-kampmax-border bg-white">
          <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
            <h2 className="text-sm font-semibold text-kampmax-text">Report information</h2>
            <span className="font-mono text-xs text-kampmax-text-secondary">{detail.id}</span>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
            <InfoRow icon={Flag} label="Reason" value={detail.reason} capitalize />
            <InfoRow label="Source store" value={safetySourceLabel(detail.source)} />
            <InfoRow label="Status" value={safetyStatusLabel(detail.status)} />
            <InfoRow icon={Clock} label="Filed" value={`${formatDate(detail.createdAt)} · ${formatDateTime(detail.createdAt)}`} />
            <InfoRow label="Target type" value={safetyTargetTypeLabel(detail.targetType)} />
            <InfoRow label="Target ID" value={detail.targetId} mono />
          </dl>

          <div className="border-t border-kampmax-border px-4 py-3">
            <dt className="text-xs font-medium text-kampmax-text-secondary">Status note</dt>
            <dd className="mt-1 text-xs leading-relaxed text-kampmax-text-secondary">
              {detail.statusNote}
            </dd>
          </div>

          {detail.details && (
            <div className="border-t border-kampmax-border px-4 py-3">
              <dt className="text-xs font-medium text-kampmax-text-secondary">Reporter details</dt>
              <dd className="mt-1 text-sm leading-relaxed text-kampmax-text">{detail.details}</dd>
            </div>
          )}
        </section>

        {/* Related reports */}
        <section aria-label="Related reports" className="rounded-lg border border-kampmax-border bg-white">
          <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
            <h2 className="text-sm font-semibold text-kampmax-text">Other reports on this target</h2>
            <span className="inline-flex items-center gap-1 text-xs text-kampmax-text-secondary">
              <Flag className="h-3.5 w-3.5" />
              {detail.relatedReports.length}
            </span>
          </div>
          {detail.relatedReports.length === 0 ? (
            <p className="px-4 py-4 text-sm text-kampmax-text-secondary">
              No other reports were recorded against this target in the real store.
            </p>
          ) : (
            <ul className="divide-y divide-kampmax-border/70">
              {detail.relatedReports.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <SafetySourceBadge source={r.source} />
                  <span className="text-[13px] font-medium text-kampmax-text">
                    {r.reporterName}
                  </span>
                  <span className="rounded-full bg-kampmax-muted px-2 py-0.5 text-[11px] font-medium text-kampmax-text-secondary">
                    {r.reason}
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-kampmax-text-secondary/70">
                    {formatDate(r.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Right column */}
      <div className="space-y-4">
        {/* Reporter */}
        <section aria-label="Reporter" className="rounded-lg border border-kampmax-border bg-white">
          <div className="border-b border-kampmax-border px-4 py-3">
            <h2 className="text-sm font-semibold text-kampmax-text">Reporter</h2>
          </div>
          <div className="space-y-2.5 px-4 py-3.5">
            <p className="flex items-center gap-2 font-medium text-kampmax-text">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kampmax-muted text-xs font-semibold text-kampmax-text-secondary">
                {initials(detail.reporter.name)}
              </span>
              {detail.reporter.name}
              <span className="ml-auto font-mono text-[11px] font-normal text-kampmax-text-secondary">
                {detail.reporter.id ?? "guest"}
              </span>
            </p>
            {detail.reporter.campusName && (
              <p className="text-xs text-kampmax-text-secondary">
                {detail.reporter.campusName} campus
              </p>
            )}
            <p className="text-[11px] leading-relaxed text-kampmax-text-secondary">
              Reporter identity is visible to admins only — the public report flows never reveal it.
            </p>
          </div>
        </section>

        {detail.entity && <EntityCard detail={detail} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Evidence & details tab
// ------------------------------------------------------------

function EvidenceTab({ detail }: { detail: TrustSafetyReportDetail }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-kampmax-info/30 bg-kampmax-info/5 px-4 py-3 text-xs leading-relaxed text-kampmax-text-secondary">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-info" />
        <p>
          Read-only evidence. The report stores record the reported content, the reporter&apos;s
          reason and their details — never fabricated attachments or media. {getSourceEvidenceNote(detail)}
        </p>
      </div>

      <section aria-label="Reported content" className="rounded-lg border border-kampmax-border bg-white">
        <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
          <h2 className="text-sm font-semibold text-kampmax-text">Reported content</h2>
          <SafetyTargetTypeBadge type={detail.targetType} />
        </div>
        <div className="px-4 py-4">
          {detail.fullText ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-kampmax-text">
              {detail.fullText}
            </p>
          ) : (
            <p className="text-sm text-kampmax-text-secondary">
              The reported content is no longer available in the originating store
              (deleted target), so the full text cannot be shown.
            </p>
          )}
        </div>
      </section>

      {/* Images */}
      <section aria-label="Reported media" className="rounded-lg border border-kampmax-border bg-white">
        <div className="flex items-center gap-1.5 border-b border-kampmax-border px-4 py-3">
          <ImageIcon className="h-3.5 w-3.5 text-kampmax-text-secondary" />
          <h2 className="text-sm font-semibold text-kampmax-text">Attached media</h2>
          <span className="ml-auto rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-kampmax-text-secondary">
            {detail.images.length}
          </span>
        </div>
        {detail.images.length === 0 ? (
          <p className="px-4 py-4 text-sm text-kampmax-text-secondary">
            No media is attached to this report — the originating stores do not attach evidence
            files today.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2 px-4 py-3">
            {detail.images.map((img) => (
              <li key={img.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt ?? `Report evidence ${img.id}`}
                  className="h-20 w-20 rounded-md border border-kampmax-border object-cover"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function getSourceEvidenceNote(detail: TrustSafetyReportDetail): string {
  switch (detail.source) {
    case "review":
      return "Evidence here is the reported review and its comment.";
    case "campus_post":
      return "Evidence here is the reported campus post and its content.";
    default:
      return "";
  }
}

// ------------------------------------------------------------
// Moderation actions tab
// ------------------------------------------------------------

const RESOLUTION_STATUSES: { status: TrustSafetyResolutionStatus; icon: typeof Eye }[] = [
  { status: "reviewing", icon: Eye },
  { status: "resolved", icon: CheckCircle2 },
  { status: "dismissed", icon: XCircle },
];

function ActionsTab({
  detail,
  onResolve,
}: {
  detail: TrustSafetyReportDetail;
  onResolve: (status: TrustSafetyResolutionStatus) => void;
}) {
  const targetLinks: { label: string; href: string; note: string }[] = [];

  if (detail.adminHref) {
    targetLinks.push({
      label: `Open ${safetyTargetTypeLabel(detail.targetType)} in its console`,
      href: detail.adminHref,
      note: `Existing ${safetyTargetTypeLabel(detail.targetType)} admin console (Modules 35-40).`,
    });
  }
  targetLinks.push({
    label: `Open ${safetySourceLabel(detail.source)} source console`,
    href:
      detail.source === "campus_post"
        ? "/admin/campus"
        : "/admin/reviews",
    note:
      detail.source === "campus_post"
        ? "Campus Feed console (posts, comments, events)."
        : "Reviews & Moderation console — publish, hide, flag or remove the review.",
  });
  targetLinks.push({
    label: "Open reporter record",
    href: detail.reporter.id ? `/admin/users/${detail.reporter.id}` : "/admin/users",
    note: detail.reporter.id
      ? "User management console (Module 35) for the reporting user."
      : "The reporter is a guest with no user record; the users console shows all users.",
  });

  return (
    <div className="space-y-4">
      {detail.resolvable ? (
        <>
          <div className="flex items-start gap-2.5 rounded-lg border border-kampmax-info/30 bg-kampmax-info/5 px-4 py-3 text-xs leading-relaxed text-kampmax-text-secondary">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-info" />
            <p>
              This is a real campus-post report — moving it through review updates the actual
              moderation queue (open → reviewing → resolved/dismissed), audit-logged.
            </p>
          </div>
          <section aria-label="Move report status" className="rounded-lg border border-kampmax-border bg-white">
            <div className="border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">Move through review</h2>
            </div>
            <div className="flex flex-wrap gap-2 px-4 py-3.5">
              {RESOLUTION_STATUSES.filter((r) => r.status !== detail.status).map(({ status, icon: Icon }) => (
                <button
                  key={status}
                  onClick={() => onResolve(status)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
                    status === "resolved"
                      ? "border-kampmax-success/40 bg-white text-kampmax-success hover:bg-kampmax-success/5"
                      : status === "dismissed"
                        ? "border-kampmax-border bg-white text-kampmax-text hover:bg-kampmax-muted/60"
                        : "border-kampmax-warning/40 bg-white text-kampmax-warning hover:bg-kampmax-warning/5"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {safetyStatusLabel(status)}
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="flex items-start gap-2.5 rounded-lg border border-kampmax-info/30 bg-kampmax-info/5 px-4 py-3 text-xs leading-relaxed text-kampmax-text-secondary">
          <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-info" />
          <p>
            This report comes from a flagged review, which has no separate status of its own to
            move through here — resolve it by moderating the review itself (publish, hide or
            remove it) in the Reviews console, linked below. The review store also keeps only the
            single most recent report, so this entry disappears once the review is moderated away
            from flagged.
          </p>
        </div>
      )}

      <section aria-label="Related consoles" className="rounded-lg border border-kampmax-border bg-white">
        <div className="border-b border-kampmax-border px-4 py-3">
          <h2 className="text-sm font-semibold text-kampmax-text">Deep links</h2>
        </div>
        <ul className="divide-y divide-kampmax-border/70">
          {targetLinks.map((l) => (
            <li key={l.href} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <Link
                href={l.href}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {l.label}
              </Link>
              <span className="text-xs text-kampmax-text-secondary">{l.note}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ------------------------------------------------------------
// Shared pieces
// ------------------------------------------------------------

function EntityCard({ detail }: { detail: TrustSafetyReportDetail }) {
  const { entity } = detail;
  if (!entity) return null;
  return (
    <section aria-label="Reported entity" className="rounded-lg border border-kampmax-border bg-white">
      <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
        <h2 className="text-sm font-semibold text-kampmax-text">Reported entity</h2>
        <SafetyTargetTypeBadge type={entity.targetType} />
      </div>
      <div className="space-y-2.5 px-4 py-3.5">
        <p className="flex items-center gap-1.5 font-medium text-kampmax-text">
          {entity.name}
          {entity.verified && (
            <BadgeCheck aria-label="Verified" className="h-4 w-4 shrink-0 text-kampmax-success" />
          )}
          <span className="ml-auto font-mono text-[11px] font-normal text-kampmax-text-secondary">
            {entity.id}
          </span>
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {entity.href && (
            <a
              href={entity.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {entity.hrefLabel}
            </a>
          )}
          {entity.adminHref && (
            <Link
              href={entity.adminHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
            >
              <Handshake className="h-3.5 w-3.5" />
              Open in console
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
  capitalize,
}: {
  icon?: typeof Flag;
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-kampmax-text-secondary">
        <span className="inline-flex items-center gap-1">
          {Icon && <Icon className="h-3 w-3 opacity-60" />}
          {label}
        </span>
      </dt>
      <dd
        className={cn(
          "mt-0.5 break-all text-sm text-kampmax-text",
          capitalize && "capitalize",
          mono && "font-mono text-xs normal-case"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

function SafetyReportNotFound() {
  return (
    <div className="rounded-lg border border-kampmax-border bg-white p-4">
      <ErrorState
        title="Report not found"
        message="This report may have been removed or the link is incorrect. Only real report records are surfaced."
      />
      <div className="mt-3 text-center">
        <Link
          href="/admin/safety"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-kampmax-blue hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Trust &amp; Safety
        </Link>
      </div>
    </div>
  );
}