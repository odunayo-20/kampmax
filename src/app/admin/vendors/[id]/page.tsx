"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BadgeX,
  Building2,
  CheckCircle2,
  CircleDashed,
  Clock,
  FileWarning,
  Mail,
  MapPin,
  Package,
  Phone,
  Power,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
  ShoppingBag,
  Star,
  Store,
  Tag,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { cn, formatDateTime, formatNaira, formatNairaCompact, formatDate, timeAgo } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { StatCard } from "@/components/admin/StatCard";
import {
  orderStatusVariant,
  paymentStatusVariant,
  disputeStatusVariant,
  priorityVariant,
  productStatusVariant,
  reviewStatusVariant,
} from "@/components/admin/StatusBadge";
import {
  StoreAvatar,
  StoreStatusBadge,
  VerificationBadge,
} from "@/components/admin/vendors/VendorBadges";
import { VerificationReviewDialog } from "@/components/admin/vendors/VerificationReviewDialog";
import { VendorActivityTimeline } from "@/components/admin/vendors/VendorActivityTimeline";
import { getVendorActionAvailability } from "@/components/admin/vendors/vendors-meta";
import {
  useAdminVendor,
  useAdminVendorActivateMutation,
  useAdminVendorApproveMutation,
  useAdminVendorDeactivateMutation,
  useAdminVendorDocumentReviewMutation,
  useAdminVendorRejectMutation,
  useAdminVendorSuspendMutation,
} from "@/hooks/admin/use-admin-vendors";
import { useActionGuard } from "@/hooks/admin/use-action-guard";
import type { ManagedVendorDetail } from "@/types/admin";

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

type DetailTab =
  | "overview"
  | "products"
  | "orders"
  | "reviews"
  | "complaints"
  | "activity";

const TABS: { key: DetailTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "products", label: "Products" },
  { key: "orders", label: "Orders" },
  { key: "reviews", label: "Reviews" },
  { key: "complaints", label: "Complaints" },
  { key: "activity", label: "Activity" },
];

export default function AdminVendorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const vendorId = typeof params.id === "string" ? params.id : "";

  const [tab, setTab] = useState<DetailTab>("overview");

  // ----- overlays -----
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [confirmWorking, setConfirmWorking] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);
  const { runExclusive } = useActionGuard();

  // ----- data hooks (always called at top level) -----
  const { data: detail, isPending, isError, refetch } = useAdminVendor(vendorId);
  const approveMut = useAdminVendorApproveMutation();
  const docReviewMut = useAdminVendorDocumentReviewMutation();
  const rejectMut = useAdminVendorRejectMutation();
  const activateMut = useAdminVendorActivateMutation();
  const suspendMut = useAdminVendorSuspendMutation();
  const deactivateMut = useAdminVendorDeactivateMutation();

  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  function refresh(message?: string) {
    void refetch();
    if (message) pushToast("success", message);
  }

  async function approve() {
    await runExclusive(`vendor:approve:${vendorId}`, async () => {
      await approveMut.mutateAsync(vendorId);
      refresh(`${detail?.vendor.storeName} verified - storefront is live.`);
    }).catch((err: unknown) => {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Couldn't approve the vendor. Try again."
      );
    });
  }

  async function reject(reason: string) {
    await runExclusive(`vendor:reject:${vendorId}`, async () => {
      await rejectMut.mutateAsync({ id: vendorId, reason });
      refresh("Application rejected - the owner has been notified.");
    }).catch(() => {
      pushToast("error", "Couldn't reject the application. Try again.");
    });
  }

  async function activate() {
    await runExclusive(`vendor:activate:${vendorId}`, async () => {
      await activateMut.mutateAsync(vendorId);
      refresh(`${detail?.vendor.storeName} is trading again.`);
    }).catch((err: unknown) => {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Couldn't activate the store. Try again."
      );
    });
  }

  async function runSuspend(reason: string) {
    setConfirmWorking(true);
    try {
      await suspendMut.mutateAsync({ id: vendorId, reason });
      refresh(`${detail?.vendor.storeName} was suspended.`);
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "The action failed. Try again.");
    } finally {
      setConfirmWorking(false);
      setSuspendOpen(false);
    }
  }

  async function runDeactivate() {
    setConfirmWorking(true);
    try {
      await deactivateMut.mutateAsync(vendorId);
      refresh(`${detail?.vendor.storeName} was deactivated.`);
    } catch {
      pushToast("error", "The action failed. Try again.");
    } finally {
      setConfirmWorking(false);
      setDeactivateOpen(false);
    }
  }

  // ----- render guards -----

  if (!vendorId) {
    return <VendorNotFound />;
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
    return <VendorNotFound />;
  }

  const { vendor, campus, earnings } = detail;
  const availability = getVendorActionAvailability(vendor);

  const counts: Record<DetailTab, number> = {
    overview: 0,
    products: detail.products.length,
    orders: detail.orders.length,
    reviews: detail.reviews.length,
    complaints: detail.complaints.length,
    activity: detail.activity.length,
  };

  return (
    <>
      {/* Back link */}
      <Link
        href="/admin/vendors"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:text-kampmax-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All vendors
      </Link>

      <AdminPageHeader
        title={vendor.storeName}
        description={`${vendor.category} · ${campus?.shortName ?? vendor.campusId} · joined ${vendor.registeredAt ? formatDate(vendor.registeredAt) : "—"}`}
        actions={
          <>
            <VerificationBadge status={vendor.verificationStatus} />
            <StoreStatusBadge status={vendor.storeStatus} />
            {availability.canApprove && (
              <button
                type="button"
                onClick={() => void approve()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-success px-3 text-sm font-medium text-white transition-colors hover:bg-kampmax-success/90"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Approve
              </button>
            )}
            {availability.canReviewVerification && (
              <button
                type="button"
                onClick={() => setVerificationOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
              >
                <ShieldQuestion className="h-3.5 w-3.5" />
                Review verification info
              </button>
            )}
            {availability.canActivate && (
              <button
                type="button"
                onClick={() => void activate()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-success/40 bg-white px-3 text-sm font-medium text-kampmax-success transition-colors hover:bg-kampmax-success/5"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Activate
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
            {availability.canDeactivate && (
              <button
                type="button"
                onClick={() => setDeactivateOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
              >
                <Power className="h-3.5 w-3.5" />
                Deactivate
              </button>
            )}
          </>
        }
      />

      {/* ---------- Overview stats ---------- */}
      <section aria-label="Vendor metrics" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Products" value={vendor.productsCount.toLocaleString("en-NG")} icon={Package} tone="blue" hint="Live listings" />
        <StatCard label="Orders" value={vendor.ordersCount.toLocaleString("en-NG")} icon={ShoppingBag} tone="blue" hint={vendor.fulfillmentRate === null ? "—" : `${Math.round(vendor.fulfillmentRate)}% fulfilment`} />
        <StatCard label="Sales (lifetime)" value={vendor.totalSales === null ? "—" : formatNairaCompact(vendor.totalSales)} icon={Wallet} tone="gold" hint={`GMV through ${campus?.shortName ?? vendor.campusId}`} />
        <StatCard label="Net earnings" value={earnings.netEarnings === null ? "—" : formatNairaCompact(earnings.netEarnings)} icon={Wallet} tone="success" hint={`${Math.round((1 - earnings.commissionRate) * 100)}% after commission`} />
        <StatCard label="Rating" value={`${vendor.rating.toFixed(1)} / 5`} icon={Star} tone="gold" hint={`${vendor.reviewsCount.toLocaleString("en-NG")} reviews`} />
        <StatCard label="Complaints" value={vendor.complaintsCount.toLocaleString("en-NG")} icon={FileWarning} tone={vendor.complaintsCount > 3 ? "error" : "default"} hint="Lifetime disputes opened" />
      </section>

      {/* ---------- Tabs ---------- */}
      <div
        role="tablist"
        aria-label="Vendor profile sections"
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
            {counts[t.key] > 0 && (
              <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-kampmax-text-secondary">
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4" role="tabpanel">
        {tab === "overview" && (
          <OverviewTab
            detail={detail}
            campusName={campus?.name ?? null}
            onOpenCampus={() =>
              campus && router.push(`/admin/campuses/${campus.id}`)
            }
          />
        )}
        {tab === "products" && <ProductsTab detail={detail} />}
        {tab === "orders" && <OrdersTab detail={detail} />}
        {tab === "reviews" && <ReviewsTab detail={detail} />}
        {tab === "complaints" && <ComplaintsTab detail={detail} />}
        {tab === "activity" && (
          <section aria-label="Vendor activity" className="rounded-lg border border-kampmax-border bg-white px-4 py-4">
            <VendorActivityTimeline events={detail.activity} />
          </section>
        )}
      </div>

      {/* ---------- Overlays ---------- */}

      <VerificationReviewDialog
        open={verificationOpen}
        vendor={vendor}
        mode={vendor.verificationStatus === "pending_verification" ? "review" : "read"}
        onClose={() => setVerificationOpen(false)}
        onApprove={async () => {
          setVerificationOpen(false);
          await approve();
        }}
        onReject={async (_v, reason) => {
          setVerificationOpen(false);
          await reject(reason);
        }}
        onReviewDocument={async (v, doc, decision, reason) => {
          try {
            await docReviewMut.mutateAsync({
              vendorId: v.id,
              documentId: doc.id,
              decision,
              reason,
            });
            pushToast(
              "success",
              decision === "approve" ? `${doc.label} approved.` : `${doc.label} rejected.`
            );
          } catch (err) {
            pushToast(
              "error",
              err instanceof Error ? err.message : "Couldn't review the document."
            );
          }
        }}
      />

      <ConfirmDialog
        open={suspendOpen}
        title={`Suspend ${vendor.storeName}?`}
        message="All listings are hidden and checkout is blocked immediately. The owner keeps account access and can appeal, but buyers can no longer place orders."
        confirmLabel="Suspend store"
        tone="warning"
        reasonLabel="Reason for suspension (recorded in the audit log)"
        loading={confirmWorking}
        onConfirm={runSuspend}
        onCancel={() => setSuspendOpen(false)}
      />

      <ConfirmDialog
        open={deactivateOpen}
        title={`Deactivate ${vendor.storeName}?`}
        message="The storefront goes offline for everyone. Unlike suspension this is a permanent off-switch - reactivation requires an explicit admin decision."
        confirmLabel="Deactivate store"
        tone="danger"
        loading={confirmWorking}
        onConfirm={runDeactivate}
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
// Overview tab
// ------------------------------------------------------------

function OverviewTab({
  detail,
  campusName,
  onOpenCampus,
}: {
  detail: ManagedVendorDetail;
  campusName: string | null;
  onOpenCampus: () => void;
}) {
  const { vendor, earnings } = detail;
  const v = vendor.verification;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Left column: store + owner */}
      <div className="space-y-4 lg:col-span-2">
        {/* Store information */}
        <section aria-label="Store information" className="rounded-lg border border-kampmax-border bg-white">
          <div className="border-b border-kampmax-border px-4 py-3">
            <h2 className="text-sm font-semibold text-kampmax-text">Store information</h2>
          </div>
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row">
            <StoreAvatar vendor={vendor} size="xl" />
            <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <InfoRow icon={Tag} label="Category" value={vendor.category} />
              <InfoRow
                icon={Building2}
                label="Campus"
                value={campusName ?? vendor.campusId}
                onClick={onOpenCampus}
              />
              <InfoRow label="Registered" value={vendor.registeredAt ? `${timeAgo(vendor.registeredAt)} · ${formatDate(vendor.registeredAt)}` : "—"} />
              <InfoRow label="Last active" value={timeAgo(vendor.lastActiveAt)} />
              <InfoRow label="Fulfilment rate" value={vendor.fulfillmentRate === null ? "—" : `${Math.round(vendor.fulfillmentRate)}% of orders delivered`} />
              <InfoRow label="Store ID" value={vendor.id} mono />
            </dl>
          </div>
          <div className="border-t border-kampmax-border px-4 py-3">
            <dt className="text-xs font-medium text-kampmax-text-secondary">Description</dt>
            <dd className="mt-1 text-sm leading-relaxed text-kampmax-text">
              “{vendor.description}”
            </dd>
          </div>
        </section>

        {/* Owner information */}
        <section aria-label="Owner information" className="rounded-lg border border-kampmax-border bg-white">
          <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
            <h2 className="text-sm font-semibold text-kampmax-text">Owner</h2>
            {vendor.owner.isIdVerified ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-kampmax-success">
                <BadgeCheck className="h-3.5 w-3.5" />
                ID verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                <BadgeX className="h-3.5 w-3.5" />
                ID not verified
              </span>
            )}
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
            <InfoRow icon={UserRound} label="Full name" value={vendor.owner.name} />
            <InfoRow label="Owner ID" value={vendor.owner.id} mono />
            <InfoRow
              icon={Mail}
              label="Email"
              value={vendor.owner.email || "—"}
              href={vendor.owner.email ? `mailto:${vendor.owner.email}` : undefined}
            />
            <InfoRow
              icon={Phone}
              label="Phone"
              value={vendor.owner.phone || "—"}
              href={vendor.owner.phone ? `tel:${vendor.owner.phone.replace(/\s+/g, "")}` : undefined}
            />
            <InfoRow label="Joined Kampmax" value={vendor.owner.joinedAt ? formatDate(vendor.owner.joinedAt) : "—"} />
            <InfoRow
              label="As a buyer"
              value={`${vendor.owner.ordersCount.toLocaleString("en-NG")} orders · ${formatNaira(vendor.owner.totalSpent)}`}
            />
          </dl>
        </section>
      </div>

      {/* Right column: verification + earnings */}
      <div className="space-y-4">
        {/* Verification dossier */}
        <section aria-label="Verification" className="rounded-lg border border-kampmax-border bg-white">
          <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
            <h2 className="text-sm font-semibold text-kampmax-text">Verification</h2>
            <VerificationBadge status={vendor.verificationStatus} />
          </div>
          <div className="space-y-2 px-4 py-3">
            <div className="grid grid-cols-3 gap-1.5">
              <MiniCheck label="Email" ok={v.emailVerified} />
              <MiniCheck label="Phone" ok={v.phoneVerified} />
              {v.bvnVerified !== null && <MiniCheck label="BVN" ok={v.bvnVerified} />}
            </div>

            <ul role="list" className="divide-y divide-kampmax-border/70 rounded-md border border-kampmax-border/70">
              {v.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                  <span className="truncate text-xs font-medium text-kampmax-text">
                    {doc.label}
                  </span>
                  <DocStateChip state={doc.state} />
                </li>
              ))}
            </ul>

            {v.reviewedBy && (
              <p className="text-xs leading-relaxed text-kampmax-text-secondary">
                {v.rejectionReason ? "Rejected" : "Approved"} by{" "}
                <span className="font-medium text-kampmax-text">{v.reviewedBy}</span> ·{" "}
                {formatDate(v.reviewedAt!)}
              </p>
            )}
            {v.rejectionReason && (
              <p className="rounded-md border border-kampmax-error/30 bg-kampmax-error/5 px-2.5 py-2 text-xs leading-relaxed text-kampmax-text-secondary">
                “{v.rejectionReason}”
              </p>
            )}
            <p className="text-[11px] text-kampmax-text-secondary">
              Submitted{" "}
              {v.submittedAt ? `${timeAgo(v.submittedAt)} (${formatDate(v.submittedAt)})` : "—"}
            </p>
          </div>
        </section>

        {/* Sales & earnings */}
        <section aria-label="Earnings summary" className="rounded-lg border border-kampmax-border bg-white">
          <div className="border-b border-kampmax-border px-4 py-3">
            <h2 className="text-sm font-semibold text-kampmax-text">Sales & earnings</h2>
          </div>
          <dl className="divide-y divide-kampmax-border/70 px-4 py-1">
            <MoneyRow label="Gross sales (GMV)" value={earnings.grossSales === null ? "—" : formatNaira(earnings.grossSales)} />
            <MoneyRow
              label={`Commission (${Math.round(earnings.commissionRate * 100)}%)`}
              value={earnings.commissionPaid === null ? "—" : `− ${formatNaira(earnings.commissionPaid)}`}
              muted
            />
            <MoneyRow label="Net earnings" value={earnings.netEarnings === null ? "—" : formatNaira(earnings.netEarnings)} strong />
            <MoneyRow label="Pending payout (wallet)" value={earnings.pendingPayout === null ? "—" : formatNaira(earnings.pendingPayout)} />
            <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <dt className="text-kampmax-text-secondary">Last payout</dt>
              <dd className="font-medium text-kampmax-text">
                {earnings.lastPayoutAt
                  ? `${timeAgo(earnings.lastPayoutAt)} · ${formatDate(earnings.lastPayoutAt)}`
                  : "No payouts yet"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

function MiniCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2 py-1.5",
        ok
          ? "border-kampmax-success/30 bg-kampmax-success/5 text-kampmax-success"
          : "border-kampmax-warning/40 bg-kampmax-warning/10 text-amber-700"
      )}
    >
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <CircleDashed className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="truncate text-[11px] font-medium">{label}</span>
    </div>
  );
}

const DOC_CHIP_STYLES = {
  approved: "bg-kampmax-success/10 text-kampmax-success",
  submitted: "bg-kampmax-info/10 text-kampmax-info",
  rejected: "bg-kampmax-error/10 text-kampmax-error",
  missing: "bg-kampmax-muted text-kampmax-text-secondary",
} as const;

function DocStateChip({ state }: { state: string }) {
  return (
    <span
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        DOC_CHIP_STYLES[state as keyof typeof DOC_CHIP_STYLES] ?? DOC_CHIP_STYLES.missing
      )}
    >
      {state}
    </span>
  );
}

// ------------------------------------------------------------
// Products / Orders / Reviews / Complaints tabs
// ------------------------------------------------------------

function ProductsTab({ detail }: { detail: ManagedVendorDetail }) {
  const products = detail.products;
  if (products.length === 0) {
    return <TabEmpty label="products" />;
  }
  return (
    <section aria-label="Product listings" className="overflow-hidden rounded-lg border border-kampmax-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-kampmax-border bg-kampmax-muted/50 text-left text-xs uppercase tracking-wide text-kampmax-text-secondary">
              <Th>Product</Th>
              <Th>Price</Th>
              <Th>Stock</Th>
              <Th>Sold</Th>
              <Th>Status</Th>
              <Th>Listed</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kampmax-border/70">
            {products.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-kampmax-muted/40">
                <td className="max-w-[280px] truncate px-4 py-2.5 font-medium text-kampmax-text">
                  {p.title}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-kampmax-text-secondary">
                  {formatNaira(p.price)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <span
                    className={cn(
                      "tabular-nums font-medium",
                      p.stock === 0 ? "text-kampmax-error" : "text-kampmax-text-secondary"
                    )}
                  >
                    {p.stock === null ? "—" : p.stock === 0 ? "Out of stock" : p.stock.toLocaleString("en-NG")}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-kampmax-text-secondary">
                  {p.soldCount === null ? "—" : p.soldCount.toLocaleString("en-NG")}
                </td>
                <td className="px-4 py-2.5">
                  <Pill variant={productStatusVariant(p.status)} label={p.status.replace(/_/g, " ")} />
                </td>
                <td className="hidden whitespace-nowrap px-4 py-2.5 tabular-nums text-kampmax-text-secondary sm:table-cell">
                  {formatDate(p.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OrdersTab({ detail }: { detail: ManagedVendorDetail }) {
  const orders = detail.orders;
  if (orders.length === 0) {
    return <TabEmpty label="orders" />;
  }
  return (
    <section aria-label="Recent orders" className="overflow-hidden rounded-lg border border-kampmax-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-kampmax-border bg-kampmax-muted/50 text-left text-xs uppercase tracking-wide text-kampmax-text-secondary">
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th className="hidden lg:table-cell">Items</Th>
              <Th>Total</Th>
              <Th>Status</Th>
              <Th>Payment</Th>
              <Th>Date</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kampmax-border/70">
            {orders.map((o) => (
              <tr key={o.id} className="transition-colors hover:bg-kampmax-muted/40">
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-medium text-kampmax-text">
                  {o.id}
                </td>
                <td className="max-w-[160px] truncate px-4 py-2.5 text-kampmax-text-secondary">
                  {o.customerName}
                </td>
                <td className="hidden max-w-[220px] truncate px-4 py-2.5 text-kampmax-text-secondary lg:table-cell">
                  {o.itemsSummary}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 font-medium tabular-nums text-kampmax-text">
                  {formatNaira(o.total)}
                </td>
                <td className="px-4 py-2.5">
                  <Pill variant={orderStatusVariant(o.status)} label={o.status.replace(/_/g, " ")} />
                </td>
                <td className="px-4 py-2.5">
                  {o.paymentStatus ? (
                    <Pill variant={paymentStatusVariant(o.paymentStatus)} label={o.paymentStatus} />
                  ) : (
                    <span className="text-kampmax-text-secondary">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-kampmax-text-secondary">
                  {formatDate(o.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReviewsTab({ detail }: { detail: ManagedVendorDetail }) {
  const reviews = detail.reviews;
  if (reviews.length === 0) {
    return <TabEmpty label="reviews" />;
  }
  return (
    <section aria-label="Customer reviews" className="rounded-lg border border-kampmax-border bg-white">
      <ul role="list" className="divide-y divide-kampmax-border/70">
        {reviews.map((r) => (
          <li key={r.id} className="px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span aria-label={`${r.rating} out of 5 stars`} className="inline-flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    aria-hidden
                    className={cn(
                      "h-3.5 w-3.5",
                      n <= r.rating ? "fill-kampmax-gold text-kampmax-gold" : "text-kampmax-border"
                    )}
                  />
                ))}
              </span>
              <span className="text-sm font-medium text-kampmax-text">{r.customerName}</span>
              <span className="text-xs text-kampmax-text-secondary">on “{r.targetName}”</span>
              <span className="ml-auto inline-flex items-center gap-2">
                <Pill variant={reviewStatusVariant(r.status)} label={r.status} />
                <span className="tabular-nums text-xs text-kampmax-text-secondary" title={formatDateTime(r.createdAt)}>
                  {timeAgo(r.createdAt)}
                </span>
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-kampmax-text-secondary">
              “{r.comment}”
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComplaintsTab({ detail }: { detail: ManagedVendorDetail }) {
  const complaints = detail.complaints;
  if (complaints.length === 0) {
    return <TabEmpty label="complaints" />;
  }
  return (
    <section aria-label="Complaints and disputes" className="rounded-lg border border-kampmax-border bg-white">
      <ul role="list" className="divide-y divide-kampmax-border/70">
        {complaints.map((c) => (
          <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-kampmax-text">{c.subject}</p>
              <p className="mt-0.5 text-xs text-kampmax-text-secondary">
                <span className="font-mono">{c.orderId}</span> · {c.customerName} ·{" "}
                {formatNaira(c.amountInDispute)} disputed · opened {timeAgo(c.openedAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Pill variant={priorityVariant(c.priority)} label={c.priority} />
              <Pill variant={disputeStatusVariant(c.status)} label={c.status.replace(/_/g, " ")} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------
// Shared pieces
// ------------------------------------------------------------

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("whitespace-nowrap px-4 py-2.5 font-medium", className)}>
      {children}
    </th>
  );
}

function Pill({ variant, label }: { variant: string; label: string }) {
  const styles: Record<string, string> = {
    success: "bg-kampmax-success/10 text-kampmax-success",
    warning: "bg-kampmax-warning/10 text-amber-700",
    error: "bg-kampmax-error/10 text-kampmax-error",
    info: "bg-kampmax-info/10 text-kampmax-info",
    neutral: "bg-kampmax-muted text-kampmax-text-secondary",
    gold: "bg-kampmax-gold/15 text-kampmax-gold-dark",
    blue: "bg-kampmax-blue/10 text-kampmax-blue",
  };
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        styles[variant] ?? styles.neutral
      )}
    >
      {label}
    </span>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
  mono,
  onClick,
}: {
  icon?: typeof Store;
  label: string;
  value: string;
  href?: string;
  mono?: boolean;
  onClick?: () => void;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-kampmax-text-secondary">
        <span className="inline-flex items-center gap-1">
          {Icon && <Icon className="h-3 w-3 opacity-60" />}
          {label}
        </span>
      </dt>
      <dd className={cn("mt-0.5 break-all text-sm text-kampmax-text", mono && "font-mono text-xs")}>
        {href ? (
          <a href={href} className="transition-colors hover:text-kampmax-blue">
            {value}
          </a>
        ) : onClick ? (
          <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1 text-left underline decoration-kampmax-border decoration-dotted underline-offset-2 transition-colors hover:text-kampmax-blue"
          >
            {value}
            <MapPin className="h-3 w-3 opacity-60" />
          </button>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="text-kampmax-text-secondary">{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          strong ? "font-semibold text-kampmax-text" : muted ? "text-kampmax-text-secondary" : "font-medium text-kampmax-text"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function TabEmpty({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-kampmax-border bg-white px-4 py-10 text-center">
      <Clock className="mx-auto h-6 w-6 text-kampmax-text-secondary/50" />
      <p className="mt-2 text-sm font-medium text-kampmax-text">No {label} to show yet</p>
      <p className="mt-0.5 text-xs text-kampmax-text-secondary">
        This section fills up as the store trades on the marketplace.
      </p>
    </div>
  );
}

function VendorNotFound() {
  return (
    <div className="rounded-lg border border-kampmax-border bg-white p-4">
      <ErrorState
        title="Vendor not found"
        message="This store may have been removed or the link is incorrect."
      />
      <div className="mt-3 text-center">
        <Link
          href="/admin/vendors"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-kampmax-blue hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to vendors
        </Link>
      </div>
    </div>
  );
}
