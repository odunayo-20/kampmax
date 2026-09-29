"use client";

import { Search, RotateCcw } from "lucide-react";
import { AUDIT_RESULT_ORDER, AUDIT_SEVERITY_ORDER, auditResultLabel } from "./audit-logs-meta";
import type {
  ManagedAuditLogActor,
  ManagedAuditLogQuery,
  ManagedAuditLogResult,
  ManagedAuditLogSeverity,
} from "@/types/admin";

export interface AuditFilterState {
  search: string;
  action: string;
  resourceType: string;
  result: ManagedAuditLogResult | "all";
  severity: ManagedAuditLogSeverity | "all";
  actorId: string;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_AUDIT_FILTERS: AuditFilterState = {
  search: "",
  action: "all",
  resourceType: "all",
  result: "all",
  severity: "all",
  actorId: "all",
  dateFrom: "",
  dateTo: "",
};

/** Builds a server query from the URL-persisted filter state. */
export function auditQueryFromFilter(state: AuditFilterState): ManagedAuditLogQuery {
  const query: ManagedAuditLogQuery = {};
  const search = state.search.trim();
  if (search) query.search = search;
  if (state.action !== "all") query.action = state.action;
  if (state.resourceType !== "all") query.resourceType = state.resourceType;
  if (state.result !== "all") query.result = state.result;
  if (state.severity !== "all") query.severity = state.severity;
  if (state.actorId !== "all") query.actorId = state.actorId;
  if (state.dateFrom) query.dateFrom = state.dateFrom;
  if (state.dateTo) query.dateTo = state.dateTo;
  return query;
}

export function hasAuditFilters(state: AuditFilterState): boolean {
  return Object.keys(auditQueryFromFilter(state)).length > 0;
}

interface AuditLogFiltersProps {
  state: AuditFilterState;
  actors: ManagedAuditLogActor[];
  actorsLoading: boolean;
  onChange: (next: AuditFilterState) => void;
  onReset: () => void;
}

const SELECT_CLASS =
  "h-9 rounded-md border border-kampmax-border bg-white px-2.5 py-0 text-[13px] text-kampmax-text focus:outline-none focus:ring-1 focus:ring-kampmax-blue";

const LABEL_CLASS =
  "block text-[11px] font-medium uppercase tracking-wide text-kampmax-text-secondary";

/** Server-side filter bar (search is debounced + URL-persisted by the page). Action/resource are free-text — the real vocabulary is open-ended, not a fixed dropdown. */
export function AuditLogFilters({
  state,
  actors,
  actorsLoading,
  onChange,
  onReset,
}: AuditLogFiltersProps) {
  const set = (patch: Partial<AuditFilterState>) => onChange({ ...state, ...patch });

  return (
    <div className="rounded-lg border border-kampmax-border bg-white p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <label className={LABEL_CLASS} htmlFor="audit-search">
            Search
          </label>
          <Search className="pointer-events-none absolute bottom-2.5 left-2.5 h-4 w-4 text-kampmax-text-secondary" aria-hidden />
          <input
            id="audit-search"
            type="search"
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Action, resource, actor…"
            className="h-9 w-full rounded-md border border-kampmax-border bg-white pl-9 pr-2.5 text-[13px] text-kampmax-text placeholder:text-kampmax-text-secondary focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
          />
        </div>

        <label>
          <span className={LABEL_CLASS}>Severity</span>
          <select
            value={state.severity}
            onChange={(e) => set({ severity: e.target.value as AuditFilterState["severity"] })}
            className={SELECT_CLASS}
          >
            <option value="all">All severities</option>
            {AUDIT_SEVERITY_ORDER.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className={LABEL_CLASS}>Result</span>
          <select
            value={state.result}
            onChange={(e) => set({ result: e.target.value as AuditFilterState["result"] })}
            className={SELECT_CLASS}
          >
            <option value="all">All results</option>
            {AUDIT_RESULT_ORDER.map((r) => (
              <option key={r} value={r}>
                {auditResultLabel(r)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className={LABEL_CLASS}>Actor</span>
          <select
            value={state.actorId}
            onChange={(e) => set({ actorId: e.target.value })}
            className={SELECT_CLASS}
            disabled={actorsLoading}
          >
            <option value="all">All actors</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className={LABEL_CLASS}>From</span>
            <input
              type="date"
              value={state.dateFrom}
              max={state.dateTo || undefined}
              onChange={(e) => set({ dateFrom: e.target.value })}
              className="h-9 rounded-md border border-kampmax-border bg-white px-2.5 text-[13px] text-kampmax-text focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
            />
          </label>
          <label>
            <span className={LABEL_CLASS}>To</span>
            <input
              type="date"
              value={state.dateTo}
              min={state.dateFrom || undefined}
              onChange={(e) => set({ dateTo: e.target.value })}
              className="h-9 rounded-md border border-kampmax-border bg-white px-2.5 text-[13px] text-kampmax-text focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text hover:bg-kampmax-muted/60"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Reset filters
        </button>
      </div>
    </div>
  );
}
