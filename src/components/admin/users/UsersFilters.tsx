"use client";

import { Building2, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { ManagedUserRole, ManagedUserStatus, UserStatusCounts } from "@/types/admin";
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from "./users-meta";

export interface UsersFilterState {
  search: string;
  role: ManagedUserRole | "all";
  campusId: string | "all";
  status: ManagedUserStatus | "all";
}

interface CampusOption {
  id: string;
  label: string;
}

interface UsersFiltersProps {
  filters: UsersFilterState;
  campuses: CampusOption[];
  counts: UserStatusCounts | null;
  onChange: (patch: Partial<UsersFilterState>) => void;
  /** Hides the campus selector for campus-scoped operators (scope is enforced server-side). */
  hideCampus?: boolean;
}

export function UsersFilters({
  filters,
  campuses,
  counts,
  onChange,
  hideCampus = false,
}: UsersFiltersProps) {
  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.role !== "all" ||
    filters.campusId !== "all" ||
    filters.status !== "all";

  return (
    <div className="rounded-lg border border-kampmax-border bg-white">
      {/* Status tabs */}
      <div
        role="tablist"
        aria-label="Filter by account status"
        className="flex gap-1 overflow-x-auto border-b border-kampmax-border px-3 py-2 no-scrollbar"
      >
        <StatusTab
          active={filters.status === "all"}
          count={counts?.all ?? null}
          label="All users"
          onClick={() => onChange({ status: "all" })}
        />
        {(Object.keys(USER_STATUS_LABELS) as ManagedUserStatus[]).map((status) => (
          <StatusTab
            key={status}
            active={filters.status === status}
            count={counts?.[status] ?? null}
            label={USER_STATUS_LABELS[status]}
            dotClass={STATUS_TAB_DOT[status]}
            onClick={() => onChange({ status })}
          />
        ))}
      </div>

      {/* Search + selects */}
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-xs">
          <Input
            aria-label="Search users"
            placeholder="Search name, email, phone or store…"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            leftIcon={<Search className="h-4 w-4" />}
            className="h-9"
          />
        </div>

        <div className="flex flex-1 items-center gap-2 sm:justify-end">
          <SlidersHorizontal className="hidden h-3.5 w-3.5 shrink-0 text-kampmax-text-secondary sm:block" aria-hidden />
          <select
            aria-label="Filter by role"
            value={filters.role}
            onChange={(e) => onChange({ role: e.target.value as ManagedUserRole | "all" })}
            className="h-9 min-w-[130px] rounded-lg border border-kampmax-border bg-white px-2.5 text-sm text-kampmax-text focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
          >
            <option value="all">All roles</option>
            {/* The platform has no campus-admin role, so it isn't offered as a filter. */}
            {(Object.keys(USER_ROLE_LABELS) as ManagedUserRole[])
              .filter((role) => role !== "campus_admin")
              .map((role) => (
              <option key={role} value={role}>
                {USER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>

          {hideCampus ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-kampmax-border bg-kampmax-muted/40 px-2.5 text-xs font-medium text-kampmax-text-secondary">
              <Building2 className="h-3.5 w-3.5" />
              Scope: {campuses[0]?.label ?? "your campus"}
            </span>
          ) : (
            <select
              aria-label="Filter by campus"
              value={filters.campusId}
              onChange={(e) => onChange({ campusId: e.target.value })}
              className="h-9 max-w-[190px] rounded-lg border border-kampmax-border bg-white px-2.5 text-sm text-kampmax-text focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
            >
              <option value="all">All campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() =>
                onChange({ search: "", role: "all", campusId: "all", status: "all" })
              }
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-kampmax-blue transition-colors hover:bg-kampmax-blue/5"
            >
              <RotateCcw className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_TAB_DOT: Record<ManagedUserStatus, string> = {
  active: "bg-kampmax-success",
  suspended: "bg-kampmax-warning",
  pending_verification: "bg-kampmax-info",
  deactivated: "bg-kampmax-text-secondary/50",
};

function StatusTab({
  active,
  label,
  count,
  onClick,
  dotClass,
}: {
  active: boolean;
  label: string;
  count: number | null;
  onClick: () => void;
  dotClass?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-kampmax-navy text-white"
          : "text-kampmax-text-secondary hover:bg-kampmax-muted hover:text-kampmax-text"
      )}
    >
      {dotClass ? (
        <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
      ) : (
        <Building2 aria-hidden className="h-3 w-3 opacity-60" />
      )}
      {label}
      {count !== null && (
        <span
          className={cn(
            "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
            active ? "bg-white/20 text-white" : "bg-kampmax-muted text-kampmax-text-secondary"
          )}
        >
          {count.toLocaleString("en-NG")}
        </span>
      )}
    </button>
  );
}
