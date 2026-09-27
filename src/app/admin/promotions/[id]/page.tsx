"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CalendarRange,
  Eye,
  Layers,
  MousePointerClick,
  Play,
  Store,
  Tag,
  Ticket,
} from "lucide-react";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  PromotionStatusBadge,
  PromotionTypeBadge,
} from "@/components/admin/promotions/PromotionBadges";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PromotionFormDialog } from "@/components/admin/promotions/PromotionFormDialog";
import {
  PROMOTION_ELIGIBILITY_LABELS,
  clickRate,
  discountLabel,
  promotionPlacementLabel,
  reviewBadge,
} from "@/components/admin/promotions/promotions-meta";
import { promotionManagementService } from "@/services/admin";
import type {
  ManagedPromotion,
  PromotionInput,
  PromotionTargetingOptions,
} from "@/types/admin";

export default function AdminPromotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [promotion, setPromotion] = useState<ManagedPromotion | null>(null);
  const [options, setOptions] = useState<PromotionTargetingOptions | null>(null);
  const [promoId, setPromoId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [acting, setActing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [{ id }, opts] = await Promise.all([
        params,
        promotionManagementService.getTargetingOptions(),
      ]);
      setPromoId(id);
      setOptions(opts);
      const found = await promotionManagementService.getById(id);
      setPromotion(found);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(status: ManagedPromotion["status"]) {
    if (!promotion) return;
    setActing(true);
    setActionError(null);
    try {
      await promotionManagementService.setStatus(promotion.id, status);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setActing(false);
    }
  }

  async function review(decision: "approve" | "reject", note?: string) {
    if (!promotion) return;
    setActing(true);
    setActionError(null);
    try {
      await promotionManagementService.review(promotion.id, decision, note);
      setRejectOpen(false);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "That didn't work. Try again.");
      setRejectOpen(false);
    } finally {
      setActing(false);
    }
  }

  async function submitEdit(input: PromotionInput) {
    if (!promotion) return;
    setActing(true);
    try {
      await promotionManagementService.update(promotion.id, input);
      setEditOpen(false);
      await load();
    } finally {
      setActing(false);
    }
  }

  if (loading) return <LoadingSkeleton variant="cards" rows={5} />;
  if (error || !promotion)
    return (
      <ErrorState
        onRetry={() => void load()}
        message={!error && !promotion ? `No promotion found for "${promoId}".` : undefined}
      />
    );

  const t = promotion.targeting;
  const isDiscount =
    promotion.type === "percentage_discount" || promotion.type === "fixed_discount";

  return (
    <>
      <Link
        href="/admin/promotions"
        className="mb-3 inline-flex items-center gap-1 text-sm text-kampmax-text-secondary transition-colors hover:text-kampmax-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to promotions
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-kampmax-text sm:text-2xl">
            {promotion.name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <PromotionStatusBadge status={promotion.status} />
            {reviewBadge(promotion.review) && (
              <StatusBadge
                variant={reviewBadge(promotion.review)!.variant}
                label={reviewBadge(promotion.review)!.label}
              />
            )}
            <span className="font-mono text-[11px] uppercase text-kampmax-text-secondary">
              {promotion.code ?? promotion.id.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={acting}
            onClick={() => setEditOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-40"
          >
            Edit
          </button>
          {(promotion.status === "draft" || promotion.status === "paused") && (
            <button
              type="button"
              disabled={acting}
              onClick={() => void act("active")}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-kampmax-success/90 px-3 text-xs font-medium text-white transition-colors hover:bg-kampmax-success disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" />
              {promotion.status === "draft" ? "Activate" : "Resume"}
            </button>
          )}
          {promotion.status === "active" && (
            <>
              <button
                type="button"
                disabled={acting}
                onClick={() => void act("paused")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-40"
              >
                <Ban className="h-3.5 w-3.5" />
                Pause
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => setEndOpen(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-kampmax-navy px-3 text-xs font-medium text-white transition-colors hover:bg-kampmax-navy-light disabled:opacity-40"
              >
                End now
              </button>
            </>
          )}
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-kampmax-error/30 bg-kampmax-error/10 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {promotion.vendorName && promotion.review === "pending" && (
        <div
          role="status"
          className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-kampmax-warning/40 bg-kampmax-warning/10 px-4 py-3"
        >
          <p className="text-sm text-amber-900">
            <span className="font-medium">{promotion.vendorName}</span> submitted this
            promotion. Customers can&apos;t redeem it until you approve it.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={acting}
              onClick={() => void review("approve")}
              className="inline-flex h-8 items-center rounded-md bg-kampmax-success/90 px-3 text-xs font-medium text-white hover:bg-kampmax-success disabled:opacity-40"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={acting}
              onClick={() => setRejectOpen(true)}
              className="inline-flex h-8 items-center rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-error hover:bg-kampmax-error/5 disabled:opacity-40"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {promotion.vendorName && promotion.review === "rejected" && (
        <div
          role="status"
          className="mt-3 rounded-lg border border-kampmax-border bg-kampmax-muted/50 px-4 py-3 text-sm text-kampmax-text-secondary"
        >
          Rejected{promotion.reviewNote ? `: ${promotion.reviewNote}` : "."} It goes back
          to review when the vendor edits it.
        </div>
      )}

      {/* Summary tiles */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isDiscount ? (
          <>
            <SummaryTile label="Discount" value={discountLabel(promotion)} icon={Tag} />
            <SummaryTile
              label="Usage"
              value={
                promotion.usageLimit != null
                  ? `${promotion.usageCount} / ${promotion.usageLimit}`
                  : `${promotion.usageCount} redemptions`
              }
              icon={Ticket}
            />
          </>
        ) : (
          <>
            <SummaryTile
              label="Views"
              value={String(promotion.views ?? 0)}
              icon={Eye}
            />
            <SummaryTile
              label="Clicks"
              value={`${promotion.clicks ?? 0}${
                clickRate(promotion.views ?? 0, promotion.clicks ?? 0)
                  ? ` (${clickRate(promotion.views ?? 0, promotion.clicks ?? 0)})`
                  : ""
              }`}
              icon={MousePointerClick}
            />
          </>
        )}
        <SummaryTile
          label="Window"
          value={`${new Date(promotion.startsAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })} - ${promotion.endsAt ? new Date(promotion.endsAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "no end date"}`}
          icon={CalendarRange}
        />
        <SummaryTile
          label="Run by"
          value={promotion.vendorName ?? "Kampmax"}
          icon={Layers}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left: targeting */}
        <section className="rounded-lg border border-kampmax-border bg-white p-4">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-kampmax-text">
            <Store className="h-4 w-4 opacity-60" />
            Targeting
          </h2>
          <p className="mb-3 text-xs text-kampmax-text-secondary">
            Empty sections mean the promotion applies marketplace-wide.
          </p>

          <dl className="space-y-4">
            <TargetRow
              label="Campuses"
              ids={t.campusIds}
              nameFor={(id) =>
                options?.campuses.find((c) => c.id === id)?.name ?? id.toUpperCase()
              }
              hrefFor={(id) => `/admin/campuses/${id}`}
              emptyText="All campuses"
            />
            <TargetRow
              label="Vendors"
              ids={t.vendorIds}
              nameFor={(id) =>
                options?.vendors.find((v) => v.id === id)?.name ?? id.toUpperCase()
              }
              hrefFor={(id) => `/admin/vendors/${id}`}
              emptyText="No vendor restriction"
            />
            <TargetRow
              label="Products"
              ids={t.productIds}
              nameFor={(id) =>
                options?.products.find((p) => p.id === id)?.name ?? id.toUpperCase()
              }
              hrefFor={(id) => `/admin/products/${id}`}
              emptyText="No product restriction"
            />
            <TargetRow
              label="Categories"
              ids={t.categoryIds}
              nameFor={(id) =>
                options?.categories.find((c) => c.id === id)?.name ?? id.toUpperCase()
              }
              emptyText="All categories"
            />
          </dl>

          <div className="mt-4 border-t border-dashed border-kampmax-border pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-kampmax-text-secondary">
              Internal note
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-kampmax-text">
              {promotion.description || "No description added."}
            </p>
          </div>
        </section>

        {/* Right: configuration */}
        <section className="h-fit rounded-lg border border-kampmax-border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-kampmax-text">Configuration</h2>
          <dl className="space-y-2.5 text-sm">
            <InfoRow label="Type" value={<PromotionTypeBadge type={promotion.type} />} />
            <InfoRow
              label="Featured on"
              value={
                promotion.placement === "none"
                  ? "Not featured"
                  : promotionPlacementLabel(promotion.placement)
              }
            />
            {isDiscount && (
              <>
              <InfoRow
                label="Who can use it"
                value={PROMOTION_ELIGIBILITY_LABELS[promotion.eligibility ?? "all_customers"]}
              />
              <InfoRow
                label="Max discount"
                value={
                  promotion.maxDiscount != null
                    ? `₦${promotion.maxDiscount.toLocaleString("en-NG")} per order`
                    : "No cap"
                }
              />
              <InfoRow
                label="Per customer"
                value={
                  promotion.perUserLimit != null
                    ? `${promotion.perUserLimit} time${promotion.perUserLimit === 1 ? "" : "s"}`
                    : "Unlimited"
                }
              />
              <InfoRow
                label="Min. spend"
                value={
                  promotion.minSpend != null
                    ? `₦${promotion.minSpend.toLocaleString("en-NG")}`
                    : "None"
                }
              />
              </>
            )}
            {promotion.code && (
              <InfoRow
                label="Code"
                value={
                  <span className="inline-flex items-center gap-1 rounded bg-kampmax-muted px-1.5 py-0.5 font-mono text-xs uppercase">
                    <Ticket className="h-3 w-3" aria-hidden />
                    {promotion.code}
                  </span>
                }
              />
            )}
            <InfoRow label="Created" value={new Date(promotion.createdAt).toLocaleDateString("en-NG")} />
            <InfoRow label="Last updated" value={new Date(promotion.updatedAt).toLocaleDateString("en-NG")} />
          </dl>
          <p className="mt-3 rounded-md bg-kampmax-warning/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-700">
            Mock configuration only - discounts are not yet calculated against real
            orders at checkout.
          </p>
        </section>
      </div>

      {/* Edit */}
      {options && (
        <PromotionFormDialog
          open={editOpen}
          promotion={promotion}
          options={options}
          loading={acting}
          onClose={() => setEditOpen(false)}
          onSubmit={(input) => void submitEdit(input)}
        />
      )}

      <ConfirmDialog
        open={rejectOpen}
        title={`Reject “${promotion.name}”?`}
        message="The vendor is emailed your reason. The code stays unusable until they edit the promotion and it is approved."
        confirmLabel="Reject promotion"
        tone="danger"
        loading={acting}
        reasonLabel="Reason (shown to the vendor)"
        onConfirm={(reason) => void review("reject", reason)}
        onCancel={() => setRejectOpen(false)}
      />

      <ConfirmDialog
        open={endOpen}
        title={`End “${promotion.name}”?`}
        message="The promotion stops immediately and cannot be reactivated. Usage history is kept for reporting."
        confirmLabel="End promotion"
        tone="warning"
        loading={acting}
        onConfirm={async () => {
          await act("ended");
          setEndOpen(false);
        }}
        onCancel={() => setEndOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete “${promotion.name}”?`}
        message="This removes the promotion entirely. Active promotions must be paused or ended first."
        confirmLabel="Delete promotion"
        tone="danger"
        onConfirm={async () => {
          await promotionManagementService.remove(promotion.id);
          router.push("/admin/promotions");
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}

function SummaryTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Tag;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-kampmax-border bg-white p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kampmax-blue/10 text-kampmax-blue">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-kampmax-text-secondary">
          {label}
        </dt>
        <dd className="truncate text-sm font-semibold tabular-nums text-kampmax-text">
          {value}
        </dd>
      </div>
    </div>
  );
}

function TargetRow({
  label,
  ids,
  nameFor,
  hrefFor,
  emptyText,
}: {
  label: string;
  ids: string[];
  nameFor: (id: string) => string;
  hrefFor?: (id: string) => string;
  emptyText: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-kampmax-text-secondary">
        {label}
      </dt>
      <dd className="mt-1">
        {ids.length === 0 ? (
          <span className="text-sm text-kampmax-text-secondary">{emptyText}</span>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {ids.map((id) => (
              <li key={id}>
                {hrefFor ? (
                  <Link
                    href={hrefFor(id)}
                    className="inline-block max-w-[240px] truncate rounded-full border border-kampmax-border bg-kampmax-muted/50 px-2.5 py-0.5 text-xs font-medium text-kampmax-blue transition-colors hover:bg-kampmax-muted"
                  >
                    {nameFor(id)}
                  </Link>
                ) : (
                  <span className="inline-block max-w-[240px] truncate rounded-full border border-kampmax-border bg-kampmax-muted/50 px-2.5 py-0.5 text-xs font-medium text-kampmax-text">
                    {nameFor(id)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-xs uppercase tracking-wide text-kampmax-text-secondary">
        {label}
      </dt>
      <dd className="break-all text-right text-sm text-kampmax-text">{value}</dd>
    </div>
  );
}
