"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, MapPin, Search, UserRound, XCircle } from "lucide-react";
import { Pagination } from "@/components/admin/Pagination";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn, formatDateShort, formatTime } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import {
  EVENT_STATUS_FILTER_ORDER,
  eventStatusLabel,
  eventStatusVariant,
} from "./campus-community-meta";
import { communityCampusName } from "./campus-community-utils";
import {
  AuthorCell,
  CommunitySectionShell,
  RowMenu,
} from "./shared";
import { AuthorDialog } from "./AuthorDialog";
import { communityService } from "@/services/admin";
import type {
  CommunityAuthor,
  CommunityEvent,
  CommunityEventStatus,
  CommunitySectionCounts,
  Paginated,
} from "@/types/admin";
import type { CampusOption } from "./PostsSection";

function attendanceLabel(e: CommunityEvent): string {
  return e.capacity === null
    ? `${e.attendeeCount} going`
    : `${e.attendeeCount}/${e.capacity}`;
}

export function EventsSection({
  campusOptions,
  onToast,
}: {
  campusOptions: CampusOption[];
  onToast: (tone: "success" | "error", text: string) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim(), 350);
  const [status, setStatus] = useState<CommunityEventStatus | "all">("all");
  const [campusId, setCampusId] = useState("all");
  const [page, setPage] = useState(1);

  const [list, setList] = useState<Paginated<CommunityEvent> | null>(null);
  const [counts, setCounts] =
    useState<CommunitySectionCounts<CommunityEventStatus> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [author, setAuthor] = useState<CommunityAuthor | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CommunityEvent | null>(null);
  const [working, setWorking] = useState(false);

  const loadMeta = useCallback(async () => {
    try {
      setCounts(await communityService.getEventCounts());
    } catch {
      /* non-critical */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await communityService.listEvents({
        search: search || undefined,
        status,
        campusId,
        page,
        pageSize: 10,
      });
      setList(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search, status, campusId, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  async function cancelEvent(e: CommunityEvent, successText: string) {
    setWorking(true);
    try {
      await communityService.cancelEvent(e.id);
      onToast("success", successText);
      await Promise.all([loadList(), loadMeta()]);
    } catch (err) {
      onToast(
        "error",
        err instanceof Error ? err.message : "Couldn't update that event."
      );
    } finally {
      setWorking(false);
    }
  }

  const hasActiveFilters =
    searchInput.trim().length > 0 || status !== "all" || campusId !== "all";

  return (
    <>
      <div
        role="tablist"
        aria-label="Filter events by status"
        className="flex gap-1 overflow-x-auto border-b border-kampmax-border px-3 py-2 no-scrollbar"
      >
        {(["all", ...EVENT_STATUS_FILTER_ORDER] as const).map((tab) => (
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
              "-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-1.5 text-[13px] font-medium transition-colors",
              status === tab
                ? "border-kampmax-blue text-kampmax-blue"
                : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
            )}
          >
            {tab === "all" ? "All" : eventStatusLabel(tab)}
            {counts && (
              <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums">
                {tab === "all" ? counts.all : counts.byStatus[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="my-3 flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <Input
            value={searchInput}
            placeholder="Search title or venue…"
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Search events"
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={campusId}
          aria-label="Filter by campus"
          onChange={(e) => {
            setCampusId(e.target.value);
            setPage(1);
          }}
          className="w-auto h-9 text-xs sm:max-w-44"
        >
          <option value="all">All campuses</option>
          {campusOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.shortName} - {c.name}
            </option>
          ))}
        </Select>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setStatus("all");
              setCampusId("all");
            }}
            className="text-xs font-medium text-kampmax-blue hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <CommunitySectionShell
        loading={loading && !list}
        error={error}
        isEmpty={(list?.items.length ?? 0) === 0}
        hasActiveFilters={hasActiveFilters}
        emptyTitle="No events found"
        emptyMessage="Campus events created by students and organisers will appear here."
        onRetry={() => void loadList()}
        onClearFilters={() => {
          setSearchInput("");
          setStatus("all");
          setCampusId("all");
        }}
      >
        <div className="hidden overflow-hidden rounded-lg border border-kampmax-border bg-white md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className="border-b border-kampmax-border bg-kampmax-muted/40 text-[11px] uppercase tracking-wide text-kampmax-text-secondary">
                  <th scope="col" className="px-4 py-2.5 font-medium">Event</th>
                  <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">Organiser</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Campus</th>
                  <th scope="col" className="hidden px-3 py-2.5 font-medium xl:table-cell">Schedule</th>
                  <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">Attendance</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                  <th scope="col" className="w-10 px-2 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kampmax-border">
                {(list?.items ?? []).map((e) => (
                  <tr key={e.id} className="transition-colors hover:bg-kampmax-muted/40">
                    <td className="max-w-[260px] px-4 py-2.5">
                      <p className="truncate font-medium text-kampmax-text">{e.title}</p>
                      <span className="inline-flex items-center gap-1 truncate text-xs text-kampmax-text-secondary">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        {e.venue}
                      </span>
                    </td>
                    <td className="hidden max-w-[160px] px-3 py-2.5 lg:table-cell">
                      <AuthorCell name={e.organizer.name} onViewAuthor={() => setAuthor(e.organizer)} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-kampmax-text-secondary">
                      {communityCampusName(e.campusId)}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 tabular-nums text-kampmax-text-secondary xl:table-cell">
                      <CalendarDays className="mr-1 inline h-3 w-3" aria-hidden />
                      {formatDateShort(e.startsAt)} · {formatTime(e.startsAt)}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 md:table-cell">
                      <span className="text-xs tabular-nums text-kampmax-text">
                        {attendanceLabel(e)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge
                        variant={eventStatusVariant(e.status)}
                        label={eventStatusLabel(e.status)}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <RowMenu
                        label={e.title}
                        actions={[
                          ...(e.status === "upcoming" || e.status === "live"
                            ? [
                                {
                                  key: "cancel",
                                  label: "Cancel event",
                                  icon: XCircle,
                                  danger: true,
                                  onSelect: () => setCancelTarget(e),
                                },
                              ]
                            : []),
                          {
                            key: "author",
                            label: "View organiser",
                            icon: UserRound,
                            onSelect: () => setAuthor(e.organizer),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <ul className="space-y-2.5 md:hidden">
          {(list?.items ?? []).map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-kampmax-border bg-white p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium text-kampmax-text">
                    {e.title}
                  </h3>
                  <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-kampmax-text-secondary">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                    {e.venue} · {communityCampusName(e.campusId)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAuthor(e.organizer)}
                    className="mt-0.5 block truncate text-left text-[11px] font-medium text-kampmax-blue"
                  >
                    {e.organizer.name}
                  </button>
                </div>
                <StatusBadge
                  variant={eventStatusVariant(e.status)}
                  label={eventStatusLabel(e.status)}
                />
              </div>

              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-dashed border-kampmax-border pt-2 text-xs">
                <div className="min-w-0">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-kampmax-text-secondary">
                    Starts
                  </dt>
                  <dd className="tabular-nums text-kampmax-text">
                    {formatDateShort(e.startsAt)} · {formatTime(e.startsAt)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-kampmax-text-secondary">
                    Attendance
                  </dt>
                  <dd className="tabular-nums text-kampmax-text">
                    {attendanceLabel(e)}
                  </dd>
                </div>
              </dl>

              {(e.status === "live" || e.status === "upcoming") && (
                <div className="mt-2.5 flex items-center justify-end gap-1">
                  <button
                    type="button"
                    title="Cancel event"
                    onClick={() => setCancelTarget(e)}
                    className="rounded-md p-1.5 text-kampmax-error transition-colors hover:bg-red-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {list && list.totalPages > 1 && (
          <Pagination
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            totalPages={list.totalPages}
            onPageChange={setPage}
            className="rounded-b-lg border border-t-0 border-kampmax-border bg-white"
          />
        )}
      </CommunitySectionShell>

      <AuthorDialog author={author} onClose={() => setAuthor(null)} />

      <ConfirmDialog
        open={cancelTarget !== null}
        title={`Cancel “${cancelTarget?.title}”?`}
        message={
          cancelTarget == null
            ? ""
            : `The event is marked as cancelled and removed from the events board. ${cancelTarget.attendeeCount} attendee${cancelTarget.attendeeCount === 1 ? " is" : "s are"} registered; they are not notified automatically. This cannot be undone.`
        }
        confirmLabel="Cancel event"
        tone="danger"
        loading={working}
        onConfirm={() => {
          if (!cancelTarget) return;
          const target = cancelTarget;
          void cancelEvent(target, `“${target.title}” was cancelled.`).then(() =>
            setCancelTarget(null)
          );
        }}
        onCancel={() => setCancelTarget(null)}
      />
    </>
  );
}
