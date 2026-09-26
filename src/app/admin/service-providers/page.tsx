"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Search, Wrench, XCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  ProviderActionDialog,
  type ProviderActionTarget,
} from "@/components/admin/service-providers/ProviderActionDialog";
import {
  PROVIDER_STATUS_LABELS,
  PROVIDER_STATUS_ORDER,
  providerActions,
  providerStatusVariant,
  type ProviderActionKind,
} from "@/components/admin/service-providers/provider-meta";
import {
  useAdminServiceProviderCounts,
  useAdminServiceProviderFilters,
  useAdminServiceProviders,
} from "@/hooks/admin/use-admin-service-providers";
import { useDebounce } from "@/hooks/use-debounce";
import { cn, formatDate, formatNaira } from "@/lib/utils";
import type {
  ManagedServiceProvider,
  ServiceProviderStatus,
} from "@/services/admin/service-provider-management.api";

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

const ACTION_LABELS: Record<ProviderActionKind, string> = {
  approve: "Approve",
  reject: "Reject",
  suspend: "Suspend",
  restore: "Restore",
};

export default function AdminServiceProvidersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 350);
  const [status, setStatus] = useState<ServiceProviderStatus | "all">("all");
  const [providerType, setProviderType] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [target, setTarget] = useState<ProviderActionTarget | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);
  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const query = useMemo(
    () => ({
      search: debouncedSearch,
      status,
      providerType,
      category,
      page,
      pageSize,
    }),
    [debouncedSearch, status, providerType, category, page, pageSize]
  );
  const list = useAdminServiceProviders(query);
  const counts = useAdminServiceProviderCounts();
  const filters = useAdminServiceProviderFilters();

  const hasFilters =
    search.trim() !== "" || status !== "all" || providerType !== "all" || category !== "all";
  const data = list.data;

  function reset() {
    setSearch("");
    setStatus("all");
    setProviderType("all");
    setCategory("all");
    setPage(1);
  }

  return (
    <>
      <AdminPageHeader
        title="Service providers"
        description="Review, approve and moderate everyone who offers bookable services on Kampmax."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 py-1.5 text-xs font-medium text-kampmax-text-secondary">
            <Wrench className="h-3.5 w-3.5" />
            {counts.data ? `${counts.data.all.toLocaleString("en-NG")} providers` : "…"}
          </span>
        }
      />

      <div
        role="tablist"
        aria-label="Filter providers by status"
        className="mb-3 flex gap-1 overflow-x-auto border-b border-kampmax-border no-scrollbar"
      >
        {PROVIDER_STATUS_ORDER.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={status === tab}
            onClick={() => {
              setStatus(tab);
              setPage(1);
            }}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
              status === tab
                ? "border-kampmax-blue text-kampmax-blue"
                : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
            )}
          >
            {tab === "all" ? "All" : PROVIDER_STATUS_LABELS[tab]}
            {counts.data && (
              <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums">
                {counts.data[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kampmax-text-secondary" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, slug or email…"
            aria-label="Search service providers"
            className="h-9 w-full rounded-lg border border-kampmax-border bg-white pl-9 pr-3 text-sm focus:border-kampmax-blue focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
          />
        </div>
        <select
          value={providerType}
          onChange={(e) => {
            setProviderType(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by provider type"
          className="h-9 rounded-lg border border-kampmax-border bg-white px-2.5 text-sm"
        >
          <option value="all">All types</option>
          {(filters.data?.providerTypes ?? []).map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by category"
          className="h-9 rounded-lg border border-kampmax-border bg-white px-2.5 text-sm"
        >
          <option value="all">All categories</option>
          {(filters.data?.categories ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            className="text-xs font-medium text-kampmax-blue hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {list.isPending ? (
        <LoadingSkeleton variant="table" rows={8} />
      ) : list.isError ? (
        <div className="rounded-lg border border-kampmax-border bg-white">
          <ErrorState
            title="Couldn't load service providers"
            message={list.error instanceof Error ? list.error.message : undefined}
            onRetry={() => void list.refetch()}
          />
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No service providers found"
          message={
            hasFilters
              ? "Try clearing a filter or searching for something else."
              : "Providers appear here once people set up a service provider profile."
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-kampmax-border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-kampmax-border bg-kampmax-muted/40 text-[11px] uppercase tracking-wide text-kampmax-text-secondary">
                    <th scope="col" className="px-4 py-2.5 font-medium">Provider</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Categories</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Services</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Bookings</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Revenue</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Joined</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kampmax-border">
                  {data.items.map((p) => (
                    <ProviderRow
                      key={p.id}
                      provider={p}
                      onAction={(kind) => setTarget({ id: p.id, name: p.displayName, kind })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination
            unitLabel="providers"
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
        </>
      )}

      <ProviderActionDialog
        target={target}
        onClose={() => setTarget(null)}
        onDone={pushToast}
      />

      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex max-w-sm items-start gap-2 rounded-lg border border-kampmax-border bg-white px-3.5 py-2.5 text-sm shadow-lg"
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

function ProviderRow({
  provider: p,
  onAction,
}: {
  provider: ManagedServiceProvider;
  onAction: (kind: ProviderActionKind) => void;
}) {
  const actions = providerActions(p.status);
  return (
    <tr className="transition-colors hover:bg-kampmax-muted/40">
      <td className="max-w-[260px] px-4 py-2.5">
        <Link
          href={`/admin/service-providers/${p.id}`}
          className="block truncate font-medium text-kampmax-text hover:text-kampmax-blue"
        >
          {p.displayName}
        </Link>
        <p className="truncate text-xs text-kampmax-text-secondary">
          {p.email}
          {p.location ? ` · ${p.location}` : ""}
        </p>
      </td>
      <td className="max-w-[180px] truncate px-3 py-2.5 text-kampmax-text-secondary">
        {p.categories.length > 0 ? p.categories.join(", ") : "—"}
      </td>
      <td className="px-3 py-2.5 tabular-nums">
        {p.activeServices}/{p.servicesCount}
      </td>
      <td className="px-3 py-2.5 tabular-nums">
        {p.bookingsCompleted}/{p.bookingsTotal}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{formatNaira(p.revenue)}</td>
      <td className="px-3 py-2.5">
        <StatusBadge
          variant={providerStatusVariant(p.status)}
          label={PROVIDER_STATUS_LABELS[p.status]}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-kampmax-text-secondary">
        {formatDate(p.joinedAt)}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap justify-end gap-1">
          {(Object.keys(actions) as ProviderActionKind[])
            .filter((k) => actions[k])
            .map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => onAction(kind)}
                className={cn(
                  "inline-flex h-7 items-center rounded-md border px-2 text-[11px] font-medium transition-colors",
                  kind === "reject" || kind === "suspend"
                    ? "border-kampmax-error/30 text-kampmax-error hover:bg-kampmax-error/5"
                    : "border-kampmax-border text-kampmax-text hover:bg-kampmax-muted/60"
                )}
              >
                {ACTION_LABELS[kind]}
              </button>
            ))}
        </div>
      </td>
    </tr>
  );
}
