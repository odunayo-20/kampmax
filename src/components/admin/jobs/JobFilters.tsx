"use client";

import { ClipboardList, RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type {
  ManagedJobFacets,
  ManagedJobPublication,
  ManagedJobStatus,
  ManagedJobStatusCounts,
} from "@/types/admin";
import type { OpportunityType, OpportunityWorkArrangement } from "@/types/opportunity";
import { OPPORTUNITY_TYPE_META, OPPORTUNITY_TYPE_ORDER } from "@/config/opportunity";
import {
  ARRANGEMENT_LABELS,
  ARRANGEMENT_OPTIONS,
  JOB_PUBLICATION_LABELS,
  JOB_PUBLICATION_OPTIONS,
  JOB_STATUS_DOTS,
  JOB_STATUS_LABELS,
  JOB_STATUS_TABS,
} from "./jobs-meta";

export interface JobFilterState {
  search: string;
  status: ManagedJobStatus | "all";
  publication: ManagedJobPublication | "all";
  categoryId: string | "all";
  campusId: string | "all";
  employerId: string | "all";
  arrangement: OpportunityWorkArrangement | "all";
  opportunityType: OpportunityType | "all";
}

export const DEFAULT_JOB_FILTERS: JobFilterState = {
  search: "",
  status: "all",
  publication: "all",
  categoryId: "all",
  campusId: "all",
  employerId: "all",
  arrangement: "all",
  opportunityType: "all",
};

interface JobFiltersProps {
  filters: JobFilterState;
  counts: ManagedJobStatusCounts | null;
  facets: ManagedJobFacets | null;
  onChange: (patch: Partial<JobFilterState>) => void;
}

export function JobFilters({ filters, counts, facets, onChange }: JobFiltersProps) {
  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.publication !== "all" ||
    filters.categoryId !== "all" ||
    filters.campusId !== "all" ||
    filters.employerId !== "all" ||
    filters.arrangement !== "all" ||
    filters.opportunityType !== "all";

  return (
    <div className="rounded-lg border border-kampmax-border bg-white">
      {/* Status tabs */}
      <div
        role="tablist"
        aria-label="Filter jobs by status"
        className="flex gap-1 overflow-x-auto border-b border-kampmax-border px-3 py-2 no-scrollbar"
      >
        {JOB_STATUS_TABS.map((key) => (
          <StatusTab
            key={key}
            active={filters.status === key}
            label={key === "all" ? "All jobs" : JOB_STATUS_LABELS[key]}
            count={key === "all" ? counts?.all ?? null : counts?.[key] ?? null}
            dotClass={key === "all" ? undefined : JOB_STATUS_DOTS[key]}
            onClick={() => onChange({ status: key })}
          />
        ))}
      </div>

      {/* Search + selects */}
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="w-full sm:max-w-xs">
          <Input
            aria-label="Search jobs"
            placeholder="Search job, ID, employer or skill…"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            leftIcon={<Search className="h-4 w-4" />}
            className="h-9"
          />
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <Select
            label="type"
            value={filters.opportunityType}
            onChange={(v) => onChange({ opportunityType: v as OpportunityType | "all" })}
          >
            <option value="all">Any type</option>
            {OPPORTUNITY_TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {OPPORTUNITY_TYPE_META[t].label}
              </option>
            ))}
          </Select>

          <Select
            label="publication"
            value={filters.publication}
            onChange={(v) => onChange({ publication: v as ManagedJobPublication | "all" })}
          >
            {JOB_PUBLICATION_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {key === "all" ? "Any publication" : JOB_PUBLICATION_LABELS[key]}
              </option>
            ))}
          </Select>

          <Select
            label="category"
            value={filters.categoryId}
            onChange={(v) => onChange({ categoryId: v === "all" ? "all" : v })}
          >
            <option value="all">All categories</option>
            {(facets?.categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.count})
              </option>
            ))}
          </Select>

          <Select
            label="campus"
            value={filters.campusId}
            onChange={(v) => onChange({ campusId: v === "all" ? "all" : v })}
          >
            <option value="all">All campuses</option>
            {(facets?.campuses ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.count})
              </option>
            ))}
          </Select>

          <Select
            label="employer"
            value={filters.employerId}
            onChange={(v) => onChange({ employerId: v === "all" ? "all" : v })}
          >
            <option value="all">All employers</option>
            {(facets?.employers ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.count})
              </option>
            ))}
          </Select>

          <Select
            label="arrangement"
            value={filters.arrangement}
            onChange={(v) =>
              onChange({ arrangement: v as OpportunityWorkArrangement | "all" })
            }
          >
            {ARRANGEMENT_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {key === "all" ? "Any arrangement" : ARRANGEMENT_LABELS[key]}
              </option>
            ))}
          </Select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => onChange({ ...DEFAULT_JOB_FILTERS })}
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
        <ClipboardList aria-hidden className="h-3 w-3 opacity-60" />
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

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      aria-label={`Filter by ${label}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 min-w-[150px] rounded-lg border border-kampmax-border bg-white px-2.5 text-sm text-kampmax-text focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
    >
      {children}
    </select>
  );
}