"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BadgeCheck,
  ClipboardList,
  ExternalLink,
  Handshake,
  MoreVertical,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import type { ManagedJobRow, Paginated, SortDir } from "@/types/admin";
import type { ManagedJobSortField } from "@/services/admin";
import {
  ArrangementBadge,
  JobPublicationBadge,
  JobStatusBadge,
} from "./JobBadges";
import { formatJobBudget } from "./jobs-meta";
import { OpportunityTypeBadge } from "@/components/employer/jobs/OpportunityTypeBadge";

interface JobsTableProps {
  page: Paginated<ManagedJobRow> | null;
  loading: boolean;
  error: boolean;
  sortBy: ManagedJobSortField;
  sortDir: SortDir;
  onSort: (field: ManagedJobSortField) => void;
  onRetry: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function JobsTable({
  page,
  loading,
  error,
  sortBy,
  sortDir,
  onSort,
  onRetry,
  hasActiveFilters,
  onClearFilters,
}: JobsTableProps) {
  const router = useRouter();

  if (loading && !page) {
    return <LoadingSkeleton variant="table" rows={6} />;
  }

  if (error && !page) {
    return <ErrorState onRetry={onRetry} />;
  }

  if (!page || page.items.length === 0) {
    return (
      <div className="rounded-lg border border-kampmax-border bg-white p-4">
        <EmptyState
          title="No jobs found"
          message={
            hasActiveFilters
              ? "No jobs match the current search and filters."
              : "Jobs posted on the platform will appear here."
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex h-9 items-center rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
              >
                Clear filters
              </button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-kampmax-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1320px] text-sm">
          <thead>
            <tr className="border-b border-kampmax-border bg-kampmax-muted/50 text-left text-xs uppercase tracking-wide text-kampmax-text-secondary">
              <SortableTh
                label="Job"
                active={sortBy === "title"}
                dir={sortDir}
                onClick={() => onSort("title")}
              />
              <Th>Employer</Th>
              <Th>Campus</Th>
              <Th>Category</Th>
              <Th>Work</Th>
              <Th>Budget</Th>
              <SortableTh
                label="Applications"
                active={sortBy === "applications"}
                dir={sortDir}
                onClick={() => onSort("applications")}
              />
              <Th>Status</Th>
              <SortableTh
                label="Views"
                active={sortBy === "viewCount"}
                dir={sortDir}
                onClick={() => onSort("viewCount")}
                className="hidden xl:table-cell"
              />
              <SortableTh
                label="Posted"
                active={sortBy === "postedAt"}
                dir={sortDir}
                onClick={() => onSort("postedAt")}
              />
              <SortableTh
                label="Deadline"
                active={sortBy === "deadline"}
                dir={sortDir}
                onClick={() => onSort("deadline")}
                className="hidden xl:table-cell"
              />
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kampmax-border/70">
            {page.items.map((job) => (
              <Row
                key={job.id}
                job={job}
                onOpen={() => router.push(`/admin/jobs/${job.id}`)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {page.items.length} of {page.total} jobs, page {page.page} of{" "}
        {page.totalPages}.
      </p>
    </div>
  );
}

// ------------------------------------------------------------
// Header cells
// ------------------------------------------------------------

function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn("whitespace-nowrap px-4 py-2.5 font-medium", className)}
    >
      {children}
    </th>
  );
}

function SortableTh({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-4 py-2.5 font-medium", className)}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap uppercase tracking-wide transition-colors hover:text-kampmax-text",
          active && "text-kampmax-text"
        )}
      >
        {label}
        <Icon
          className={cn("h-3 w-3", active ? "text-kampmax-blue" : "opacity-50")}
        />
      </button>
    </th>
  );
}

// ------------------------------------------------------------
// Rows
// ------------------------------------------------------------

function Row({ job, onOpen }: { job: ManagedJobRow; onOpen: () => void }) {
  return (
    <tr className="group transition-colors hover:bg-kampmax-muted/40">
      {/* Job */}
      <td className="px-4 py-2.5">
        <button
          type="button"
          onClick={onOpen}
          title={`Open ${job.title}`}
          className="flex items-center gap-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kampmax-muted text-kampmax-text-secondary">
            <ClipboardList className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block max-w-[230px] truncate font-medium text-kampmax-text group-hover:text-kampmax-blue">
              {job.title}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5">
              <OpportunityTypeBadge type={job.opportunityType ?? "gig"} />
              <span className="font-mono text-[11px] text-kampmax-text-secondary">{job.id}</span>
            </span>
          </span>
        </button>
      </td>

      {/* Employer */}
      <td className="max-w-[180px] px-4 py-2.5">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-kampmax-text-secondary">{job.employerName}</span>
          {job.employerVerified && (
            <BadgeCheck
              aria-label="Verified employer"
              className="h-3.5 w-3.5 shrink-0 text-kampmax-success"
            />
          )}
        </span>
        {job.organizationName && (
          <span className="block truncate text-[11px] text-kampmax-text-secondary/70">
            {job.organizationName}
          </span>
        )}
      </td>

      {/* Campus */}
      <td className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-kampmax-text-secondary">
        {job.campusName ?? "—"}
      </td>

      {/* Category */}
      <td className="whitespace-nowrap px-4 py-2.5 text-kampmax-text-secondary">
        {job.categoryName}
      </td>

      {/* Work arrangement */}
      <td className="px-4 py-2.5">
        <ArrangementBadge arrangement={job.workArrangement} />
      </td>

      {/* Budget */}
      <td className="whitespace-nowrap px-4 py-2.5 font-medium tabular-nums text-kampmax-text">
        {formatJobBudget(job.budgetMin, job.budgetMax)}
      </td>

      {/* Applications */}
      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-kampmax-text-secondary">
        {job.applications}
      </td>

      {/* Status */}
      <td className="px-4 py-2.5">
        <div className="flex flex-col items-start gap-1">
          <JobStatusBadge status={job.status} />
          <JobPublicationBadge publication={job.publication} />
        </div>
      </td>

      {/* Views */}
      <td className="hidden whitespace-nowrap px-4 py-2.5 tabular-nums text-kampmax-text-secondary xl:table-cell">
        {job.viewCount.toLocaleString("en-NG")}
      </td>

      {/* Posted */}
      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-kampmax-text-secondary">
        {formatDate(job.postedAt)}
      </td>

      {/* Deadline */}
      <td className="hidden whitespace-nowrap px-4 py-2.5 tabular-nums text-kampmax-text-secondary xl:table-cell">
        {formatDate(job.deadline)}
      </td>

      {/* Actions */}
      <td className="px-4 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex h-8 items-center rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted"
          >
            Inspect
          </button>
          <RowActionsMenu job={job} onOpen={onOpen} />
        </div>
      </td>
    </tr>
  );
}

// ------------------------------------------------------------
// Row kebab menu (fixed-position so table overflow can't clip it)
// ------------------------------------------------------------

const MENU_WIDTH = 236;

function RowActionsMenu({ job, onOpen }: { job: ManagedJobRow; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const left = Math.max(
        8,
        Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)
      );
      const below = rect.bottom + 6;
      const top =
        below + 220 > window.innerHeight && rect.top - 240 > 0 ? rect.top - 240 : below;
      setCoords({ top, left });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${job.title}`}
        onClick={toggle}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text",
          open && "bg-kampmax-muted text-kampmax-text"
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && coords && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`${job.title} actions`}
          style={{ top: coords.top, left: coords.left, width: MENU_WIDTH }}
          className="fixed z-50 overflow-hidden rounded-lg border border-kampmax-border bg-white py-1 shadow-lg"
        >
          <MenuItem
            icon={ClipboardList}
            label="Full job detail"
            onClick={() => {
              setOpen(false);
              onOpen();
            }}
          />
          <MenuItem
            icon={ExternalLink}
            label="View public job"
            onClick={() => {
              setOpen(false);
              window.open(`/jobs/${job.id}`, "_blank", "noopener,noreferrer");
            }}
          />
          <MenuItem
            icon={Handshake}
            label="Open employer profile"
            onClick={() => {
              setOpen(false);
              window.open(`/admin/employers/${job.employerId}`, "_blank", "noopener,noreferrer");
            }}
          />
          <div className="my-1 border-t border-kampmax-border/60">
            <span className="block px-3 py-1.5 text-[11px] font-medium text-kampmax-text-secondary">
              {job.applications} application{job.applications === 1 ? "" : "s"} ·{" "}
              {job.viewCount.toLocaleString("en-NG")} views
            </span>
          </div>
        </div>
      )}
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof ClipboardList;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}