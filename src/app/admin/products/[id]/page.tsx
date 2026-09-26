"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileWarning,
  Flag,
  ImageIcon,
  KeyRound,
  Package,
  RotateCcw,
  ShieldAlert,
  ShoppingBag,
  Star,
  Store,
  Tag,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { cn, formatDateTime, formatNairaCompact, formatDate, timeAgo } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { StatCard } from "@/components/admin/StatCard";
import { priorityVariant, reportStatusVariant, StatusBadge } from "@/components/admin/StatusBadge";
import { ReasonDialog } from "@/components/admin/products/ReasonDialog";
import { ProductStatusBadge } from "@/components/admin/products/ProductBadges";
import {
  getProductActionAvailability,
  stockTone,
} from "@/components/admin/products/products-meta";
import { productManagementService } from "@/services/admin";
import type {
  ContentReport,
  ManagedProductDetail,
  ProductReviewRow,
} from "@/types/admin";

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

type DetailState =
  | { status: "loading" }
  | { status: "error"; notFound?: boolean }
  | { status: "ready"; data: ManagedProductDetail };

type DetailTab = "reviews" | "reports" | "activity";

const TABS: { key: DetailTab; label: string }[] = [
  { key: "reviews", label: "Reviews" },
  { key: "reports", label: "Reports" },
  { key: "activity", label: "Activity" },
];

export default function AdminProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = typeof params.id === "string" ? params.id : "";

  const [detail, setDetail] = useState<DetailState>({ status: "loading" });

  // ----- overlays -----
  const [tab, setTab] = useState<DetailTab>("reviews");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
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
      const data = await productManagementService.getById(productId);
      if (!data) {
        setDetail({ status: "error", notFound: true });
        return;
      }
      setDetail({ status: "ready", data });
    } catch {
      setDetail({ status: "error" });
    }
  }, [productId]);

  useEffect(() => {
    if (productId) void loadDetail();
  }, [productId, loadDetail]);

  function refresh(message?: string) {
    void loadDetail();
    if (message) pushToast("success", message);
  }

  async function approve() {
    if (detail.status !== "ready") return;
    try {
      await productManagementService.approve(detail.data.product.id);
      refresh(`“${detail.data.product.title}” approved - now live on the marketplace.`);
    } catch (err) {
      pushToast("error", err instanceof Error && err.message ? err.message : "Couldn't approve the listing. Try again.");
    }
  }

  async function restore() {
    if (detail.status !== "ready") return;
    try {
      await productManagementService.restore(detail.data.product.id);
      refresh(`“${detail.data.product.title}” restored to the marketplace.`);
    } catch (err) {
      pushToast("error", err instanceof Error && err.message ? err.message : "Couldn't restore the listing. Try again.");
    }
  }

  async function confirmReject(reason: string) {
    if (detail.status !== "ready") return;
    try {
      await productManagementService.reject(detail.data.product.id, reason);
      refresh("Listing rejected - the vendor sees your reason in their dashboard.");
    } catch (err) {
      pushToast("error", err instanceof Error && err.message ? err.message : "The action failed. Try again.");
    } finally {
      setRejectOpen(false);
    }
  }

  async function confirmSuspend(reason: string) {
    if (detail.status !== "ready") return;
    try {
      await productManagementService.suspend(detail.data.product.id, reason);
      refresh("Listing suspended and hidden from buyers.");
    } catch (err) {
      pushToast("error", err instanceof Error && err.message ? err.message : "The action failed. Try again.");
    } finally {
      setSuspendOpen(false);
    }
  }

  async function runArchive() {
    if (detail.status !== "ready") return;
    try {
      await productManagementService.archive(detail.data.product.id);
      refresh("Listing archived.");
    } catch (err) {
      pushToast("error", err instanceof Error && err.message ? err.message : "The action failed. Try again.");
    } finally {
      setArchiveOpen(false);
    }
  }

  // ----- render guards -----

  if (!productId || (detail.status === "error" && detail.notFound)) {
    return (
      <div className="rounded-lg border border-kampmax-border bg-white p-4">
        <ErrorState
          title="Product not found"
          message="This listing may have been removed or the link is incorrect."
        />
        <div className="mt-3 text-center">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-kampmax-blue hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  if (detail.status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-10 w-72 animate-pulse rounded bg-kampmax-muted" />
        <LoadingSkeleton variant="cards" rows={6} />
        <div className="h-64 animate-pulse rounded-lg bg-white ring-1 ring-kampmax-border" />
      </div>
    );
  }

  if (detail.status === "error") {
    return <ErrorState onRetry={() => void loadDetail()} />;
  }

  const { product, vendor, campus, reviews, reports, activity } = detail.data;
  const availability = getProductActionAvailability(product.status);
  const tone = stockTone(product.stock);
  const discountPct =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : null;

  const counts: Record<DetailTab, number> = {
    reviews: reviews.length,
    reports: reports.length,
    activity: activity.length,
  };

  return (
    <>
      {/* Back link */}
      <Link
        href="/admin/products"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:text-kampmax-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All products
      </Link>

      <AdminPageHeader
        title={product.title}
        description={`${product.categoryName} · ${product.vendorName} · ${campus?.shortName ?? product.campusId} · listed ${formatDate(product.createdAt)}`}
        actions={
          <>
            <ProductStatusBadge status={product.status} />
            {availability.canApprove && (
              <button
                type="button"
                onClick={() => void approve()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-success px-3 text-sm font-medium text-white transition-colors hover:bg-kampmax-success/90"
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                Approve
              </button>
            )}
            {availability.canReject && (
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-error/40 bg-white px-3 text-sm font-medium text-kampmax-error transition-colors hover:bg-kampmax-error/5"
              >
                Reject…
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
            {availability.canRestore && (
              <button
                type="button"
                onClick={() => void restore()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-success/40 bg-white px-3 text-sm font-medium text-kampmax-success transition-colors hover:bg-kampmax-success/5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </button>
            )}
            {availability.canArchive && (
              <button
                type="button"
                onClick={() => setArchiveOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </button>
            )}
          </>
        }
      />

      {/* ---------- Overview stats ---------- */}
      <section aria-label="Product metrics" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Price" value={formatNairaCompact(product.price)} icon={Tag} tone={discountPct ? "gold" : "blue"} hint={discountPct ? `${discountPct}% off ${formatNairaCompact(product.originalPrice!)}` : product.condition} />
        <StatCard label="Stock" value={product.stock === 0 ? "Sold out" : product.stock.toLocaleString("en-NG")} icon={Package} tone={tone === "success" ? "success" : tone === "warning" ? "warning" : "error"} hint={`${product.saves.toLocaleString("en-NG")} saves`} />
        <StatCard label="Units sold" value={product.salesCount.toLocaleString("en-NG")} icon={ShoppingBag} tone="blue" hint={`${product.views.toLocaleString("en-NG")} views`} />
        <StatCard label="Revenue (lifetime)" value={formatNairaCompact(product.revenue)} icon={Wallet} tone="gold" hint={`≈ ${Math.round((product.revenue / Math.max(product.salesCount, 1)))} avg/unit`} />
        <StatCard label="Rating" value={`${product.rating.toFixed(1)} / 5`} icon={Star} tone="gold" hint={`${product.reviewsCount.toLocaleString("en-NG")} reviews`} />
        <StatCard label="Reports" value={product.reportsCount.toLocaleString("en-NG")} icon={Flag} tone={product.reportsCount > 0 ? "error" : "default"} hint={reports.filter((r) => r.status === "open").length + " open"} />
      </section>

      {/* ---------- Main content ---------- */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Gallery */}
          <Gallery images={product.images} title={product.title} />

          {/* Description + specifications */}
          <section aria-label="Description and specifications" className="rounded-lg border border-kampmax-border bg-white">
            <div className="border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">About this listing</h2>
            </div>
            <div className="px-4 py-4">
              <p className="text-sm leading-relaxed text-kampmax-text">{product.description}</p>

              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-kampmax-text-secondary">
                Specifications
              </h3>
              <dl className="mt-2 divide-y divide-kampmax-border/70 rounded-md border border-kampmax-border/70">
                {product.specifications.map((spec) => (
                  <div key={spec.label} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                    <dt className="text-kampmax-text-secondary">{spec.label}</dt>
                    <dd className="font-medium text-kampmax-text">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Vendor + campus */}
          <section aria-label="Vendor and campus" className="rounded-lg border border-kampmax-border bg-white">
            <div className="border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">Seller</h2>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4">
              <InfoRow
                icon={Store}
                label="Store"
                value={vendor.storeName}
                onClick={() => router.push(`/admin/vendors/${vendor.id}`)}
              />
              <InfoRow
                icon={Building2}
                label="Campus"
                value={campus ? campus.name : product.campusId}
                onClick={
                  campus ? () => router.push(`/admin/campuses/${campus.id}`) : undefined
                }
              />
              <InfoRow label="Vendor rating" value={`${vendor.rating.toFixed(1)} / 5`} />
              <InfoRow label="Listings by store" value={vendor.productsCount.toLocaleString("en-NG")} />
              <InfoRow label="Product ID" value={product.id} mono />
            </dl>
          </section>

          {/* Moderation record */}
          <section aria-label="Moderation record" className="rounded-lg border border-kampmax-border bg-white">
            <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">Moderation</h2>
              <ProductStatusBadge status={product.status} />
            </div>
            <dl className="grid grid-cols-1 gap-y-3 px-4 py-4">
              <InfoRow label="Submitted" value={`${timeAgo(product.moderation.submittedAt)} · ${formatDate(product.moderation.submittedAt)}`} />
              <InfoRow
                label="Last review"
                value={
                  product.moderation.reviewedAt && product.moderation.reviewedBy
                    ? `${formatDate(product.moderation.reviewedAt)} by ${product.moderation.reviewedBy}`
                    : "Awaiting first review"
                }
              />
              {product.moderation.rejectionReason && (
                <ReasonNote tone="danger" label="Rejection reason">
                  {product.moderation.rejectionReason}
                </ReasonNote>
              )}
              {product.moderation.suspensionReason && (
                <ReasonNote tone="warning" label="Suspension reason">
                  {product.moderation.suspensionReason}
                </ReasonNote>
              )}
            </dl>
          </section>
        </div>
      </div>

      {/* ---------- Tabs ---------- */}
      <div
        role="tablist"
        aria-label="Product sections"
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
        {tab === "reviews" && <ReviewsPanel reviews={reviews} />}
        {tab === "reports" && <ReportsPanel reports={reports} productTitle={product.title} />}
        {tab === "activity" && <ActivityPanel events={activity} />}
      </div>

      {/* ---------- Overlays ---------- */}

      <ReasonDialog
        open={rejectOpen}
        title={`Reject “${product.title}”?`}
        description="The listing is removed from the queue and the vendor sees your reason in their dashboard."
        confirmLabel="Reject listing"
        tone="danger"
        placeholder="e.g. Photos don't show the actual item…"
        loading={false}
        onClose={() => setRejectOpen(false)}
        onConfirm={confirmReject}
      />

      <ReasonDialog
        open={suspendOpen}
        title={`Suspend “${product.title}”?`}
        description="The listing is hidden from buyers immediately while the reason is recorded for review."
        confirmLabel="Suspend listing"
        tone="warning"
        placeholder="e.g. Multiple quality complaints within 7 days…"
        loading={false}
        onClose={() => setSuspendOpen(false)}
        onConfirm={confirmSuspend}
      />

      <ConfirmDialog
        open={archiveOpen}
        title={`Archive “${product.title}”?`}
        message="Archiving removes the listing from the marketplace and the vendor's active catalog. It can be restored later."
        confirmLabel="Archive listing"
        tone="warning"
        onConfirm={runArchive}
        onCancel={() => setArchiveOpen(false)}
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
// Gallery (client-side main image switching)
// ------------------------------------------------------------

function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const safeIndex = Math.min(active, images.length - 1);

  return (
    <section aria-label="Product gallery" className="rounded-lg border border-kampmax-border bg-white p-4">
      <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg border border-kampmax-border bg-kampmax-muted/40">
        {images[safeIndex] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[safeIndex]}
            alt={`${title} - photo ${safeIndex + 1}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-kampmax-text-secondary">
            <ImageIcon className="h-8 w-8 opacity-40" />
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div role="tablist" aria-label="Gallery photos" className="mx-auto mt-3 flex w-fit gap-2">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`Show photo ${i + 1}`}
              onClick={() => setActive(i)}
              className={cn(
                "h-12 w-12 overflow-hidden rounded-md border-2 transition-colors",
                i === safeIndex ? "border-kampmax-blue" : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------
// Panels
// ------------------------------------------------------------

function ReviewsPanel({ reviews }: { reviews: ProductReviewRow[] }) {
  if (reviews.length === 0) {
    return <EmptyBlock icon={Star} label="No customer reviews yet" />;
  }
  return (
    <ul role="list" className="divide-y divide-kampmax-border/70 rounded-lg border border-kampmax-border bg-white">
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
            <span className="ml-auto inline-flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                  r.status === "published"
                    ? "bg-kampmax-success/10 text-kampmax-success"
                    : r.status === "flagged"
                      ? "bg-kampmax-error/10 text-kampmax-error"
                      : "bg-kampmax-muted text-kampmax-text-secondary"
                )}
              >
                {r.status}
              </span>
              <span className="tabular-nums text-xs text-kampmax-text-secondary">
                {timeAgo(r.createdAt)}
              </span>
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-kampmax-text-secondary">“{r.comment}”</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-kampmax-text-secondary">
            <ThumbsUpHint count={r.helpfulCount} />
          </p>
        </li>
      ))}
    </ul>
  );
}

function ThumbsUpHint({ count }: { count: number }) {
  return (
    <span>
      {count.toLocaleString("en-NG")} found this helpful
    </span>
  );
}

const REPORT_REASON_LABELS: Record<ContentReport["reason"], string> = {
  spam: "Spam",
  inappropriate: "Inappropriate content",
  scam: "Scam / fraud",
  harassment: "Harassment",
  counterfeit: "Counterfeit",
  other: "Other",
};

function ReportsPanel({
  reports,
  productTitle,
}: {
  reports: ContentReport[];
  productTitle: string;
}) {
  if (reports.length === 0) {
    return <EmptyBlock icon={FileWarning} label="No buyer reports against this listing" />;
  }
  return (
    <ul role="list" className="divide-y divide-kampmax-border/70 rounded-lg border border-kampmax-border bg-white">
      {reports.map((r) => (
        <li key={r.id} className="px-4 py-3.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium capitalize text-kampmax-text">
                {REPORT_REASON_LABELS[r.reason]} report
                <span className="ml-2 font-normal text-kampmax-text-secondary">
                  about “{productTitle}”
                </span>
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-kampmax-text-secondary">
                “{r.detail}” · reported by {r.reporterName} · {timeAgo(r.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <StatusBadge variant={reportStatusVariant(r.status)} label={r.status.replace(/_/g, " ")} />
              <StatusBadge
                dot={false}
                variant={priorityVariant(r.priority)}
                label={`${r.priority} priority`}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

const ACTIVITY_ICONS = {
  listing: Package,
  order: ShoppingBag,
  moderation: FileWarning,
  admin: KeyRound,
  pricing: Tag,
} as const;

const ACTIVITY_STYLES: Record<string, string> = {
  listing: "bg-kampmax-info/10 text-kampmax-info",
  order: "bg-kampmax-success/10 text-kampmax-success",
  moderation: "bg-rose-100 text-rose-600",
  admin: "bg-kampmax-blue/10 text-kampmax-blue",
  pricing: "bg-kampmax-gold/20 text-kampmax-gold-dark",
};

function ActivityPanel({ events }: { events: ManagedProductDetail["activity"] }) {
  if (events.length === 0) {
    return <EmptyBlock icon={TrendingUp} label="No activity recorded yet" />;
  }
  return (
    <ol className="relative space-y-4 rounded-lg border border-kampmax-border bg-white px-4 py-4 before:absolute before:bottom-6 before:left-[27px] before:top-7 before:w-px before:bg-kampmax-border">
      {events.map((event) => {
        const Icon = ACTIVITY_ICONS[event.kind];
        return (
          <li key={event.id} className="relative flex gap-3 pl-0">
            <span
              aria-hidden
              className={cn(
                "z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ring-white",
                ACTIVITY_STYLES[event.kind]
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] font-medium leading-snug text-kampmax-text">
                {event.message}
              </p>
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
  );
}

function EmptyBlock({
  icon: Icon,
  label,
}: {
  icon: typeof Store;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-kampmax-border bg-white px-4 py-10 text-center">
      <Icon className="mx-auto h-6 w-6 text-kampmax-text-secondary/50" />
      <p className="mt-2 text-sm font-medium text-kampmax-text">{label}</p>
    </div>
  );
}

// ------------------------------------------------------------
// Shared pieces
// ------------------------------------------------------------

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
  onClick,
}: {
  icon?: typeof Store;
  label: string;
  value: string;
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
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            className="text-left underline decoration-kampmax-border decoration-dotted underline-offset-2 transition-colors hover:text-kampmax-blue"
          >
            {value}
          </button>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function ReasonNote({
  tone,
  label,
  children,
}: {
  tone: "danger" | "warning";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className={cn("text-xs font-semibold", tone === "danger" ? "text-kampmax-error" : "text-amber-700")}>
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 rounded-md border px-2.5 py-2 text-xs leading-relaxed text-kampmax-text-secondary",
          tone === "danger"
            ? "border-kampmax-error/30 bg-kampmax-error/5"
            : "border-kampmax-warning/40 bg-kampmax-warning/10"
        )}
      >
        “{children}”
      </dd>
    </div>
  );
}
