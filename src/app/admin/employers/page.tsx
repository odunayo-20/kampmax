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
import { CheckCircle2, Handshake, XCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Pagination } from "@/components/admin/Pagination";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import {
  EmployersFilters,
  type EmployersFilterState,
} from "@/components/admin/employers/EmployersFilters";
import { EmployersTable } from "@/components/admin/employers/EmployersTable";
import { validVerification } from "@/components/admin/employers/employers-meta";
import { employerManagementService } from "@/services/admin";
import {
  useAdminEmployers,
  useAdminEmployerCounts,
  useAdminEmployerApproveMutation,
  useAdminEmployerRejectMutation,
  useAdminEmployerRestoreMutation,
  useAdminEmployerCampuses,
  useAdminEmployerSuspendMutation,
} from "@/hooks/admin/use-admin-employers";
import { useDebounce } from "@/hooks/use-debounce";
import type { ManagedEmployer, SortDir } from "@/types/admin";
import type { ManagedEmployerSortField } from "@/services/admin";

type ListStatus = ManagedEmployer["status"] | "all";

const STATUS_KEYS: ListStatus[] = [
  "all",
  "active",
  "pending_review",
  "suspended",
  "rejected",
  "external",
  "incomplete",
];

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

function parseInitialFilters(params: URLSearchParams): EmployersFilterState {
  const rawStatus = params.get("status");
  const rawVerification = params.get("verification");
  return {
    search: params.get("search") ?? "",
    status:
      rawStatus && (STATUS_KEYS as string[]).includes(rawStatus)
        ? (rawStatus as ListStatus)
        : "all",
    verification:
      rawVerification && validVerification(rawVerification) ? rawVerification : "all",
    campusId: params.get("campusId") ?? "all",
    industry: params.get("industry") ?? "all",
  };
}

export default function AdminEmployersListPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" rows={8} />}>
      <AdminEmployersListPageInner />
    </Suspense>
  );
}

function AdminEmployersListPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ----- filter / query state -----
  const [filters, setFilters] = useState<EmployersFilterState>(() =>
    parseInitialFilters(new URLSearchParams(searchParams.toString()))
  );
  const [sortBy, setSortBy] = useState<ManagedEmployerSortField>("joinedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ----- overlays / feedback -----
  const [suspendTarget, setSuspendTarget] = useState<ManagedEmployer | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ManagedEmployer | null>(null);
  const [approveTarget, setApproveTarget] = useState<ManagedEmployer | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ManagedEmployer | null>(null);
  const [confirmWorking, setConfirmWorking] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);
  const [industries, setIndustries] = useState<string[]>([]);

  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  // ----- data hooks (always called at top level) -----
  const counts = useAdminEmployerCounts();
  const suspendMut = useAdminEmployerSuspendMutation();
  const restoreMut = useAdminEmployerRestoreMutation();
  const approveMut = useAdminEmployerApproveMutation();
  const rejectMut = useAdminEmployerRejectMutation();

  const campusesQuery = useAdminEmployerCampuses();
  const campusOptions = useMemo(
    () => (campusesQuery.data ?? []).map((c) => ({ id: c.id, name: c.label })),
    []
  );

  // Debounced search mirrors the vendors/users consoles.
  const debouncedFilters = useDebounce(filters.search.trim(), 350);
  const query = useMemo(
    () => ({
      search: debouncedFilters,
      status: filters.status === "all" ? undefined : filters.status,
      verification: filters.verification === "all" ? undefined : filters.verification,
      campusId: filters.campusId === "all" ? undefined : filters.campusId,
      industry: filters.industry === "all" ? undefined : filters.industry,
      sortBy,
      sortDir,
      page,
      pageSize,
    }),
    [debouncedFilters, filters.status, filters.verification, filters.campusId, filters.industry, sortBy, sortDir, page, pageSize]
  );

  const { data, error, isLoading, refetch } = useAdminEmployers(query);

  // ----- metadata (industries for the filter panel) -----
  useEffect(() => {
    employerManagementService
      .getIndustries()
      .then(setIndustries)
      .catch(() => {
        /* non-critical metadata */
      });
  }, []);

  // ----- handlers -----

  const patchFilters = useCallback((patch: Partial<EmployersFilterState>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const toggleSort = useCallback(
    (field: ManagedEmployerSortField) => {
      if (field === sortBy) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortDir(field === "name" ? "asc" : "desc");
      }
      setPage(1);
    },
    [sortBy]
  );

  const clearFilters = useCallback(() => {
    setFilters({ search: "", status: "all", verification: "all", campusId: "all", industry: "all" });
    setPage(1);
  }, []);

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  async function runEmployerAction(
    employer: ManagedEmployer,
    action: "suspend" | "restore" | "approve" | "reject",
    reason = ""
  ) {
    setConfirmWorking(true);
    try {
      if (action === "suspend") await suspendMut.mutateAsync({ id: employer.id, reason });
      else if (action === "restore") await restoreMut.mutateAsync(employer.id);
      else if (action === "approve") await approveMut.mutateAsync(employer.id);
      else await rejectMut.mutateAsync({ id: employer.id, reason });
      pushToast("success", "Employer updated.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "The action failed. Try again.");
    } finally {
      setConfirmWorking(false);
      setSuspendTarget(null);
      setRestoreTarget(null);
      setApproveTarget(null);
      setRejectTarget(null);
    }
  }

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.verification !== "all" ||
    filters.campusId !== "all" ||
    filters.industry !== "all";

  return (
    <>
      <AdminPageHeader
        title="Employers"
        description="Discover, inspect and manage employers and clients, their profiles and hiring activity."
        actions={
          counts.data ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 py-1.5 text-xs font-medium text-kampmax-text-secondary">
              <Handshake className="h-3.5 w-3.5" />
              {counts.data.all} employers
            </span>
          ) : null
        }
      />

      <div className="mb-4">
        <EmployersFilters
          filters={filters}
          statusCounts={counts.data ?? null}
          campusOptions={campusOptions}
          industries={industries}
          onChange={patchFilters}
        />
      </div>

      <EmployersTable
        page={data ?? null}
        loading={isLoading}
        error={!!error}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={toggleSort}
        onRetry={onRetry}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        onViewProfile={(e) => router.push(`/admin/employers/${e.id}`)}
        onApprove={setApproveTarget}
        onReject={setRejectTarget}
        onSuspend={setSuspendTarget}
        onRestore={setRestoreTarget}
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
          unitLabel="employers"
        />
      )}

      {/* ---------- Overlays ---------- */}

      <ConfirmDialog
        open={suspendTarget !== null}
        title={`Suspend ${suspendTarget?.name ?? ""}?`}
        message="Their employer profile is suspended immediately. The profile stays recoverable via Restore."
        confirmLabel="Suspend employer"
        tone="warning"
        loading={confirmWorking}
        reasonLabel="Reason for suspension (emailed to the employer)"
        onConfirm={(reason) => suspendTarget && void runEmployerAction(suspendTarget, "suspend", reason)}
        onCancel={() => setSuspendTarget(null)}
      />

      <ConfirmDialog
        open={restoreTarget !== null}
        title={`Restore ${restoreTarget?.name ?? ""}?`}
        message="Restoring returns the employer profile to active status and lets this employer operate again."
        confirmLabel="Restore employer"
        tone="default"
        loading={confirmWorking}
        onConfirm={() => restoreTarget && void runEmployerAction(restoreTarget, "restore")}
        onCancel={() => setRestoreTarget(null)}
      />

      <ConfirmDialog
        open={approveTarget !== null}
        title={`Approve ${approveTarget?.name ?? ""}?`}
        message="Approval activates this employer profile. The public profile becomes discoverable."
        confirmLabel="Approve employer"
        tone="default"
        loading={confirmWorking}
        onConfirm={() => approveTarget && void runEmployerAction(approveTarget, "approve")}
        onCancel={() => setApproveTarget(null)}
      />

      <ConfirmDialog
        open={rejectTarget !== null}
        title={`Reject ${rejectTarget?.name ?? ""}?`}
        message="The employer profile is rejected and closed for onboarding. Reactivation requires an explicit admin decision."
        confirmLabel="Reject employer"
        tone="danger"
        loading={confirmWorking}
        reasonLabel="Reason for rejection (emailed to the employer)"
        onConfirm={(reason) => rejectTarget && void runEmployerAction(rejectTarget, "reject", reason)}
        onCancel={() => setRejectTarget(null)}
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