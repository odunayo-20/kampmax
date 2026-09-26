"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, Pencil, PlusCircle, RotateCcw, Search } from "lucide-react";
import { Pagination } from "@/components/admin/Pagination";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn, formatDateShort, timeAgo } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import {
  ANNOUNCEMENT_STATUS_FILTER_ORDER,
  announcementPriorityLabel,
  announcementStatusLabel,
  announcementStatusVariant,
} from "./campus-community-meta";
import { communityCampusName, previewText } from "./campus-community-utils";
import { CommunitySectionShell, RowMenu } from "./shared";
import {
  AnnouncementFormDialog,
} from "./AnnouncementFormDialog";
import { communityService } from "@/services/admin";
import type {
  AnnouncementInput,
  AnnouncementStatus,
  ManagedAnnouncement,
  CommunitySectionCounts,
  Paginated,
} from "@/types/admin";
import type { CampusOption } from "./PostsSection";

type FormTarget =
  | { mode: "create" }
  | { mode: "edit"; a: ManagedAnnouncement }
  | null;

type PendingAction =
  | { kind: "publish"; a: ManagedAnnouncement }
  | { kind: "archive"; a: ManagedAnnouncement }
  | null;

export function AnnouncementsSection({
  campusOptions,
  onToast,
}: {
  campusOptions: CampusOption[];
  onToast: (tone: "success" | "error", text: string) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim(), 350);
  const [status, setStatus] = useState<AnnouncementStatus | "all">("all");
  const [page, setPage] = useState(1);

  const [list, setList] = useState<Paginated<ManagedAnnouncement> | null>(null);
  const [counts, setCounts] =
    useState<CommunitySectionCounts<AnnouncementStatus> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [working, setWorking] = useState(false);

  const loadMeta = useCallback(async () => {
    try {
      setCounts(await communityService.getAnnouncementCounts());
    } catch {
      /* non-critical */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await communityService.listAnnouncements({
        search: search || undefined,
        status,
        page,
        pageSize: 10,
      });
      setList(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  async function submitForm(input: AnnouncementInput) {
    if (!formTarget) return;
    setFormSaving(true);
    try {
      if (formTarget.mode === "edit") {
        await communityService.updateAnnouncement(formTarget.a.id, {
          title: input.title,
          body: input.body,
          priority: input.priority,
        });
        onToast("success", `“${input.title}” updated.`);
      } else {
        await communityService.createAnnouncement(input);
        onToast("success", `“${input.title}” is live.`);
      }
      setFormTarget(null);
      await Promise.all([loadList(), loadMeta()]);
    } catch (err) {
      onToast(
        "error",
        err instanceof Error ? err.message : "Couldn't save the announcement."
      );
    } finally {
      setFormSaving(false);
    }
  }

  async function runAction(action: NonNullable<PendingAction>) {
    setWorking(true);
    try {
      switch (action.kind) {
        case "publish":
          await communityService.publishAnnouncement(action.a.id);
          onToast("success", `“${action.a.title}” is live again.`);
          break;
        case "archive":
          await communityService.archiveAnnouncement(action.a.id);
          onToast("success", `“${action.a.title}” archived.`);
          break;
      }
      setPending(null);
      await Promise.all([loadList(), loadMeta()]);
    } catch (err) {
      onToast(
        "error",
        err instanceof Error ? err.message : "Couldn't update the announcement."
      );
      setPending(null);
    } finally {
      setWorking(false);
    }
  }

  /** Which lifecycle actions each status allows. */
  function actionsFor(a: ManagedAnnouncement) {
    return {
      edit: a.status === "published",
      publish: a.status === "archived",
      archive: a.status === "published",
    };
  }

  const hasActiveFilters = searchInput.trim().length > 0 || status !== "all";

  return (
    <>
      <div
        role="tablist"
        aria-label="Filter announcements by status"
        className="flex gap-1 overflow-x-auto border-b border-kampmax-border px-3 py-2 no-scrollbar"
      >
        <button
          type="button"
          role="tab"
          aria-selected={status === "all"}
          onClick={() => {
            setStatus("all");
            setPage(1);
          }}
          className={cn(
            "-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-1.5 text-[13px] font-medium transition-colors",
            status === "all"
              ? "border-kampmax-blue text-kampmax-blue"
              : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
          )}
        >
          All
          {counts && (
            <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums">
              {counts.all}
            </span>
          )}
        </button>
        {ANNOUNCEMENT_STATUS_FILTER_ORDER.map((tab) => (
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
            {announcementStatusLabel(tab)}
            {counts && (
              <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums">
                {counts.byStatus[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="my-3 flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <Input
            value={searchInput}
            placeholder="Search announcements…"
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Search announcements"
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setStatus("all");
            }}
            className="text-xs font-medium text-kampmax-blue hover:underline"
          >
            Clear filters
          </button>
        )}
        <button
          type="button"
          onClick={() => setFormTarget({ mode: "create" })}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-blue px-3 text-sm font-medium text-white transition-colors hover:bg-kampmax-blue/90"
        >
          <PlusCircle className="h-4 w-4" />
          New announcement
        </button>
      </div>

      <CommunitySectionShell
        loading={loading && !list}
        error={error}
        isEmpty={(list?.items.length ?? 0) === 0}
        hasActiveFilters={hasActiveFilters}
        emptyTitle="No announcements yet"
        emptyMessage="Create your first broadcast to reach students across campuses."
        onRetry={() => void loadList()}
        onClearFilters={() => {
          setSearchInput("");
          setStatus("all");
        }}
      >
        <div className="hidden overflow-hidden rounded-lg border border-kampmax-border bg-white md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-kampmax-border bg-kampmax-muted/40 text-[11px] uppercase tracking-wide text-kampmax-text-secondary">
                  <th scope="col" className="px-4 py-2.5 font-medium">Announcement</th>
                  <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">Priority</th>
                  <th scope="col" className="hidden px-3 py-2.5 font-medium xl:table-cell">Audience</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Publish date</th>
                  <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">Created by</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                  <th scope="col" className="w-10 px-2 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kampmax-border">
                {(list?.items ?? []).map((a) => {
                  const allowed = actionsFor(a);
                  return (
                    <tr key={a.id} className="transition-colors hover:bg-kampmax-muted/40">
                      <td className="max-w-[300px] px-4 py-2.5">
                        <p className="truncate font-medium text-kampmax-text">
                          {a.title}
                        </p>
                        <p
                          className="mt-0.5 line-clamp-1 text-xs text-kampmax-text-secondary"
                          title={a.body}
                        >
                          {previewText(a.body, 80)}
                        </p>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-kampmax-text-secondary lg:table-cell">
                        {announcementPriorityLabel(a.priority)}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 xl:table-cell">
                        {a.campusIds.length === 0 ? (
                          <span className="text-kampmax-text-secondary">
                            Network-wide
                          </span>
                        ) : (
                          <span className="font-medium text-kampmax-text">
                            {a.campusIds.map(communityCampusName).join(", ")}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-kampmax-text-secondary">
                        {a.publishAt ? (
                          formatDateShort(a.publishAt)
                        ) : (
                          <span className="text-kampmax-text-secondary">-</span>
                        )}
                        <span className="ml-1.5 hidden text-[11px] 2xl:inline">
                          {a.publishAt ? timeAgo(a.publishAt) : ""}
                        </span>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-kampmax-text-secondary md:table-cell">
                        {a.createdBy}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          variant={announcementStatusVariant(a.status)}
                          label={announcementStatusLabel(a.status)}
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        <RowMenu
                          label={a.title}
                          actions={[
                            ...(allowed.edit
                              ? [
                                  {
                                    key: "edit",
                                    label: "Edit",
                                    icon: Pencil,
                                    onSelect: () =>
                                      setFormTarget({ mode: "edit", a }),
                                  },
                                ]
                              : []),
                            ...(allowed.publish
                              ? [
                                  {
                                    key: "publish",
                                    label: "Restore",
                                    icon: RotateCcw,
                                    onSelect: () =>
                                      setPending({ kind: "publish", a }),
                                  },
                                ]
                              : []),
                            ...(allowed.archive
                              ? [
                                  {
                                    key: "archive",
                                    label: "Archive",
                                    icon: Archive,
                                    onSelect: () =>
                                      setPending({ kind: "archive", a }),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <ul className="space-y-2.5 md:hidden">
          {(list?.items ?? []).map((a) => {
            const allowed = actionsFor(a);
            return (
              <li
                key={a.id}
                className="rounded-lg border border-kampmax-border bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 text-sm font-medium leading-snug text-kampmax-text">
                    {a.title}
                  </h3>
                  <StatusBadge
                    variant={announcementStatusVariant(a.status)}
                    label={announcementStatusLabel(a.status)}
                  />
                </div>

                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-kampmax-text-secondary">
                  {previewText(a.body, 120)}
                </p>

                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-dashed border-kampmax-border pt-2 text-xs">
                  <MetaCell label="Priority">
                    {announcementPriorityLabel(a.priority)}
                  </MetaCell>
                  <MetaCell label="Audience">
                    {a.campusIds.length === 0
                      ? "Network-wide"
                      : a.campusIds.map(communityCampusName).join(", ")}
                  </MetaCell>
                  <MetaCell label="Publish date">
                    {a.publishAt ? formatDateShort(a.publishAt) : "-"}
                  </MetaCell>
                  <MetaCell label="Created by">{a.createdBy}</MetaCell>
                </dl>

                <div className="mt-2.5 flex items-center justify-end gap-1.5">
                  {allowed.edit && (
                    <button
                      type="button"
                      title="Edit announcement"
                      onClick={() => setFormTarget({ mode: "edit", a })}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-kampmax-border bg-white px-2.5 text-[11px] font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                  {allowed.publish && (
                    <button
                      type="button"
                      title="Restore announcement"
                      onClick={() => setPending({ kind: "publish", a })}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-kampmax-blue/30 bg-kampmax-blue/10 px-2.5 text-[11px] font-medium text-kampmax-blue transition-colors hover:bg-kampmax-blue/15"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restore
                    </button>
                  )}
                  {allowed.archive && (
                    <button
                      type="button"
                      title="Archive"
                      onClick={() => setPending({ kind: "archive", a })}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-kampmax-border bg-white px-2.5 text-[11px] font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
                    >
                      <Archive className="h-3 w-3" />
                      Archive
                    </button>
                  )}
                </div>
              </li>
            );
          })}
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

      <AnnouncementFormDialog
        open={formTarget !== null}
        announcement={formTarget?.mode === "edit" ? formTarget.a : null}
        campusOptions={campusOptions}
        loading={formSaving}
        onClose={() => setFormTarget(null)}
        onSubmit={(input) => void submitForm(input)}
      />

      <ConfirmDialog
        open={pending?.kind === "publish"}
        title={`Restore “${pending?.a.title}”?`}
        message={
          pending?.kind === "publish"
            ? pending.a.campusIds.length === 0
              ? "This is shown network-wide again immediately."
              : `This goes live again for ${pending.a.campusIds.map(communityCampusName).join(", ")} immediately.`
            : ""
        }
        confirmLabel="Restore"
        tone="default"
        loading={working}
        onConfirm={() => pending && void runAction(pending)}
        onCancel={() => setPending(null)}
      />

      <ConfirmDialog
        open={pending?.kind === "archive"}
        title={`Archive “${pending?.a.title}”?`}
        message="The announcement is pulled from campus feeds but stays in history. You can restore it later."
        confirmLabel="Archive"
        tone="warning"
        loading={working}
        onConfirm={() => pending && void runAction(pending)}
        onCancel={() => setPending(null)}
      />
    </>
  );
}

function MetaCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-kampmax-text-secondary">
        {label}
      </dt>
      <dd
        className="truncate text-kampmax-text"
        title={typeof children === "string" ? children : undefined}
      >
        {children}
      </dd>
    </div>
  );
}
