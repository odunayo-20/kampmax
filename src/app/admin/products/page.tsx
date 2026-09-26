"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, PackageSearch, XCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Pagination } from "@/components/admin/Pagination";
import {
  ProductsFilters,
  type ProductsFilterState,
  type ProductsCounts,
} from "@/components/admin/products/ProductsFilters";
import { ProductsTable } from "@/components/admin/products/ProductsTable";
import { ReasonDialog } from "@/components/admin/products/ReasonDialog";
import { useDebounce } from "@/hooks/use-debounce";
import { campusService, productManagementService } from "@/services/admin";
import { PRODUCT_STATUS_LABELS } from "@/components/admin/products/products-meta";
import type {
  ManagedProduct,
  Paginated,
  ProductFacets,
  SortDir,
} from "@/types/admin";
import type { ManagedProductSortField } from "@/services/admin";

type ListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: Paginated<ManagedProduct> };

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

const VALID_STATUSES = Object.keys(PRODUCT_STATUS_LABELS) as ManagedProductStatusKeys[];
type ManagedProductStatusKeys = keyof typeof PRODUCT_STATUS_LABELS;

function parseInitialFilters(params: URLSearchParams): ProductsFilterState {
  const rawStatus = params.get("status");
  return {
    search: params.get("q") ?? "",
    status:
      rawStatus && VALID_STATUSES.includes(rawStatus as ManagedProductStatusKeys)
        ? (rawStatus as ManagedProduct["status"])
        : "all",
    categoryId: params.get("category") ?? "all",
    campusId: params.get("campus") ?? "all",
    vendorId: params.get("vendor") ?? "all",
    stock: (params.get("stock") as ProductsFilterState["stock"]) ?? "any",
    priceMin: params.get("min") ?? "",
    priceMax: params.get("max") ?? "",
  };
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<ProductsSkeleton />}>
      <AdminProductsPageInner />
    </Suspense>
  );
}

function AdminProductsPageInner() {
  const searchParams = useSearchParams();

  // ----- filters / query state -----
  const [filters, setFilters] = useState<ProductsFilterState>(() =>
    parseInitialFilters(new URLSearchParams(searchParams.toString()))
  );
  const [sortBy, setSortBy] = useState<ManagedProductSortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ----- data state -----
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [counts, setCounts] = useState<ProductsCounts | null>(null);
  const [facets, setFacets] = useState<ProductFacets>({
    categories: [],
    campuses: [],
    vendors: [],
  });
  const [campusNames, setCampusNames] = useState<Record<string, string>>({});
  const [reloadKey, setReloadKey] = useState(0);

  // ----- overlays -----
  const [rejectTarget, setRejectTarget] = useState<ManagedProduct | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<ManagedProduct | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ManagedProduct | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);

  // Debounced text inputs (search + price bounds share one debounce tick).
  const debouncedSearch = useDebounce(filters.search.trim(), 350);
  const debouncedPriceMin = useDebounce(filters.priceMin.trim(), 450);
  const debouncedPriceMax = useDebounce(filters.priceMax.trim(), 450);

  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const loadList = useCallback(async () => {
    setList((prev) => (prev.status === "ready" ? prev : { status: "loading" }));
    try {
      const data = await productManagementService.list({
        search: debouncedSearch,
        status: filters.status,
        categoryId: filters.categoryId,
        campusId: filters.campusId,
        vendorId: filters.vendorId,
        stock: filters.stock,
        priceMin: debouncedPriceMin === "" ? null : Number(debouncedPriceMin),
        priceMax: debouncedPriceMax === "" ? null : Number(debouncedPriceMax),
        sortBy,
        sortDir,
        page,
        pageSize,
      });
      setList({ status: "ready", data });
      setPage(data.page);
    } catch {
      setList({ status: "error" });
    }
  }, [
    debouncedSearch,
    debouncedPriceMin,
    debouncedPriceMax,
    filters.status,
    filters.categoryId,
    filters.campusId,
    filters.vendorId,
    filters.stock,
    sortBy,
    sortDir,
    page,
    pageSize,
  ]);

  const loadMeta = useCallback(async () => {
    try {
      const [nextCounts, nextFacets, campuses] = await Promise.all([
        productManagementService.getCounts(),
        productManagementService.getFacets(),
        campusService.list(),
      ]);
      setCounts(nextCounts);
      setFacets(nextFacets);
      setCampusNames(
        Object.fromEntries(campuses.map((c) => [c.id, c.shortName]))
      );
    } catch {
      /* non-critical metadata */
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList, reloadKey]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta, reloadKey]);

  // ----- handlers -----

  const patchFilters = useCallback((patch: Partial<ProductsFilterState>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const toggleSort = useCallback(
    (field: ManagedProductSortField) => {
      if (field === sortBy) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortDir(field === "title" ? "asc" : "desc");
      }
      setPage(1);
    },
    [sortBy]
  );

  function refresh(message?: string) {
    setReloadKey((k) => k + 1);
    if (message) pushToast("success", message);
  }

  async function approve(product: ManagedProduct) {
    try {
      await productManagementService.approve(product.id);
      refresh(`“${product.title}” approved - now live on the marketplace.`);
    } catch (err) {
      pushToast("error", err instanceof Error && err.message ? err.message : `Couldn't approve “${product.title}”. Try again.`);
    }
  }

  async function restore(product: ManagedProduct) {
    try {
      await productManagementService.restore(product.id);
      refresh(`“${product.title}” restored to the marketplace.`);
    } catch (err) {
      pushToast("error", err instanceof Error && err.message ? err.message : `Couldn't restore “${product.title}”. Try again.`);
    }
  }

  async function confirmReject(reason: string) {
    if (!rejectTarget) return;
    try {
      await productManagementService.reject(rejectTarget.id, reason);
      refresh(`“${rejectTarget.title}” was rejected. The vendor has been notified.`);
    } catch (err) {
      pushToast("error", err instanceof Error && err.message ? err.message : "The action failed. Try again.");
    } finally {
      setRejectTarget(null);
    }
  }

  async function confirmSuspend(reason: string) {
    if (!suspendTarget) return;
    try {
      await productManagementService.suspend(suspendTarget.id, reason);
      refresh(`“${suspendTarget.title}” was suspended pending review.`);
    } catch (err) {
      pushToast("error", err instanceof Error && err.message ? err.message : "The action failed. Try again.");
    } finally {
      setSuspendTarget(null);
    }
  }

  async function runArchive() {
    if (!archiveTarget) return;
    try {
      await productManagementService.archive(archiveTarget.id);
      refresh(`“${archiveTarget.title}” was archived.`);
    } catch (err) {
      pushToast("error", err instanceof Error && err.message ? err.message : "The action failed. Try again.");
    } finally {
      setArchiveTarget(null);
    }
  }

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.categoryId !== "all" ||
    filters.campusId !== "all" ||
    filters.vendorId !== "all" ||
    filters.stock !== "any" ||
    filters.priceMin.trim() !== "" ||
    filters.priceMax.trim() !== "";

  const readyData = list.status === "ready" ? list.data : null;

  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Listing moderation and catalog health across every campus storefront."
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 py-1.5 text-xs font-medium text-kampmax-text-secondary">
              <PackageSearch className="h-3.5 w-3.5" />
              {counts ? `${counts.all} listings` : "…"}
            </span>
            <button
              type="button"
              onClick={() => patchFilters({ status: "pending_approval" })}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3.5 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted"
            >
              Pending approval
              {(counts?.pending_approval ?? 0) > 0 && (
                <span className="rounded-full bg-kampmax-info/10 px-1.5 py-px text-[10px] font-semibold tabular-nums text-kampmax-info">
                  {counts!.pending_approval}
                </span>
              )}
            </button>
          </>
        }
      />

      {/* Moderation banner */}
      {!hasActiveFilters && (counts?.pending_approval ?? 0) > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-kampmax-info/30 bg-kampmax-info/5 px-4 py-3">
          <p className="text-sm text-kampmax-text">
            <span className="font-semibold">
              {counts!.pending_approval} listing
              {counts!.pending_approval === 1 ? "" : "s"}
            </span>{" "}
            waiting in the approval queue.
          </p>
          <button
            type="button"
            onClick={() => patchFilters({ status: "pending_approval" })}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-kampmax-navy px-3 text-xs font-medium text-white transition-colors hover:bg-kampmax-navy/90"
          >
            Review queue
          </button>
        </div>
      )}

      <div className="mb-4">
        <ProductsFilters
          filters={filters}
          facets={facets}
          counts={counts}
          onChange={patchFilters}
        />
      </div>

      <ProductsTable
        campusNames={campusNames}
        page={readyData}
        loading={list.status === "loading"}
        error={list.status === "error"}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={toggleSort}
        onRetry={() => setReloadKey((k) => k + 1)}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() =>
          patchFilters({
            search: "",
            status: "all",
            categoryId: "all",
            campusId: "all",
            vendorId: "all",
            stock: "any",
            priceMin: "",
            priceMax: "",
          })
        }
        onApprove={(p) => void approve(p)}
        onReject={(p) => setRejectTarget(p)}
        onSuspend={(p) => setSuspendTarget(p)}
        onArchive={(p) => setArchiveTarget(p)}
        onRestore={(p) => void restore(p)}
      />

      {readyData && readyData.total > 0 && (
        <Pagination
          page={readyData.page}
          pageSize={pageSize}
          total={readyData.total}
          totalPages={readyData.totalPages}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      )}

      {/* ---------- Overlays ---------- */}

      <ReasonDialog
        open={rejectTarget !== null}
        title={`Reject “${rejectTarget?.title ?? ""}”?`}
        description="The listing is removed from the queue and the vendor sees your reason in their dashboard."
        confirmLabel="Reject listing"
        tone="danger"
        placeholder="e.g. Photos don't show the actual item…"
        onConfirm={confirmReject}
        onClose={() => setRejectTarget(null)}
      />

      <ReasonDialog
        open={suspendTarget !== null}
        title={`Suspend “${suspendTarget?.title ?? ""}”?`}
        description="The listing is hidden from buyers immediately while the reason is recorded for review."
        confirmLabel="Suspend listing"
        tone="warning"
        placeholder="e.g. Multiple quality complaints within 7 days…"
        onConfirm={confirmSuspend}
        onClose={() => setSuspendTarget(null)}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title={`Archive “${archiveTarget?.title ?? ""}”?`}
        message="Archiving removes the listing from the marketplace and the vendor's active catalog. It can be restored later from this console."
        confirmLabel="Archive listing"
        tone="warning"
        onConfirm={runArchive}
        onCancel={() => setArchiveTarget(null)}
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

function ProductsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-64 animate-pulse rounded bg-kampmax-muted" />
      <div className="h-24 animate-pulse rounded-lg bg-white ring-1 ring-kampmax-border" />
      <div className="h-80 animate-pulse rounded-lg bg-white ring-1 ring-kampmax-border" />
    </div>
  );
}
