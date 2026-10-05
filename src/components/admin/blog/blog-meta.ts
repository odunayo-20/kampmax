import type { ArticleStatus } from "@/types/blog";

export const STATUS_LABEL: Record<ArticleStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

/** Tabs on the article list; `all` means no status filter. */
export const STATUS_TABS: (ArticleStatus | "all")[] = ["all", "DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"];

export const STATUS_TONE: Record<ArticleStatus, string> = {
  DRAFT: "bg-kampmax-muted text-kampmax-text-secondary ring-kampmax-border",
  SCHEDULED: "bg-info-50 text-info-700 ring-info-100",
  PUBLISHED: "bg-primary-50 text-primary-700 ring-primary-100",
  ARCHIVED: "bg-warning-50 text-warning-700 ring-warning-100",
};

export const FIELD_CLASS =
  "w-full rounded-lg border border-kampmax-border bg-white px-3 py-2 text-sm text-kampmax-text placeholder:text-kampmax-text-muted focus:border-kampmax-blue focus:outline-none focus:ring-1 focus:ring-kampmax-blue disabled:bg-kampmax-muted disabled:text-kampmax-text-muted";

export const BUTTON_PRIMARY =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-kampmax-navy px-3.5 text-sm font-medium text-white transition-colors hover:bg-kampmax-navy-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kampmax-blue disabled:cursor-not-allowed disabled:opacity-60";

export const BUTTON_SECONDARY =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3.5 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue disabled:cursor-not-allowed disabled:opacity-60";

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `datetime-local` input value (local time) from an ISO string. */
export function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO string from a `datetime-local` value; null when empty/invalid. */
export function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Mirrors the backend slug rules so the slug field previews what will be generated. */
export function slugifyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
