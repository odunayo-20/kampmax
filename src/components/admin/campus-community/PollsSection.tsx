"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Lock, LockOpen, Search } from "lucide-react";
import { Pagination } from "@/components/admin/Pagination";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn, formatDateShort, timeAgo } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import {
  pollStatusLabel,
  pollStatusVariant,
} from "./campus-community-meta";
import { communityCampusName } from "./campus-community-utils";
import { CommunitySectionShell } from "./shared";
import { communityService } from "@/services/admin";
import type {
  ManagedPoll,
  ManagedPollStatus,
  CommunitySectionCounts,
  Paginated,
} from "@/types/admin";
import type { CampusOption } from "./PostsSection";

export function PollsSection({
  campusOptions,
  onToast,
}: {
  campusOptions: CampusOption[];
  onToast: (tone: "success" | "error", text: string) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim(), 350);
  const [status, setStatus] = useState<ManagedPollStatus | "all">("all");
  const [campusId, setCampusId] = useState("all");
  const [page, setPage] = useState(1);

  const [list, setList] = useState<Paginated<ManagedPoll> | null>(null);
  const [counts, setCounts] =
    useState<CommunitySectionCounts<ManagedPollStatus> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [closeTarget, setCloseTarget] = useState<ManagedPoll | null>(null);
  const [reopenTarget, setReopenTarget] = useState<ManagedPoll | null>(null);
  const [working, setWorking] = useState(false);

  const loadMeta = useCallback(async () => {
    try {
      setCounts(await communityService.getPollCounts());
    } catch {
      /* non-critical */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await communityService.listPolls({
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

  async function toggleStatus(
    p: ManagedPoll,
    next: ManagedPollStatus,
    successText: string
  ) {
    setWorking(true);
    try {
      await communityService.setPollStatus(p.id, next);
      onToast("success", successText);
      await Promise.all([loadList(), loadMeta()]);
    } catch (err) {
      onToast(
        "error",
        err instanceof Error ? err.message : "Couldn't update that poll."
      );
    } finally {
      setWorking(false);
    }
  }

  function voteShare(p: ManagedPoll, votes: number): number {
    return p.totalVotes === 0
      ? 0
      : Math.round((votes / p.totalVotes) * 100);
  }

  const hasActiveFilters =
    searchInput.trim().length > 0 || status !== "all" || campusId !== "all";

  return (
    <>
      <div
        role="tablist"
        aria-label="Filter polls by status"
        className="flex gap-1 overflow-x-auto border-b border-kampmax-border px-3 py-2 no-scrollbar"
      >
        {(["all", "active", "closed"] as const).map((tab) => (
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
            {tab === "all" ? "All" : pollStatusLabel(tab)}
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
            placeholder="Search polls…"
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Search polls"
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
        emptyTitle="No polls yet"
        emptyMessage="Campus polls give students a voice on operations and features."
        onRetry={() => void loadList()}
        onClearFilters={() => {
          setSearchInput("");
          setStatus("all");
          setCampusId("all");
        }}
      >
        {/* Cards grid (polls render best as cards at every breakpoint) */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {(list?.items ?? []).map((p) => (
            <article
              key={p.id}
              className="rounded-lg border border-kampmax-border bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-snug text-kampmax-text">
                    {p.question}
                  </h3>
                  <p className="mt-0.5 text-xs text-kampmax-text-secondary">
                    {communityCampusName(p.campusId)} · created{" "}
                    {formatDateShort(p.createdAt)}
                  </p>
                </div>
                <StatusBadge
                  variant={pollStatusVariant(p.status)}
                  label={pollStatusLabel(p.status)}
                />
              </div>

              {/* Options with vote bars */}
              <ul className="mt-3 space-y-2">
                {p.options.map((o) => {
                  const share = voteShare(p, o.votes);
                  return (
                    <li key={o.label}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-kampmax-text">
                          {o.label}
                        </span>
                        <span className="shrink-0 tabular-nums text-kampmax-text-secondary">
                          {share}% · {o.votes}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-kampmax-muted">
                        <div
                          className="h-full rounded-full bg-kampmax-blue/70"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-kampmax-border pt-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-kampmax-text-secondary">
                  <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                  {p.totalVotes.toLocaleString("en-NG")} total votes ·{" "}
                  {p.status === "active"
                    ? `ends ${formatDateShort(p.endsAt)}`
                    : `closed ${timeAgo(p.endsAt)}`}
                </span>
                <div className="flex items-center gap-1">
                  {p.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => setCloseTarget(p)}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-kampmax-border bg-white px-2.5 text-[11px] font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
                    >
                      <Lock className="h-3 w-3" />
                      Close poll
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReopenTarget(p)}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-kampmax-border bg-white px-2.5 text-[11px] font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
                    >
                      <LockOpen className="h-3 w-3" />
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {list && list.totalPages > 1 && (
          <Pagination
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            totalPages={list.totalPages}
            onPageChange={setPage}
            className="mt-3 rounded-lg border border-kampmax-border bg-white"
          />
        )}
      </CommunitySectionShell>

      <ConfirmDialog
        open={closeTarget !== null}
        title={`Close “${closeTarget?.question}”?`}
        message={
          closeTarget == null
            ? ""
            : `${closeTarget.totalVotes.toLocaleString("en-NG")} students have voted. Closing stops new votes immediately and publishes the final results to the feed.`
        }
        confirmLabel="Close poll"
        tone="warning"
        loading={working}
        onConfirm={() => {
          if (!closeTarget) return;
          const target = closeTarget;
          void toggleStatus(target, "closed", `“${target.question}” closed.`).then(() =>
            setCloseTarget(null)
          );
        }}
        onCancel={() => setCloseTarget(null)}
      />

      <ConfirmDialog
        open={reopenTarget !== null}
        title={`Reopen “${reopenTarget?.question}”?`}
        message="Voting reopens until the original end date, or for 3 more days if that date has passed. Consider whether the results already shown might change."
        confirmLabel="Reopen poll"
        tone="default"
        loading={working}
        onConfirm={() => {
          if (!reopenTarget) return;
          const target = reopenTarget;
          void toggleStatus(target, "active", `“${target.question}” reopened for voting.`).then(() =>
            setReopenTarget(null)
          );
        }}
        onCancel={() => setReopenTarget(null)}
      />
    </>
  );
}
