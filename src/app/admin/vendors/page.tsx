"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, CheckCircle2, Inbox, XCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Pagination } from "@/components/admin/Pagination";
import {
  VendorsFilters,
  type VendorsFilterState,
} from "@/components/admin/vendors/VendorsFilters";
import { VendorsTable } from "@/components/admin/vendors/VendorsTable";
import { VerificationReviewDialog } from "@/components/admin/vendors/VerificationReviewDialog";
import { ViewOwnerDialog } from "@/components/admin/vendors/ViewOwnerDialog";
import { ViewStoreDialog } from "@/components/admin/vendors/ViewStoreDialog";
import { useDebounce } from "@/hooks/use-debounce";
import { VENDOR_QUEUE_LABELS } from "@/components/admin/vendors/vendors-meta";
import {
  useAdminVendorActivateMutation,
  useAdminVendorApproveMutation,
  useAdminVendorCampuses,
  useAdminVendorCategories,
  useAdminVendorCounts,
  useAdminVendorDeactivateMutation,
  useAdminVendorDocumentReviewMutation,
  useAdminVendorRejectMutation,
  useAdminVendors,
  useAdminVendorSuspendMutation,
} from "@/hooks/admin/use-admin-vendors";
import { useActionGuard } from "@/hooks/admin/use-action-guard";
import type { ManagedVendor, SortDir, VendorBucket } from "@/types/admin";
import type { ManagedVendorSortField } from "@/services/admin";

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

function parseInitialFilters(params: URLSearchParams): VendorsFilterState {
  const rawQueue = params.get("queue");
  const validQueues = Object.keys(VENDOR_QUEUE_LABELS) as (
    | VendorBucket
    | "all"
  )[];
  const rawPage = Number.parseInt(params.get("page") ?? "", 10);
  return {
    search: params.get("q") ?? "",
    queue:
      rawQueue && validQueues.includes(rawQueue as VendorBucket | "all")
        ? (rawQueue as VendorBucket | "all")
        : "all",
    campusId: params.get("campus") ?? "all",
    category: params.get("category") ?? "all",
  };
}

function parseInitialPage(params: URLSearchParams): number {
  const rawPage = Number.parseInt(params.get("page") ?? "", 10);
  return Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
}

export default function AdminVendorsPage() {
  return (
    <Suspense fallback={<VendorsSkeleton />}>
      <AdminVendorsPageInner />
    </Suspense>
  );
}

function AdminVendorsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ----- filters / query state -----
  const [filters, setFilters] = useState<VendorsFilterState>(() =>
    parseInitialFilters(new URLSearchParams(searchParams.toString()))
  );
  const [sortBy, setSortBy] = useState<ManagedVendorSortField>("registeredAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(() =>
    parseInitialPage(new URLSearchParams(searchParams.toString()))
  );
  const [pageSize, setPageSize] = useState(10);

  // ----- overlays -----
  const [storeTarget, setStoreTarget] = useState<ManagedVendor | null>(null);
  const [ownerTarget, setOwnerTarget] = useState<ManagedVendor | null>(null);
  const [verificationTarget, setVerificationTarget] =
    useState<ManagedVendor | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<ManagedVendor | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ManagedVendor | null>(null);
  const [confirmWorking, setConfirmWorking] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);
  const { runExclusive } = useActionGuard();

  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  // ----- data hooks (always called at top level) -----
  const debouncedSearch = useDebounce(filters.search.trim(), 350);
  const query = useMemo(
    () => ({
      search: debouncedSearch,
      queue: filters.queue === "all" ? undefined : filters.queue,
      campusId: filters.campusId === "all" ? undefined : filters.campusId,
      category: filters.category === "all" ? undefined : filters.category,
      sortBy,
      sortDir,
      page,
      pageSize,
    }),
    [debouncedSearch, filters.queue, filters.campusId, filters.category, sortBy, sortDir, page, pageSize]
  );

  const { data, error, isLoading, refetch } = useAdminVendors(query);
  const counts = useAdminVendorCounts();
  const categoriesQuery = useAdminVendorCategories();
  const campusesQuery = useAdminVendorCampuses();
  const approveMut = useAdminVendorApproveMutation();
  const docReviewMut = useAdminVendorDocumentReviewMutation();
  const rejectMut = useAdminVendorRejectMutation();
  const suspendMut = useAdminVendorSuspendMutation();
  const activateMut = useAdminVendorActivateMutation();
  const deactivateMut = useAdminVendorDeactivateMutation();

  const campuses = useMemo(
    () =>
      (campusesQuery.data ?? []).map((c) => ({ id: c.id, name: c.label })),
    [campusesQuery.data]
  );
  const campusNames = useMemo(
    () => Object.fromEntries(campuses.map((c) => [c.id, c.name])),
    [campuses]
  );

  // Non-sensitive filters persist to the URL so views are shareable and
  // survive reloads (queue, campus, category and page only — never the raw
  // search term; that is written debounced to avoid churn per keystroke).
  const urlParams = searchParams.toString();
  useEffect(() => {
    const timer = setTimeout(() => {
      const sp = new URLSearchParams();
      const trimmed = filters.search.trim();
      if (trimmed) sp.set("q", trimmed);
      if (filters.queue !== "all") sp.set("queue", filters.queue);
      if (filters.campusId !== "all") sp.set("campus", filters.campusId);
      if (filters.category !== "all") sp.set("category", filters.category);
      if (page > 1) sp.set("page", String(page));
      const next = sp.toString();
      if (next !== urlParams) router.replace(`${pathname}?${next}`, { scroll: false });
    }, 350);
    return () => clearTimeout(timer);
  }, [filters, page, urlParams, router, pathname]);

  // ----- handlers -----

  const patchFilters = useCallback((patch: Partial<VendorsFilterState>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const toggleSort = useCallback(
    (field: ManagedVendorSortField) => {
      if (field === sortBy) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortDir(field === "storeName" ? "asc" : "desc");
      }
      setPage(1);
    },
    [sortBy]
  );

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  async function approveVendor(vendor: ManagedVendor) {
    await runExclusive(`vendor:approve:${vendor.id}`, async () => {
      await approveMut.mutateAsync(vendor.id);
      pushToast("success", `${vendor.storeName} verified - storefront is live.`);
    }).catch((err: unknown) => {
      pushToast(
        "error",
        err instanceof Error ? err.message : `Couldn't approve ${vendor.storeName}. Try again.`
      );
    });
  }

  async function rejectVendor(vendor: ManagedVendor, reason: string) {
    await runExclusive(`vendor:reject:${vendor.id}`, async () => {
      await rejectMut.mutateAsync({ id: vendor.id, reason });
      pushToast("success", `${vendor.storeName}'s application was rejected.`);
    }).catch((err: unknown) => {
      pushToast(
        "error",
        err instanceof Error ? err.message : `Couldn't reject ${vendor.storeName}. Try again.`
      );
    });
  }

  async function activateVendor(vendor: ManagedVendor) {
    await runExclusive(`vendor:activate:${vendor.id}`, async () => {
      await activateMut.mutateAsync(vendor.id);
      pushToast("success", `${vendor.storeName} is trading again.`);
    }).catch((err: unknown) => {
      pushToast(
        "error",
        err instanceof Error ? err.message : `Couldn't activate ${vendor.storeName}. Try again.`
      );
    });
  }

  async function runSuspend(reason: string) {
    if (!suspendTarget) return;
    setConfirmWorking(true);
    try {
      await suspendMut.mutateAsync({ id: suspendTarget.id, reason });
      pushToast("success", `${suspendTarget.storeName} was suspended.`);
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "The action failed. Try again.");
    } finally {
      setConfirmWorking(false);
      setSuspendTarget(null);
    }
  }

  async function runDeactivate() {
    if (!deactivateTarget) return;
    setConfirmWorking(true);
    try {
      await deactivateMut.mutateAsync(deactivateTarget.id);
      pushToast("success", `${deactivateTarget.storeName} was deactivated.`);
    } catch {
      pushToast("error", "The action failed. Try again.");
    } finally {
      setConfirmWorking(false);
      setDeactivateTarget(null);
    }
  }

  const countsData = counts.data ?? null;
  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.queue !== "all" ||
    filters.campusId !== "all" ||
    filters.category !== "all";

  const clearFilters = useCallback(() => {
    patchFilters({ search: "", queue: "all", campusId: "all", category: "all" });
  }, [patchFilters]);

  return (
    <>
      <AdminPageHeader
        title="Vendors"
        description="Storefront verification, trading lifecycle and marketplace performance."
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 py-1.5 text-xs font-medium text-kampmax-text-secondary">
              <BadgeCheck className="h-3.5 w-3.5" />
              {countsData ? `${countsData.all} stores` : "…"}
            </span>
            <button
              type="button"
              onClick={() => router.push("/admin/vendors?queue=pending_verification")}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3.5 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted"
            >
              <Inbox className="h-4 w-4" />
              Verification queue
              {(countsData?.pending_verification ?? 0) > 0 && (
                <span className="rounded-full bg-kampmax-warning/15 px-1.5 py-px text-[10px] font-semibold tabular-nums text-amber-700">
                  {countsData!.pending_verification}
                </span>
              )}
            </button>
          </>
        }
      />

      {/* Pending queue banner */}
      {!hasActiveFilters && (countsData?.pending_verification ?? 0) > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-kampmax-warning/40 bg-kampmax-warning/10 px-4 py-3">
          <p className="text-sm text-kampmax-text">
            <span className="font-semibold">
              {countsData!.pending_verification} vendor
              {countsData!.pending_verification === 1 ? "" : "s"}
            </span>{" "}
            awaiting document verification.
          </p>
          <a
            href="/admin/vendors?queue=pending_verification"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-kampmax-navy px-3 text-xs font-medium text-white transition-colors hover:bg-kampmax-navy/90"
          >
            Open queue
          </a>
        </div>
      )}

      <div className="mb-4">
        <VendorsFilters
          filters={filters}
          campuses={campuses}
          categories={categoriesQuery.data ?? []}
          counts={countsData}
          onChange={patchFilters}
        />
      </div>

      <VendorsTable
        campusNames={campusNames}
        page={data ?? null}
        loading={isLoading}
        error={!!error}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={toggleSort}
        onRetry={onRetry}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        onViewStore={(v) => setStoreTarget(v)}
        onViewOwner={(v) => setOwnerTarget(v)}
        onReviewVerification={(v) => setVerificationTarget(v)}
        onApprove={(v) => void approveVendor(v)}
        onReject={(v) => setVerificationTarget(v)}
        onSuspend={(v) => setSuspendTarget(v)}
        onActivate={(v) => void activateVendor(v)}
        onDeactivate={(v) => setDeactivateTarget(v)}
      />

      {data && data.total > 0 && (
        <Pagination
          page={data.page}
          pageSize={pageSize}
          total={data.total}
          totalPages={data.totalPages}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      )}

      {/* ---------- Overlays ---------- */}

      <ViewStoreDialog
        open={storeTarget !== null}
        vendor={storeTarget}
        campusName={
          storeTarget ? campusNames[storeTarget.campusId] : undefined
        }
        onClose={() => setStoreTarget(null)}
        onOpenProfile={(id) => {
          setStoreTarget(null);
          router.push(`/admin/vendors/${id}`);
        }}
      />

      <ViewOwnerDialog
        open={ownerTarget !== null}
        vendor={ownerTarget}
        onClose={() => setOwnerTarget(null)}
        onOpenProfile={(id) => {
          setOwnerTarget(null);
          router.push(`/admin/vendors/${id}`);
        }}
      />

      <VerificationReviewDialog
        key={verificationTarget?.id ?? "none"}
        open={verificationTarget !== null}
        vendor={verificationTarget}
        mode="review"
        onClose={() => setVerificationTarget(null)}
        onApprove={async (vendor) => {
          await approveVendor(vendor);
        }}
        onReject={async (vendor, reason) => {
          await rejectVendor(vendor, reason);
        }}
        onReviewDocument={async (vendor, doc, decision, reason) => {
          try {
            const fresh = await docReviewMut.mutateAsync({
              vendorId: vendor.id,
              documentId: doc.id,
              decision,
              reason,
            });
            setVerificationTarget(fresh);
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
        open={suspendTarget !== null}
        title={`Suspend ${suspendTarget?.storeName ?? ""}?`}
        message="All listings are hidden and checkout is blocked immediately. The owner keeps account access and can appeal, but buyers can no longer place orders."
        confirmLabel="Suspend store"
        tone="warning"
        reasonLabel="Reason for suspension (recorded in the audit log)"
        loading={confirmWorking}
        onConfirm={runSuspend}
        onCancel={() => setSuspendTarget(null)}
      />

      <ConfirmDialog
        open={deactivateTarget !== null}
        title={`Deactivate ${deactivateTarget?.storeName ?? ""}?`}
        message="The storefront goes offline for everyone. Unlike suspension this is a permanent off-switch - reactivation requires an explicit admin decision."
        confirmLabel="Deactivate store"
        tone="danger"
        loading={confirmWorking}
        onConfirm={runDeactivate}
        onCancel={() => setDeactivateTarget(null)}
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

function VendorsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-64 animate-pulse rounded bg-kampmax-muted" />
      <div className="h-24 animate-pulse rounded-lg bg-white ring-1 ring-kampmax-border" />
      <div className="h-80 animate-pulse rounded-lg bg-white ring-1 ring-kampmax-border" />
    </div>
  );
}