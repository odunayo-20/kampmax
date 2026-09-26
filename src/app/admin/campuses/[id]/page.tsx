"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  GraduationCap,
  Mail,
  MapPin,
  Package,
  Phone,
  Power,
  Pencil,
  ShieldCheck,
  ShieldPlus,
  ShoppingBag,
  Store,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { cn, formatNaira, formatNairaCompact, formatDate, timeAgo } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatCard } from "@/components/admin/StatCard";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { CampusAvatar, AdminAssignmentBadge, CampusStatusBadge } from "@/components/admin/campuses/CampusBadges";
import { CampusFormDialog } from "@/components/admin/campuses/CampusFormDialog";
import { CampusActivityTimeline } from "@/components/admin/campuses/CampusActivityTimeline";
import { campusManagementService } from "@/services/admin";
import type {
  CampusAdminInput,
  CampusCreateInput,
  ManagedCampusDetail,
} from "@/types/admin";

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

type DetailState =
  | { status: "loading" }
  | { status: "error"; notFound?: boolean }
  | { status: "ready"; data: ManagedCampusDetail };

export default function AdminCampusDetailPage() {
  const params = useParams<{ id: string }>();
  const campusId = typeof params.id === "string" ? params.id : "";

  const [detail, setDetail] = useState<DetailState>({ status: "loading" });
  const [states, setStates] = useState<string[]>([]);

  // ----- overlays -----
  const [editing, setEditing] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [confirmWorking, setConfirmWorking] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);

  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const loadDetail = useCallback(async () => {
    setDetail((prev) => (prev.status === "ready" ? prev : { status: "loading" }));
    try {
      const data = await campusManagementService.getById(campusId);
      if (!data) {
        setDetail({ status: "error", notFound: true });
        return;
      }
      setDetail({ status: "ready", data });
    } catch {
      setDetail({ status: "error" });
    }
  }, [campusId]);

  useEffect(() => {
    if (campusId) void loadDetail();
  }, [campusId, loadDetail]);

  useEffect(() => {
    campusManagementService
      .getStates()
      .then(setStates)
      .catch(() => undefined);
  }, []);

  function refresh(message?: string) {
    void loadDetail();
    if (message) pushToast("success", message);
  }

  async function saveForm(input: CampusCreateInput) {
    if (detail.status !== "ready") return;
    setSavingForm(true);
    try {
      await campusManagementService.update(detail.data.campus.id, input);
      setEditing(false);
      refresh(`${input.name} was updated.`);
    } catch {
      pushToast("error", "Couldn't save changes. Try again.");
    } finally {
      setSavingForm(false);
    }
  }

  async function activate() {
    if (detail.status !== "ready") return;
    try {
      await campusManagementService.setStatus(detail.data.campus.id, "active");
      refresh(`${detail.data.campus.name} is live - trading reopened.`);
    } catch {
      pushToast("error", "Couldn't activate the campus. Try again.");
    }
  }

  async function runDeactivate() {
    if (detail.status !== "ready") return;
    setConfirmWorking(true);
    try {
      await campusManagementService.setStatus(detail.data.campus.id, "inactive");
      refresh(`${detail.data.campus.name} was deactivated.`);
    } catch {
      pushToast("error", "The action failed. Try again.");
    } finally {
      setConfirmWorking(false);
      setDeactivating(false);
    }
  }

  // ----- render states -----

  if (!campusId || (detail.status === "error" && detail.notFound)) {
    return (
      <div className="rounded-lg border border-kampmax-border bg-white p-4">
        <ErrorState
          title="Campus not found"
          message="This campus may have been removed or the link is incorrect."
        />
        <div className="mt-3 text-center">
          <Link
            href="/admin/campuses"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-kampmax-blue hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to campuses
          </Link>
        </div>
      </div>
    );
  }

  if (detail.status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-10 w-72 animate-pulse rounded bg-kampmax-muted" />
        <LoadingSkeleton variant="cards" rows={4} />
        <div className="h-64 animate-pulse rounded-lg bg-white ring-1 ring-kampmax-border" />
      </div>
    );
  }

  if (detail.status === "error") {
    return <ErrorState onRetry={() => void loadDetail()} />;
  }

  const { campus, stats, activity } = detail.data;

  return (
    <>
      {/* Back link */}
      <Link
        href="/admin/campuses"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:text-kampmax-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All campuses
      </Link>

      <AdminPageHeader
        title={campus.name}
        description={`${campus.institution} · ${campus.city}, ${campus.state}`}
        actions={
          <>
            <CampusStatusBadge status={campus.status} />
            {campus.status === "active" ? (
              <button
                type="button"
                onClick={() => setDeactivating(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
              >
                <Power className="h-3.5 w-3.5" />
                Deactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void activate()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-success/40 bg-white px-3 text-sm font-medium text-kampmax-success transition-colors hover:bg-kampmax-success/5"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Activate
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          </>
        }
      />

      {/* ---------- Overview stats ---------- */}
      <section aria-label="Campus overview" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total students" value={stats.totalStudents.toLocaleString("en-NG")} icon={GraduationCap} tone="blue" hint="Enrolled institution-wide" />
        <StatCard label="Platform users" value={stats.totalUsers.toLocaleString("en-NG")} icon={Users} tone="blue" hint="Registered on Kampmax" />
        <StatCard label="Active users" value={stats.activeUsers.toLocaleString("en-NG")} icon={BadgeCheck} tone="success" hint={`${Math.round((stats.activeUsers / Math.max(stats.totalUsers, 1)) * 100)}% of registered`} />
        <StatCard label="Vendors" value={stats.vendors.toLocaleString("en-NG")} icon={Store} tone="gold" />
        <StatCard label="Products" value={stats.products.toLocaleString("en-NG")} icon={Package} />
        <StatCard label="Orders" value={stats.orders.toLocaleString("en-NG")} icon={ShoppingBag} />
        <StatCard label="Revenue (lifetime)" value={formatNairaCompact(stats.revenue)} icon={Wallet} tone="gold" className="md:col-span-2 xl:col-span-2" />
        <StatCard label="Campus admins" value={String(stats.adminsCount)} icon={ShieldPlus} tone={stats.adminsCount > 0 ? "default" : "warning"} hint={stats.adminsCount > 0 ? "Assigned to this campus" : "No admin assigned"} />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ---------- Left column ---------- */}
        <div className="space-y-4 lg:col-span-2">
          {/* Campus overview card */}
          <section aria-label="Campus profile" className="rounded-lg border border-kampmax-border bg-white">
            <div className="border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">Campus overview</h2>
            </div>
            <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row">
              <CampusAvatar campus={campus} size="xl" />
              <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <InfoRow icon={Building2} label="Institution" value={campus.institution} />
                <InfoRow icon={MapPin} label="Address" value={campus.address || "—"} />
                <InfoRow label="State" value={campus.state} />
                <InfoRow label="City" value={campus.city} />
                <InfoRow label="Date added" value={`${timeAgo(campus.createdAt)} · ${formatDate(campus.createdAt)}`} />
                <InfoRow label="Campus ID" value={campus.id} mono />
              </dl>
            </div>
            {campus.description && (
              <div className="border-t border-kampmax-border px-4 py-3">
                <dt className="text-xs font-medium text-kampmax-text-secondary">Description</dt>
                <dd className="mt-1 text-sm leading-relaxed text-kampmax-text">{campus.description}</dd>
              </div>
            )}
          </section>

          {/* Recent activity */}
          <section aria-label="Recent activity" className="rounded-lg border border-kampmax-border bg-white">
            <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">Recent activity</h2>
              <span className="text-xs tabular-nums text-kampmax-text-secondary">
                {activity.length} events
              </span>
            </div>
            <div className="px-4 py-4">
              <CampusActivityTimeline events={activity.slice(0, 8)} />
            </div>
          </section>
        </div>

        {/* ---------- Right column ---------- */}
        <div className="space-y-4">
          {/* Campus admins card */}
          <section aria-label="Campus admins" className="rounded-lg border border-kampmax-border bg-white">
            <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">Campus admins</h2>
              <span className="rounded-full bg-kampmax-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-kampmax-text-secondary">
                {campus.admins.length}
              </span>
            </div>

            {campus.admins.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-kampmax-text-secondary">
                  No campus admin assigned yet.
                </p>
                <p className="mx-auto mt-1 max-w-[240px] text-xs text-kampmax-text-secondary">
                  Escalations currently route to platform admins.
                </p>
              </div>
            ) : (
              <ul role="list" className="divide-y divide-kampmax-border/70">
                {campus.admins.map((admin) => (
                  <li key={admin.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-kampmax-text">
                        {admin.name}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-kampmax-text-secondary">
                        <Mail className="h-3 w-3 shrink-0 opacity-60" />
                        {admin.email}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs tabular-nums text-kampmax-text-secondary">
                        <Phone className="h-3 w-3 shrink-0 opacity-60" />
                        {admin.phone}
                      </p>
                      <p className="mt-1.5">
                        <AdminAssignmentBadge status={admin.status} />
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="border-t border-kampmax-border px-4 py-3 text-xs text-kampmax-text-secondary">
              Campus admins are administrators scoped to this campus. Manage who holds the role from the Users console.
            </p>
          </section>

          {/* Commerce snapshot card */}
          <section aria-label="Commerce snapshot" className="rounded-lg border border-kampmax-border bg-white">
            <div className="border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">Commerce snapshot</h2>
            </div>
            <dl className="divide-y divide-kampmax-border/70">
              <SnapshotRow label="Lifetime orders" value={stats.orders.toLocaleString("en-NG")} />
              <SnapshotRow label="Lifetime revenue" value={formatNaira(stats.revenue)} />
              <SnapshotRow
                label="Avg. order value"
                value={formatNaira(Math.round(stats.revenue / Math.max(stats.orders, 1)))}
              />
              <SnapshotRow label="Listings per vendor" value={(stats.products / Math.max(stats.vendors, 1)).toFixed(1)} />
              <SnapshotRow
                label="Activation rate"
                value={`${Math.round((stats.activeUsers / Math.max(stats.totalUsers, 1)) * 100)}%`}
              />
            </dl>
          </section>
        </div>
      </div>

      {/* ---------- Overlays ---------- */}

      <CampusFormDialog
        open={editing}
        campus={campus}
        states={states}
        saving={savingForm}
        onClose={() => !savingForm && setEditing(false)}
        onSave={saveForm}
      />

      <ConfirmDialog
        open={deactivating}
        title={`Deactivate ${campus.name}?`}
        message="Listings stay intact but the marketplace pauses: students can't place orders and vendors can't receive new ones until the campus is reactivated."
        confirmLabel="Deactivate campus"
        tone="warning"
        loading={confirmWorking}
        onConfirm={runDeactivate}
        onCancel={() => !confirmWorking && setDeactivating(false)}
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
// Small building blocks
// ------------------------------------------------------------

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon?: typeof Building2;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-kampmax-text-secondary">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 flex items-center gap-1.5 truncate text-sm font-medium text-kampmax-text",
          mono && "font-mono text-[13px]"
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-50" />}
        <span className="truncate">{value}</span>
      </dd>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="text-xs text-kampmax-text-secondary">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-kampmax-text">{value}</dd>
    </div>
  );
}
