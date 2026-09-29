"use client";

// ============================================================
// ADMIN SECURITY CENTER (Module 51)
// ============================================================
//
// Operational console for full operators (SUPER_ADMIN/ADMIN only)
// over the Module 48 audit trail — the prototype's single
// backend-authoritative security record. Three tabs:
//
//   1. Overview            - authoritative metrics + honest coverage
//   2. Security events     - backend-classified security subset
//   3. Privileged activity - all privileged admin activity
//
// Contract (see MODULE-51-REPORT.md / MODULE-51-BACKEND-GAPS.md):
//   - NO fabricated security telemetry. Anything not produced by the
//     backend is absent or shown as "not provided" (never zeros).
//   - NO invented permissions: access reuses nav authorization
//     (structured as `canAccessSecurityCenter`, ROUTE_NAV_ACCESS).
//   - NO mutations: the backend has no session/revocation API, so the
//     console is evidence-only. Detail rows deep-link to the audit
//     console (authoritative) or Trust & Safety.
//   - Filter terms live in component state only (not the URL) so
//     sensitive search strings are never persisted; the active tab is
//     URL-synced as a harmless navigational value.
// ============================================================

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Database,
  EyeOff,
  Fingerprint,
  Loader2,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { AuditLogsTable } from "@/components/admin/audit-logs/AuditLogsTable";
import { AuditLogMetrics } from "@/components/admin/audit-logs/AuditLogMetrics";
import {
  AuditLogFilters,
  DEFAULT_AUDIT_FILTERS,
  auditQueryFromFilter,
  hasAuditFilters,
  type AuditFilterState,
} from "@/components/admin/audit-logs/AuditLogFilters";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { ErrorState } from "@/components/admin/ErrorState";
import {
  useAdminAuditActors,
  useAdminAuditChainVerify,
} from "@/hooks/admin/use-admin-audit-trail";
import {
  useAdminSecurityEvents,
  useAdminSecurityMetrics,
} from "@/hooks/admin/use-admin-security";
import { useDebounce } from "@/hooks/use-debounce";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { canAccessSecurityCenter } from "@/lib/admin/security-access";
import { cn } from "@/lib/utils";
import type { ManagedAuditLogEntry } from "@/types/admin";

const PAGE_SIZE = 15;

type SecurityTab = "overview" | "security" | "privileged";

const TAB_LABELS: Record<SecurityTab, string> = {
  overview: "Overview",
  security: "Security events",
  privileged: "Privileged activity",
};

export default function AdminSecurityPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" rows={8} />}>
      <SecurityCenter />
    </Suspense>
  );
}

function readTab(params: URLSearchParams): SecurityTab {
  const tab = params.get("tab");
  return tab === "security" || tab === "privileged" ? tab : "overview";
}

function SecurityCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { admin } = useAdminSession();

  const tab = readTab(searchParams);

  function setTab(next: SecurityTab) {
    router.replace(next === "overview" ? "/admin/security" : `/admin/security?tab=${next}`, {
      scroll: false,
    });
  }

  if (!admin || !canAccessSecurityCenter(admin.role)) {
    return (
      <>
        <AdminPageHeader
          title="Security Center"
          description="Platform-wide security operation view. Visible to Super Admins and platform Admins only."
        />
        <div className="mt-4">
          <ErrorState
            title="Restricted area"
            message="Your role doesn't have permission to open the Security Center. Contact a Super Admin if you believe this is wrong."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Security Center"
        description="Backend-authoritative evidence of privileged admin activity from the audit store. Read-only — no fabricated security telemetry."
        actions={
          <Link
            href="/admin/audit-logs"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text hover:bg-kampmax-muted/60"
          >
            <ScrollText className="h-3.5 w-3.5" aria-hidden />
            Full audit log
          </Link>
        }
      />

      <div className="my-3 flex gap-1 border-b border-kampmax-border">
        {(Object.keys(TAB_LABELS) as SecurityTab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 px-3 text-[13px] font-medium transition-colors",
              tab === key
                ? "border-kampmax-blue text-kampmax-blue"
                : "border-transparent text-kampmax-text-secondary hover:border-kampmax-border/70 hover:text-kampmax-text"
            )}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewPanel />}
      {tab === "security" && <SecurityEventsList scope="security" />}
      {tab === "privileged" && <SecurityEventsList scope="privileged" />}
    </>
  );
}

// ------------------------------------------------------------
// OVERVIEW TAB
// ------------------------------------------------------------

function OverviewPanel() {
  const metrics = useAdminSecurityMetrics();

  return (
    <div className="space-y-3">
      <AuditLogMetrics metrics={metrics.data} loading={metrics.isLoading} />

      <ChainIntegrityCard />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="rounded-lg border border-kampmax-border bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-kampmax-text">
            <ShieldCheck className="h-4 w-4 text-kampmax-success" aria-hidden />
            Provided by the backend
          </h2>
          <ul className="mt-3 space-y-2 text-[13px] leading-snug text-kampmax-text-secondary">
            <li className="flex gap-2">
              <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kampmax-blue" aria-hidden />
              Immutable, SHA-256 hash-chained audit events for every privileged admin action, with
              backend-computed severity and result.
            </li>
            <li className="flex gap-2">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kampmax-error" aria-hidden />
              A backend-classified security subset — real login attempts (succeeded and failed)
              plus account-access changes (suspensions, deactivations, state resets).
            </li>
            <li className="flex gap-2">
              <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kampmax-blue" aria-hidden />
              Actor identities and time range for every recorded event.
            </li>
          </ul>
        </section>

        <section className="rounded-lg border border-kampmax-border bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-kampmax-text">
            <EyeOff className="h-4 w-4 text-kampmax-text-secondary" aria-hidden />
            Not yet provided by the backend
          </h2>
          <p className="mt-2 text-[13px] text-kampmax-text-secondary">
            These surfaces do not exist in the backend and are deliberately omitted here rather
            than shown as zeroes or fabricated.
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-[12px] leading-snug text-kampmax-text-secondary sm:grid-cols-2">
            {[
              "Session inventory & revocation",
              "IP & device fingerprinting",
              "Risk scores & suspicious activity",
              "Security alerts & incidents",
              "Rate-limit / MFA events",
            ].map((label) => (
              <li key={label} className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <OverviewLink
          href="/admin/security?tab=security"
          title="Security events"
          description="Suspensions, deactivations and state resets recorded by the audit backend."
          icon={ShieldAlert}
        />
        <OverviewLink
          href="/admin/audit-logs"
          title="Full audit log"
          description="Every privileged admin action with backend-assigned severity and result."
          icon={ScrollText}
        />
        <OverviewLink
          href="/admin/safety"
          title="Trust & Safety"
          description="User-level safety cases and moderation workflows (Module 42)."
          icon={Users}
        />
      </div>
    </div>
  );
}

/** Recomputes the real SHA-256 hash chain on demand — genuine tamper-evidence, not a simulated check. */
function ChainIntegrityCard() {
  const verify = useAdminAuditChainVerify();

  return (
    <section className="rounded-lg border border-kampmax-border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-kampmax-blue" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold text-kampmax-text">Hash-chain integrity</h2>
            <p className="text-xs text-kampmax-text-secondary">
              Recomputes the SHA-256 chain across every audit row and reports the first tampered
              entry, if any.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void verify.refetch()}
          disabled={verify.isFetching}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-60"
        >
          {verify.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {verify.isFetching ? "Verifying…" : "Verify now"}
        </button>
      </div>

      {verify.data && (
        <div
          className={cn(
            "mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
            verify.data.valid
              ? "border-kampmax-success/30 bg-kampmax-success/5 text-kampmax-success"
              : "border-kampmax-error/30 bg-kampmax-error/5 text-kampmax-error"
          )}
        >
          {verify.data.valid ? (
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          {verify.data.valid
            ? `Chain intact across ${verify.data.checked.toLocaleString("en-NG")} entries.`
            : `Chain broken at entry ${verify.data.brokenAtId}.`}
          {verify.data.legacyRows > 0 && (
            <span className="text-kampmax-text-secondary">
              ({verify.data.legacyRows} legacy row{verify.data.legacyRows === 1 ? "" : "s"} predate
              hashing)
            </span>
          )}
        </div>
      )}

      {verify.isError && (
        <p className="mt-3 text-xs text-kampmax-error">Couldn&apos;t verify the chain. Try again.</p>
      )}
    </section>
  );
}

function OverviewLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-1 items-center gap-3 rounded-lg border border-kampmax-border bg-white p-4 transition-colors hover:bg-kampmax-muted/40"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kampmax-blue/10">
        <Icon className="h-5 w-5 text-kampmax-blue" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-kampmax-text">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-kampmax-text-secondary">
          {description}
        </span>
      </span>
      <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-kampmax-text-secondary transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

// ------------------------------------------------------------
// EVENT LIST TABS (Security events / Privileged activity)
// ------------------------------------------------------------

function SecurityEventsList({ scope }: { scope: "security" | "privileged" }) {
  const router = useRouter();
  const [filters, setFilters] = useState<AuditFilterState>(() =>
    scope === "privileged"
      ? { ...DEFAULT_AUDIT_FILTERS, severity: "high" }
      : { ...DEFAULT_AUDIT_FILTERS }
  );
  const debouncedSearch = useDebounce(filters.search.trim(), 350);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    filters.action,
    filters.resourceType,
    filters.result,
    filters.severity,
    filters.actorId,
    filters.dateFrom,
    filters.dateTo,
  ]);

  const baseQuery = useMemo(
    () => ({
      ...auditQueryFromFilter({ ...filters, search: debouncedSearch }),
      securityOnly: scope === "security",
      sortBy: "at" as const,
      sortDir: "desc" as const,
    }),
    [filters, debouncedSearch, scope]
  );

  const listQuery = useMemo(
    () => ({ ...baseQuery, page, pageSize: PAGE_SIZE }),
    [baseQuery, page]
  );

  const events = useAdminSecurityEvents(listQuery);
  const actors = useAdminAuditActors();

  const hasActiveFilters = hasAuditFilters({ ...filters, search: debouncedSearch });

  function clearFilters() {
    setFilters({ ...DEFAULT_AUDIT_FILTERS });
    setPage(1);
  }

  function openEvent(event: ManagedAuditLogEntry) {
    router.push(`/admin/audit-logs/${event.id}`);
  }

  const listHeading =
    scope === "security"
      ? "Backend-classified security events"
      : "All privileged admin activity (defaults to high severity)";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Fingerprint className="h-4 w-4 text-kampmax-text-secondary" aria-hidden />
        <p className="text-[13px] text-kampmax-text-secondary">{listHeading}</p>
      </div>

      <AuditLogFilters
        state={filters}
        actors={actors.data ?? []}
        actorsLoading={actors.isLoading}
        onChange={(next) => setFilters(next)}
        onReset={clearFilters}
      />

      <AuditLogsTable
        items={events.data?.items ?? []}
        loading={events.isLoading}
        error={events.isError}
        hasActiveFilters={hasActiveFilters}
        onRetry={() => void events.refetch()}
        onClearFilters={clearFilters}
        onView={openEvent}
      />

      {events.data && events.data.totalPages > 1 && (
        <Pagination
          page={events.data.page}
          pageSize={events.data.pageSize}
          total={events.data.total}
          totalPages={events.data.totalPages}
          onPageChange={setPage}
          className="mt-3 rounded-lg border border-kampmax-border bg-white"
          unitLabel="events"
        />
      )}
    </div>
  );
}