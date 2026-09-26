"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BadgeCheck, CheckCircle2, XCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Pagination } from "@/components/admin/Pagination";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import {
  FreelancersFilters,
  type FreelancersFilterState,
} from "@/components/admin/freelancers/FreelancersFilters";
import { FreelancersTable } from "@/components/admin/freelancers/FreelancersTable";
import { freelancerManagementService } from "@/services/admin";
import {
  useAdminFreelancers,
  useAdminFreelancerCounts,
  useAdminFreelancerSuspendMutation,
  useAdminFreelancerActivateMutation,
  useAdminFreelancerDeactivateMutation,
  useAdminFreelancerFeatureMutation,
  useAdminFreelancerUnfeatureMutation,
} from "@/hooks/admin/use-admin-freelancers";
import { useDebounce } from "@/hooks/use-debounce";
import type { ManagedFreelancer, SortDir } from "@/types/admin";
import type { ManagedFreelancerSortField } from "@/services/admin";

type ListState = ManagedFreelancer["status"] | "all";

const STATUS_KEYS: ListState[] = ["all", "approved", "pending_review", "suspended", "rejected"];

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

function parseInitialFilters(params: URLSearchParams): FreelancersFilterState {
  const rawStatus = params.get("status");
  return {
    search: params.get("search") ?? "",
    status:
      rawStatus && (STATUS_KEYS as string[]).includes(rawStatus)
        ? (rawStatus as ListState)
        : "all",
    categoryId: params.get("categoryId") ?? "all",
  };
}

export default function AdminFreelancersListPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" rows={8} />}>
      <AdminFreelancersListPageInner />
    </Suspense>
  );
}

function AdminFreelancersListPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ----- filter / query state -----
  const [filters, setFilters] = useState<FreelancersFilterState>(() =>
    parseInitialFilters(new URLSearchParams(searchParams.toString()))
  );
  const [sortBy, setSortBy] = useState<ManagedFreelancerSortField>("joinedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ----- overlays / feedback -----
  const [suspendTarget, setSuspendTarget] = useState<ManagedFreelancer | null>(null);
  const [activateTarget, setActivateTarget] = useState<ManagedFreelancer | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ManagedFreelancer | null>(null);
  const [confirmWorking, setConfirmWorking] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);
  const [categories, setCategories] = useState<string[]>([]);

  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  // ----- data hooks (always called at top level) -----
  const counts = useAdminFreelancerCounts();
  const suspendMut = useAdminFreelancerSuspendMutation();
  const activateMut = useAdminFreelancerActivateMutation();
  const deactivateMut = useAdminFreelancerDeactivateMutation();
  const featureMut = useAdminFreelancerFeatureMutation();
  const unfeatureMut = useAdminFreelancerUnfeatureMutation();

  // Debounced search mirrors the vendors/users consoles.
  const debouncedFilters = useDebounce(filters.search.trim(), 350);
  const query = useMemo(
    () => ({
      search: debouncedFilters,
      status: filters.status === "all" ? undefined : filters.status,
      categoryId: filters.categoryId === "all" ? undefined : filters.categoryId,
      sortBy,
      sortDir,
      page,
      pageSize,
    }),
    [debouncedFilters, filters.status, filters.categoryId, sortBy, sortDir, page, pageSize]
  );

  const { data, error, isLoading, isFetching, refetch } = useAdminFreelancers(query);

  // ----- metadata (categories for the filter panel) -----
  useEffect(() => {
    freelancerManagementService
      .getCategories()
      .then(setCategories)
      .catch(() => {
        /* non-critical metadata */
      });
  }, []);

  // ----- handlers -----

  const patchFilters = useCallback((patch: Partial<FreelancersFilterState>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const toggleSort = useCallback(
    (field: ManagedFreelancerSortField) => {
      if (field === sortBy) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortDir(field === "displayName" ? "asc" : "desc");
      }
      setPage(1);
    },
    [sortBy]
  );

  const clearFilters = useCallback(() => {
    setFilters({ search: "", status: "all", categoryId: "all" });
    setPage(1);
  }, []);

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  async function setFreelancerStatus(
    id: string,
    status: "suspended" | "approved" | "rejected",
    reason = ""
  ) {
    setConfirmWorking(true);
    try {
      if (status === "suspended") await suspendMut.mutateAsync({ id, reason });
      else if (status === "approved") await activateMut.mutateAsync(id);
      else await deactivateMut.mutateAsync({ id, reason });
      pushToast("success", "Freelancer updated.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "The action failed. Try again.");
    } finally {
      setConfirmWorking(false);
      setSuspendTarget(null);
      setActivateTarget(null);
      setDeactivateTarget(null);
    }
  }

  async function runFeature(freelancer: ManagedFreelancer, feature: boolean) {
    try {
      await (feature ? featureMut.mutateAsync : unfeatureMut.mutateAsync)(freelancer.id);
      pushToast(
        "success",
        feature
          ? `${freelancer.displayName} featured on the marketplace.`
          : `${freelancer.displayName} unfeatured.`
      );
    } catch {
      pushToast("error", "The action failed. Try again.");
    }
  }

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.categoryId !== "all";

  return (
    <>
      <AdminPageHeader
        title="Freelancers"
        description="Discover, inspect and manage freelancer profiles and marketplace services."
        actions={
          counts.data ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 py-1.5 text-xs font-medium text-kampmax-text-secondary">
              <BadgeCheck className="h-3.5 w-3.5" />
              {counts.data.all} freelancers
            </span>
          ) : null
        }
      />

      <div className="mb-4">
        <FreelancersFilters
          filters={filters}
          statusCounts={counts.data ?? null}
          categories={categories}
          onChange={patchFilters}
        />
      </div>

      <FreelancersTable
        campusNames={{}}
        page={data ?? null}
        loading={isLoading}
        error={!!error}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={toggleSort}
        onRetry={onRetry}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        onViewProfile={(f) => router.push(`/admin/freelancers/${f.id}`)}
        onSuspend={setSuspendTarget}
        onActivate={setActivateTarget}
        onDeactivate={setDeactivateTarget}
        onFeature={(f) => void runFeature(f, true)}
        onUnfeature={(f) => void runFeature(f, false)}
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
          unitLabel="freelancers"
        />
      )}

      {/* ---------- Overlays ---------- */}

      <ConfirmDialog
        open={suspendTarget !== null}
        title={`Suspend ${suspendTarget?.displayName ?? ""}?`}
        message="Their services are hidden from the marketplace immediately. The account stays recoverable via Activate."
        confirmLabel="Suspend freelancer"
        tone="warning"
        loading={confirmWorking}
        reasonLabel="Reason for suspension (recorded in the audit log)"
        onConfirm={(reason) => suspendTarget && void setFreelancerStatus(suspendTarget.id, "suspended", reason)}
        onCancel={() => setSuspendTarget(null)}
      />

      <ConfirmDialog
        open={activateTarget !== null}
        title={`Activate ${activateTarget?.displayName ?? ""}?`}
        message="Approval restores full marketplace visibility and lets this freelancer take bookings again."
        confirmLabel="Activate freelancer"
        tone="default"
        loading={confirmWorking}
        onConfirm={() => activateTarget && void setFreelancerStatus(activateTarget.id, "approved")}
        onCancel={() => setActivateTarget(null)}
      />

      <ConfirmDialog
        open={deactivateTarget !== null}
        title={`Reject ${deactivateTarget?.displayName ?? ""}?`}
        message="The profile is retired and hidden from the marketplace. Reactivation requires an explicit admin decision."
        confirmLabel="Reject freelancer"
        tone="danger"
        loading={confirmWorking}
        reasonLabel="Reason for rejection (emailed to the freelancer)"
        onConfirm={(reason) => deactivateTarget && void setFreelancerStatus(deactivateTarget.id, "rejected", reason)}
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