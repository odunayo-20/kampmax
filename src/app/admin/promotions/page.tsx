"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Megaphone,
  PlusCircle,
  Search,
  XCircle,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn, formatDateShort } from "@/lib/utils";
import { PromotionsTable } from "@/components/admin/promotions/PromotionsTable";
import { PromotionFormDialog } from "@/components/admin/promotions/PromotionFormDialog";
import {
  PROMOTION_STATUS_FILTER_ORDER,
  PROMOTION_TYPE_FILTER_ORDER,
  promotionStatusLabel,
  promotionTypeLabel,
} from "@/components/admin/promotions/promotions-meta";
import { promotionManagementService } from "@/services/admin";
import type {
  ManagedPromotion,
  ManagedPromotionStatus,
  ManagedPromotionType,
  Paginated,
  PromotionInput,
  PromotionStatusCounts,
  PromotionTargetingOptions,
} from "@/types/admin";

export default function AdminPromotionsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="cards" rows={4} />}>
      <PromotionsConsole />
    </Suspense>
  );
}

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

interface Filters {
  search: string;
  type: ManagedPromotionType | "all";
  status: ManagedPromotionStatus | "all";
  /** Only vendor promotions waiting for approval. */
  review: "all" | "pending";
}

function parseInitialFilters(params: { get(name: string): string | null }): Filters {
  const validType = PROMOTION_TYPE_FILTER_ORDER.includes(
    params.get("type") as ManagedPromotionType
  )
    ? (params.get("type") as ManagedPromotionType)
    : "all";
  const validStatus = PROMOTION_STATUS_FILTER_ORDER.includes(
    params.get("status") as ManagedPromotionStatus
  )
    ? (params.get("status") as ManagedPromotionStatus)
    : "all";
  return {
    search: params.get("q") ?? "",
    type: validType,
    status: validStatus,
    review: params.get("review") === "pending" ? "pending" : "all",
  };
}

function PromotionsConsole() {
  const searchParams = useSearchParams();

  // ----- filters (URL-seeded) -----
  const [filters, setFilters] = useState<Filters>(() =>
    parseInitialFilters(searchParams)
  );
  const search = useDebounce(filters.search, 350);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // ----- data -----
  const [list, setList] = useState<Paginated<ManagedPromotion> | null>(null);
  const [counts, setCounts] = useState<PromotionStatusCounts | null>(null);
  const [options, setOptions] = useState<PromotionTargetingOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ----- overlays -----
  const [formTarget, setFormTarget] = useState<
    { mode: "create" } | { mode: "edit"; p: ManagedPromotion } | null
  >(null);
  const [formSaving, setFormSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedPromotion | null>(null);
  const [endTarget, setEndTarget] = useState<ManagedPromotion | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);

  function pushToast(tone: ToastMessage["tone"], text: string) {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }

  function patchFilters(patch: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }

  // Keep the URL shareable without re-render loops.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search.trim()) params.set("q", filters.search.trim());
    if (filters.type !== "all") params.set("type", filters.type);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.review !== "all") params.set("review", filters.review);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : "/admin/promotions");
  }, [filters]);

  const loadMeta = useCallback(async () => {
    try {
      const [c, o] = await Promise.all([
        promotionManagementService.getCounts(),
        promotionManagementService.getTargetingOptions(),
      ]);
      setCounts(c);
      setOptions(o);
    } catch {
      /* non-critical */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await promotionManagementService.list({
        search: search.trim() || undefined,
        type: filters.type,
        status: filters.status,
        review: filters.review,
        sortBy: "startsAt",
        sortDir: "desc",
        page,
        pageSize,
      });
      setList(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search, filters.type, filters.status, filters.review, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  // ----- mutations -----

  async function submitForm(input: PromotionInput) {
    if (!formTarget) return;
    setFormSaving(true);
    try {
      if (formTarget.mode === "edit") {
        await promotionManagementService.update(formTarget.p.id, input);
        pushToast("success", `“${input.name}” updated.`);
      } else {
        await promotionManagementService.create(input);
        pushToast("success", `“${input.name}” created as a draft.`);
      }
      setFormTarget(null);
      await Promise.all([loadList(), loadMeta()]);
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Couldn't save the promotion. Try again."
      );
    } finally {
      setFormSaving(false);
    }
  }

  async function duplicate(p: ManagedPromotion) {
    try {
      await promotionManagementService.create({
        name: `${p.name} (copy)`,
        description: p.description,
        type: p.type,
        code: p.code ? `${p.code}-COPY`.slice(0, 50) : null,
        discountValue: p.discountValue,
        minSpend: p.minSpend,
        placement: p.placement,
        targeting: JSON.parse(JSON.stringify(p.targeting)),
        usageLimit: p.usageLimit,
        maxDiscount: p.maxDiscount ?? null,
        perUserLimit: p.perUserLimit ?? null,
        eligibility: p.eligibility ?? "all_customers",
        startsAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 31 * 24 * 3600 * 1000).toISOString(),
      });
      pushToast("success", `Duplicated “${p.name}” - review and activate the copy.`);
      await loadList();
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Couldn't duplicate that promotion."
      );
    }
  }

  async function setStatus(p: ManagedPromotion, status: ManagedPromotionStatus) {
    if (status === "ended" && p.status !== "ended") {
      setEndTarget(p); // confirm first
      return;
    }
    try {
      await promotionManagementService.setStatus(p.id, status);
      pushToast("success", `“${p.name}” is now ${status}.`);
      await Promise.all([loadList(), loadMeta()]);
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Couldn't update that promotion."
      );
    }
  }

  async function confirmEnd() {
    if (!endTarget) return;
    try {
      await promotionManagementService.setStatus(endTarget.id, "ended");
      pushToast("success", `“${endTarget.name}” ended. It stays in history for reporting.`);
      setEndTarget(null);
      await Promise.all([loadList(), loadMeta()]);
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Couldn't end that promotion."
      );
      setEndTarget(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await promotionManagementService.remove(deleteTarget.id);
      pushToast("success", `“${deleteTarget.name}” deleted.`);
      setDeleteTarget(null);
      await Promise.all([loadList(), loadMeta()]);
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Couldn't delete that promotion."
      );
      setDeleteTarget(null);
    }
  }

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.review !== "all";

  return (
    <>
      <AdminPageHeader
        title="Promotions"
        description="Promo codes customers redeem at checkout, run by Kampmax and by vendors."
        actions={
          <>
            {counts && (
              <span className="hidden h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text-secondary sm:inline-flex">
                <Megaphone className="h-3.5 w-3.5 opacity-60" />
                {counts.liveNow} live now · {counts.byStatus.scheduled} scheduled
              </span>
            )}
            <button
              type="button"
              onClick={() => setFormTarget({ mode: "create" })}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-blue px-3 text-sm font-medium text-white transition-colors hover:bg-kampmax-blue/90"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New promotion
            </button>
          </>
        }
      />

      {/* Status tabs */}
      <div
        role="tablist"
        aria-label="Filter by status"
        className="flex gap-1 overflow-x-auto border-b border-kampmax-border px-3 py-2 no-scrollbar"
      >
        {(["all", ...PROMOTION_STATUS_FILTER_ORDER] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={filters.status === tab}
            onClick={() => patchFilters({ status: tab })}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-1.5 text-[13px] font-medium transition-colors",
              filters.status === tab
                ? "border-kampmax-blue text-kampmax-blue"
                : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
            )}
          >
            {tab === "all" ? "All" : promotionStatusLabel(tab)}
            {counts && (
              <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums">
                {tab === "all"
                  ? counts.all
                  : counts.byStatus[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + type filter */}
      <div className="my-3 flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <Input
            value={filters.search}
            placeholder="Search name or code…"
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Search promotions"
            onChange={(e) => patchFilters({ search: e.target.value })}
          />
        </div>
        <Select
          value={filters.type}
          aria-label="Filter by type"
          onChange={(e) =>
            patchFilters({ type: e.target.value as Filters["type"] })
          }
          className="w-auto"
        >
          <option value="all">All types</option>
          {PROMOTION_TYPE_FILTER_ORDER.map((t) => (
            <option key={t} value={t}>
              {promotionTypeLabel(t)}
            </option>
          ))}
        </Select>
        {((counts?.needsReview ?? 0) > 0 || filters.review === "pending") && (
          <button
            type="button"
            aria-pressed={filters.review === "pending"}
            onClick={() =>
              patchFilters({ review: filters.review === "pending" ? "all" : "pending" })
            }
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors",
              filters.review === "pending"
                ? "border-kampmax-warning bg-kampmax-warning/15 text-amber-800"
                : "border-kampmax-border bg-white text-kampmax-text hover:bg-kampmax-muted/60"
            )}
          >
            Needs review
            <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums">
              {counts?.needsReview ?? 0}
            </span>
          </button>
        )}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => patchFilters({ search: "", type: "all", status: "all", review: "all" })}
            className="text-xs font-medium text-kampmax-blue hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <PromotionsTable
        items={list?.items ?? []}
        loading={loading && !list}
        error={error}
        hasActiveFilters={hasActiveFilters}
        onRetry={() => void loadList()}
        onClearFilters={() => patchFilters({ search: "", type: "all", status: "all", review: "all" })}
        onEdit={(p) => setFormTarget({ mode: "edit", p })}
        onDuplicate={(p) => void duplicate(p)}
        onSetStatus={(p, s) => void setStatus(p, s)}
        onDelete={(p) => setDeleteTarget(p)}
      />

      {list && list.totalPages > 1 && (
        <Pagination
          className="mt-3 rounded-lg border border-kampmax-border bg-white"
          page={list.page}
          pageSize={list.pageSize}
          total={list.total}
          totalPages={list.totalPages}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPage(1);
            setPageSize(n);
          }}
        />
      )}

      {/* Create / edit form */}
      {options && (
        <PromotionFormDialog
          open={formTarget !== null}
          promotion={formTarget?.mode === "edit" ? formTarget.p : null}
          options={options}
          loading={formSaving}
          onClose={() => setFormTarget(null)}
          onSubmit={(input) => void submitForm(input)}
        />
      )}

      {/* End confirmation */}
      <ConfirmDialog
        open={endTarget !== null}
        title={`End “${endTarget?.name}”?`}
        message={
          endTarget == null
            ? ""
            : `The promotion stops immediately${endTarget.endsAt ? ` (was scheduled to run until ${formatDateShort(endTarget.endsAt)})` : ""} and cannot be reactivated. Usage history is kept for reporting.`
        }
        confirmLabel="End promotion"
        tone="warning"
        onConfirm={() => void confirmEnd()}
        onCancel={() => setEndTarget(null)}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete “${deleteTarget?.name}”?`}
        message="This removes the draft or archived promotion entirely. Active promotions must be paused or ended before they can be deleted."
        confirmLabel="Delete promotion"
        tone="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Toasts */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex max-w-sm items-start gap-2 rounded-lg border border-kampmax-border bg-white px-3.5 py-2.5 text-sm shadow-lg animate-[kampmax-fade-in_.18s_ease-out]"
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
