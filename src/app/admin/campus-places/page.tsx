"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Plus } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CampusPlaceDialog } from "@/components/admin/campus-places/CampusPlaceDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import {
  useAdminCampusPlaces,
  useApproveCampusPlace,
  useDeleteCampusPlace,
  useRejectCampusPlace,
  useUpdateCampusPlace,
} from "@/hooks/admin/use-admin-campus-places";
import { useDebounce } from "@/hooks/use-debounce";
import { campusService } from "@/services/admin";
import {
  CAMPUS_PLACE_TYPES,
  CAMPUS_PLACE_TYPE_LABELS,
  type AdminCampusPlace,
  type CampusPlaceStatus,
  type CampusPlaceType,
} from "@/types/campus-places";

const PAGE_SIZE = 15;

type Tab = "PENDING" | "ACTIVE" | "HIDDEN" | "REJECTED";

const TABS: { value: Tab; label: string; count: "pending" | "active" | "hidden" | "rejected" }[] = [
  { value: "PENDING", label: "Suggestions", count: "pending" },
  { value: "ACTIVE", label: "Live", count: "active" },
  { value: "HIDDEN", label: "Hidden", count: "hidden" },
  { value: "REJECTED", label: "Rejected", count: "rejected" },
];

const EMPTY_COPY: Record<Tab, { title: string; message: string }> = {
  PENDING: {
    title: "No suggestions waiting",
    message: "Places students suggest from the app show up here for you to approve or reject.",
  },
  ACTIVE: { title: "No places on the map yet", message: "Add the first place with the button above." },
  HIDDEN: { title: "Nothing hidden", message: "Places you hide are kept here and can be shown again." },
  REJECTED: { title: "Nothing rejected", message: "Suggestions you turn down are listed here." },
};

const STATUS_STYLE: Record<CampusPlaceStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  HIDDEN: "bg-kampmax-muted text-kampmax-text-secondary",
  REJECTED: "bg-red-50 text-red-700",
};

const buttonClass =
  "inline-flex h-7 items-center rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-50";

export default function AdminCampusPlacesPage() {
  const [tab, setTab] = useState<Tab>("PENDING");
  const [campusId, setCampusId] = useState("");
  const [type, setType] = useState<CampusPlaceType | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminCampusPlace | null>(null);
  const [adding, setAdding] = useState(false);
  const [rejecting, setRejecting] = useState<AdminCampusPlace | null>(null);
  const [deleting, setDeleting] = useState<AdminCampusPlace | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search.trim(), 350);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const campuses = useQuery({ queryKey: ["admin", "campus-places", "campus-options"], queryFn: () => campusService.list() });
  const campusOptions = (campuses.data ?? []).map((c) => ({ id: c.id, name: c.name }));

  const { data, isPending, isError, refetch } = useAdminCampusPlaces({
    status: tab,
    campusId: campusId || undefined,
    type: type === "all" ? undefined : type,
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const approve = useApproveCampusPlace();
  const reject = useRejectCampusPlace();
  const update = useUpdateCampusPlace();
  const remove = useDeleteCampusPlace();
  const busy = approve.isPending || reject.isPending || update.isPending || remove.isPending;
  const filtered = Boolean(campusId) || type !== "all" || debouncedSearch.length > 0;

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Campus places"
        description="Gates, hostels, markets and other spots people use on each campus. Places you add are live at once; places students suggest wait here for your review."
        actions={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-blue px-3 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add place
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Place status" className="flex gap-1 border-b border-kampmax-border">
          {TABS.map((t) => {
            const active = tab === t.value;
            const count = data?.counts[t.count];
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(t.value);
                  setPage(1);
                }}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "border-kampmax-blue text-kampmax-blue"
                    : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
                )}
              >
                {t.label}
                {count !== undefined && (
                  <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-kampmax-text-secondary">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="places-search">
            Search places
          </label>
          <input
            id="places-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or other names…"
            className="h-9 w-full rounded-md border border-kampmax-border bg-white px-2.5 text-sm text-kampmax-text sm:w-56"
          />
          <label className="sr-only" htmlFor="places-campus">
            Filter by campus
          </label>
          <select
            id="places-campus"
            value={campusId}
            onChange={(e) => {
              setCampusId(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-kampmax-border bg-white px-2.5 text-sm text-kampmax-text"
          >
            <option value="">All campuses</option>
            {campusOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="places-type">
            Filter by type
          </label>
          <select
            id="places-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as CampusPlaceType | "all");
              setPage(1);
            }}
            className="h-9 rounded-md border border-kampmax-border bg-white px-2.5 text-sm text-kampmax-text"
          >
            <option value="all">All types</option>
            {CAMPUS_PLACE_TYPES.map((t) => (
              <option key={t} value={t}>
                {CAMPUS_PLACE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <section aria-label="Places" className="rounded-lg border border-kampmax-border bg-white">
        {isPending ? (
          <div className="p-4">
            <LoadingSkeleton variant="table" rows={5} />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title={filtered ? "No matching places" : EMPTY_COPY[tab].title}
            message={filtered ? "Try a different search, campus or type." : EMPTY_COPY[tab].message}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-kampmax-border text-xs text-kampmax-text-secondary">
                    <th scope="col" className="px-4 py-2 font-medium">Place</th>
                    <th scope="col" className="px-4 py-2 font-medium">Campus</th>
                    <th scope="col" className="px-4 py-2 font-medium">Type</th>
                    <th scope="col" className="px-4 py-2 font-medium">{tab === "PENDING" ? "Suggested" : "Added"}</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kampmax-border">
                  {data.items.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5">
                        <span className="block font-medium text-kampmax-text">{p.name}</span>
                        {p.aliases.length > 0 && (
                          <span className="block text-[11px] text-kampmax-text-secondary">
                            Also: {p.aliases.join(", ")}
                          </span>
                        )}
                        {p.status === "REJECTED" && p.rejectionReason && (
                          <span className="block text-[11px] text-red-700">Reason: {p.rejectionReason}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-kampmax-text-secondary">
                        {p.campusName ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className="text-kampmax-text-secondary">{CAMPUS_PLACE_TYPE_LABELS[p.type]}</span>
                        <span
                          className={cn(
                            "ml-2 rounded-full px-1.5 py-px text-[10px] font-semibold",
                            STATUS_STYLE[p.status]
                          )}
                        >
                          {p.status === "ACTIVE" ? "Live" : p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-kampmax-text-secondary">
                        {timeAgo(p.createdAt)}
                        {p.suggestedByStudent && (
                          <span className="block text-[11px]">by {p.suggestedByName ?? "a student"}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          {p.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void run(() => approve.mutateAsync(p.id))}
                                aria-label={`Approve ${p.name}`}
                                className={buttonClass}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setRejecting(p)}
                                aria-label={`Reject ${p.name}`}
                                className={buttonClass}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {(p.status === "ACTIVE" || p.status === "HIDDEN") && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void run(() =>
                                  update.mutateAsync({
                                    id: p.id,
                                    patch: { status: p.status === "ACTIVE" ? "HIDDEN" : "ACTIVE" },
                                  })
                                )
                              }
                              aria-label={`${p.status === "ACTIVE" ? "Hide" : "Show"} ${p.name}`}
                              className={buttonClass}
                            >
                              {p.status === "ACTIVE" ? "Hide" : "Show"}
                            </button>
                          )}
                          {p.status !== "REJECTED" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setEditing(p)}
                              aria-label={`Edit ${p.name}`}
                              className={buttonClass}
                            >
                              {p.status === "PENDING" ? "Review" : "Edit"}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setDeleting(p)}
                            aria-label={`Delete ${p.name}`}
                            className={cn(buttonClass, "text-kampmax-error")}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              totalPages={data.totalPages}
              onPageChange={setPage}
              unitLabel="places"
            />
          </>
        )}
      </section>

      <CampusPlaceDialog
        open={adding || editing !== null}
        place={editing}
        campuses={campusOptions}
        defaultCampusId={campusId || undefined}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={rejecting !== null}
        title="Reject this suggestion?"
        message={`“${rejecting?.name ?? ""}” will not be added to the map. The student is told why.`}
        confirmLabel="Reject"
        tone="warning"
        reasonLabel="Reason shown to the student"
        loading={reject.isPending}
        onCancel={() => setRejecting(null)}
        onConfirm={(reason) => {
          const target = rejecting;
          if (!target) return;
          void run(async () => {
            await reject.mutateAsync({ id: target.id, reason: reason.trim() });
            setRejecting(null);
          });
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this place?"
        message={`“${deleting?.name ?? ""}” is removed for good. To keep it but take it off the map, hide it instead.`}
        confirmLabel="Delete"
        tone="danger"
        loading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const target = deleting;
          if (!target) return;
          void run(async () => {
            await remove.mutateAsync(target.id);
            setDeleting(null);
          });
        }}
      />
    </>
  );
}
