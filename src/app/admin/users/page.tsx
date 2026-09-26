"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Users, XCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  DeactivateConfirm,
  ResetStateConfirm,
  SuspendConfirm,
} from "@/components/admin/ConfirmDialog";
import { Pagination } from "@/components/admin/Pagination";
import { EditUserDialog } from "@/components/admin/users/EditUserDialog";
import { UsersFilters, type UsersFilterState } from "@/components/admin/users/UsersFilters";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { useDebounce } from "@/hooks/use-debounce";
import { getUserActionPolicy } from "@/services/admin";
import {
  useAdminUserCampuses,
  useAdminUserCounts,
  useAdminUserResetStateMutation,
  useAdminUserSetStatusMutation,
  useAdminUserUpdateMutation,
  useAdminUsers,
} from "@/hooks/admin/use-admin-users";
import { useActionGuard } from "@/hooks/admin/use-action-guard";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from "@/components/admin/users/users-meta";
import type {
  ManagedUserListItem,
  ManagedUserRole,
  ManagedUserStatus,
  ManagedUserUpdateInput,
  SortDir,
} from "@/types/admin";
import type { ManagedUserSortField } from "@/services/admin";

type PendingConfirm = {
  kind: "suspend" | "deactivate" | "reset";
  user: ManagedUserListItem;
};

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function parseInitialFilters(params: URLSearchParams): UsersFilterState {
  const rawStatus = params.get("status");
  const status =
    rawStatus && rawStatus in USER_STATUS_LABELS ? (rawStatus as ManagedUserStatus) : "all";
  const rawRole = params.get("role");
  const role =
    rawRole && rawRole in USER_ROLE_LABELS ? (rawRole as ManagedUserRole) : "all";
  return {
    search: params.get("q") ?? "",
    role,
    campusId: params.get("campus") ?? "all",
    status,
  };
}

function parsePage(params: URLSearchParams): { page: number; pageSize: number } {
  const rawPage = Number(params.get("page"));
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const rawSize = Number(params.get("pageSize"));
  const pageSize = PAGE_SIZE_OPTIONS.includes(rawSize) ? rawSize : 10;
  return { page, pageSize };
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<UsersSkeleton />}>
      <AdminUsersPageInner />
    </Suspense>
  );
}

function AdminUsersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { admin } = useAdminSession();
  const isCampusScoped = admin?.role === "CAMPUS_ADMIN";

  // ----- filters / query state (URL-persisted) -----
  const [filters, setFilters] = useState<UsersFilterState>(() => {
    const initial = parseInitialFilters(new URLSearchParams(searchParams.toString()));
    // Campus-scoped operators only ever see their own campus; the scope is
    // enforced in the service layer, so the selector stays neutral here.
    if (admin?.role === "CAMPUS_ADMIN") initial.campusId = "all";
    return initial;
  });
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 350);
  const [sortBy, setSortBy] = useState<ManagedUserSortField>("joinedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [{ page, pageSize }, setPageState] = useState(() =>
    parsePage(new URLSearchParams(searchParams.toString()))
  );

  // Keep the debounced query in sync with the immediate input.
  useEffect(() => {
    setFilters((f) => (f.search === debouncedSearch ? f : { ...f, search: debouncedSearch }));
  }, [debouncedSearch]);

  // Mirror filter state to the URL so views stay deep-linkable/shareable.
  const urlQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.search.trim()) p.set("q", filters.search.trim());
    if (filters.role !== "all") p.set("role", filters.role);
    if (filters.campusId !== "all" && !isCampusScoped) p.set("campus", filters.campusId);
    if (filters.status !== "all") p.set("status", filters.status);
    if (page > 1) p.set("page", String(page));
    if (pageSize !== 10) p.set("pageSize", String(pageSize));
    return p.toString();
  }, [filters, page, pageSize, isCampusScoped]);

  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const target = urlQuery ? `/admin/users?${urlQuery}` : "/admin/users";
    router.replace(target, { scroll: false });
  }, [urlQuery, router]);

  // ----- data (TanStack Query) -----
  const listQuery = useAdminUsers({
    search: filters.search,
    role: filters.role,
    campusId: filters.campusId,
    status: filters.status,
    sortBy,
    sortDir,
    page,
    pageSize,
  });
  const countsQuery = useAdminUserCounts();
  const campusesQuery = useAdminUserCampuses();
  const campusOptions = useMemo(() => campusesQuery.data ?? [], [campusesQuery.data]);
  const campusNames = useMemo(
    () => Object.fromEntries(campusOptions.map((c) => [c.id, c.label])),
    [campusOptions]
  );

  // ----- mutations -----
  const setStatusMutation = useAdminUserSetStatusMutation();
  const updateMutation = useAdminUserUpdateMutation();
  const resetMutation = useAdminUserResetStateMutation();

  // ----- overlays -----
  const [editingUser, setEditingUser] = useState<ManagedUserListItem | null>(null);
  const [softSaving, setSoftSaving] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [confirmWorking, setConfirmWorking] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);
  const { runExclusive } = useActionGuard();

  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  // ----- handlers -----

  const patchFilters = useCallback((patch: Partial<UsersFilterState>) => {
    if ("search" in patch) setSearchInput(patch.search ?? "");
    setFilters((f) => ({ ...f, ...patch }));
    setPageState((s) => ({ ...s, page: 1 }));
  }, []);

  const toggleSort = useCallback(
    (field: ManagedUserSortField) => {
      if (field === sortBy) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortDir(field === "name" ? "asc" : "desc");
      }
      setPageState((s) => ({ ...s, page: 1 }));
    },
    [sortBy]
  );

  function openUser(user: ManagedUserListItem) {
    router.push(`/admin/users/${user.id}`);
  }

  async function runSetStatus(
    user: ManagedUserListItem,
    status: ManagedUserStatus,
    successMessage: string
  ) {
    await runExclusive(`user-status:${user.id}:${status}`, async () => {
      const result = await setStatusMutation.mutateAsync({ id: user.id, status });
      if (result.ok) {
        pushToast("success", successMessage);
      } else {
        pushToast("error", result.message);
      }
    });
  }

  async function runConfirmedAction() {
    if (!pendingConfirm) return;
    const { kind, user } = pendingConfirm;
    setConfirmWorking(true);
    try {
      if (kind === "suspend") {
        await runSetStatus(user, "suspended", `${user.name} has been suspended.`);
      } else if (kind === "deactivate") {
        await runSetStatus(user, "deactivated", `${user.name}'s account was deactivated.`);
      } else {
        const result = await resetMutation.mutateAsync(user.id);
        if (result.ok) {
          pushToast("success", `${user.name}'s account state was reset.`);
        } else {
          pushToast("error", result.message);
        }
      }
    } finally {
      setConfirmWorking(false);
      setPendingConfirm(null);
    }
  }

  async function saveEdit(patch: ManagedUserUpdateInput) {
    if (!editingUser) return;
    setSoftSaving(true);
    try {
      const result = await updateMutation.mutateAsync({ id: editingUser.id, patch });
      if (result.ok) {
        setEditingUser(null);
        pushToast("success", `${result.user.name} was updated successfully.`);
      } else {
        pushToast("error", result.message);
      }
    } finally {
      setSoftSaving(false);
    }
  }

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.role !== "all" ||
    filters.campusId !== "all" ||
    filters.status !== "all";

  const readyData = listQuery.data ?? null;
  const loading = listQuery.isPending && !listQuery.data;

  // Keep the effective page canonical when the dataset shrank (e.g. search).
  useEffect(() => {
    if (readyData && readyData.totalPages > 0 && page > readyData.totalPages) {
      setPageState((s) => ({ ...s, page: readyData.totalPages }));
    }
  }, [readyData, page]);

  return (
    <>
      <AdminPageHeader
        title="Users"
        description="Every account on Kampmax - customers, vendors and staff."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 py-1.5 text-xs font-medium text-kampmax-text-secondary">
            <Users className="h-3.5 w-3.5" />
            {countsQuery.data ? `${countsQuery.data.all.toLocaleString("en-NG")} total accounts` : "…"}
          </span>
        }
      />

      <div className="mb-4">
        <UsersFilters
          filters={{ ...filters, search: searchInput }}
          campuses={campusOptions}
          counts={countsQuery.data ?? null}
          hideCampus={isCampusScoped}
          onChange={patchFilters}
        />
        {isCampusScoped && admin && (
          <p className="mt-2 text-xs text-kampmax-text-secondary">
            Scoped view — only {campusNames[admin.campusId ?? ""] ?? "your campus"}&apos;s
            accounts are shown, and account management is read-only.
          </p>
        )}
      </div>

      <UsersTable
        page={readyData}
        loading={loading}
        error={listQuery.isError}
        campusNames={campusNames}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={toggleSort}
        onRetry={() => listQuery.refetch()}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() =>
          patchFilters({ search: "", role: "all", campusId: "all", status: "all" })
        }
        getPolicy={(user) => getUserActionPolicy(admin!, user)}
        onView={openUser}
        onEdit={(u) => setEditingUser(u)}
        onViewActivity={openUser}
        onSuspend={(u) => setPendingConfirm({ kind: "suspend", user: u })}
        onActivate={(u) =>
          void runSetStatus(u, "active", `${u.name} can sign in again - account activated.`)
        }
        onDeactivate={(u) => setPendingConfirm({ kind: "deactivate", user: u })}
        onResetState={(u) => setPendingConfirm({ kind: "reset", user: u })}
      />

      {readyData && readyData.total > 0 && (
        <Pagination
          unitLabel="users"
          page={readyData.page}
          pageSize={pageSize}
          total={readyData.total}
          totalPages={readyData.totalPages}
          onPageChange={(n) => setPageState((s) => ({ ...s, page: n }))}
          onPageSizeChange={(n) => setPageState((s) => ({ ...s, pageSize: n, page: 1 }))}
        />
      )}

      {/* ---------- Overlays ---------- */}

      <EditUserDialog
        open={editingUser !== null}
        user={editingUser}
        saving={softSaving}
        onClose={() => !softSaving && setEditingUser(null)}
        onSave={saveEdit}
      />

      {/* Confirmation dialogs (destructive actions only) */}
      <SuspendConfirm
        open={pendingConfirm?.kind === "suspend"}
        userName={pendingConfirm?.user.name ?? ""}
        loading={confirmWorking}
        onConfirm={runConfirmedAction}
        onCancel={() => setPendingConfirm(null)}
      />
      <DeactivateConfirm
        open={pendingConfirm?.kind === "deactivate"}
        userName={pendingConfirm?.user.name ?? ""}
        loading={confirmWorking}
        onConfirm={runConfirmedAction}
        onCancel={() => setPendingConfirm(null)}
      />
      <ResetStateConfirm
        open={pendingConfirm?.kind === "reset"}
        userName={pendingConfirm?.user.name ?? ""}
        loading={confirmWorking}
        onConfirm={runConfirmedAction}
        onCancel={() => setPendingConfirm(null)}
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

function UsersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-64 animate-pulse rounded bg-kampmax-muted" />
      <div className="h-24 animate-pulse rounded-lg bg-white ring-1 ring-kampmax-border" />
      <div className="h-96 animate-pulse rounded-lg bg-white ring-1 ring-kampmax-border" />
    </div>
  );
}