"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flag, Loader2, MessageCircle, MessagesSquare, X } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDate } from "@/lib/utils";
import { communityService } from "@/services/admin";
import type { CommunityAuthorSummary } from "@/services/admin/community.service";
import type { CommunityAuthor } from "@/types/admin";

/**
 * "View author" dialog: resolves the community author to their
 * platform profile plus a moderation summary of their activity.
 */
export function AuthorDialog({
  author,
  onClose,
}: {
  author: CommunityAuthor | null;
  onClose: () => void;
}) {
  const [summary, setSummary] = useState<CommunityAuthorSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!author) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setSummary(null);
    communityService
      .getAuthorSummary(author.id)
      .then((s) => {
        if (cancelled) return;
        setSummary(s);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [author]);

  useEffect(() => {
    if (!author) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [author, onClose]);

  if (!author) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Author profile - ${author.name}`}
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-xl border border-kampmax-border bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-kampmax-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-kampmax-text">
              Author profile
            </h2>
            <p className="mt-0.5 truncate text-xs text-kampmax-text-secondary">
              {author.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1 rounded-md p-1 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-kampmax-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading profile…
          </div>
        ) : error || !summary ? (
          <div className="px-5 py-10 text-center text-sm text-kampmax-text-secondary">
            Couldn&apos;t load this author&apos;s profile.
          </div>
        ) : (
          <div className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-kampmax-blue/10 text-sm font-semibold text-kampmax-blue">
                  {summary.name
                    .split(/\s+/)
                    .map((w) => w.charAt(0))
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-kampmax-text">
                    {summary.name}
                  </p>
                  <p className="truncate text-xs text-kampmax-text-secondary">
                    {summary.email}
                  </p>
                </div>
              </div>
              <StatusBadge
                variant={
                  summary.status === "ACTIVE"
                    ? "success"
                    : summary.status === "SUSPENDED"
                      ? "error"
                      : "warning"
                }
                label={summary.status.toLowerCase().replace(/_/g, " ")}
              />
            </div>

            <dl className="mt-4 space-y-2 border-t border-dashed border-kampmax-border pt-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs uppercase tracking-wide text-kampmax-text-secondary">
                  Email
                </dt>
                <dd className="truncate text-right text-xs font-medium text-kampmax-text">
                  {summary.email}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs uppercase tracking-wide text-kampmax-text-secondary">
                  Phone
                </dt>
                <dd className="text-xs font-medium tabular-nums text-kampmax-text">
                  {summary.phone ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs uppercase tracking-wide text-kampmax-text-secondary">
                  Joined
                </dt>
                <dd className="text-xs font-medium text-kampmax-text">
                  {formatDate(summary.joinedAt)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <ActivityStat
                icon={MessagesSquare}
                value={summary?.postsCount ?? 0}
                label="Posts"
              />
              <ActivityStat
                icon={MessageCircle}
                value={summary?.commentsCount ?? 0}
                label="Comments"
              />
              <ActivityStat
                icon={Flag}
                value={summary?.reportsAgainst ?? 0}
                label="Reported"
                danger={(summary?.reportsAgainst ?? 0) > 0}
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-dashed border-kampmax-border pt-3.5 pb-1">
              <Link
                href={`/admin/users?q=${encodeURIComponent(summary.name)}`}
                className="inline-flex h-8 items-center rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
              >
                Open in Users
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 items-center rounded-md bg-kampmax-navy px-3 text-xs font-medium text-white transition-colors hover:bg-kampmax-navy-light"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityStat({
  icon: Icon,
  value,
  label,
  danger = false,
}: {
  icon: typeof Flag;
  value: number;
  label: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-kampmax-border bg-kampmax-muted/30 px-3 py-2.5 text-center">
      <Icon
        className={`mx-auto h-3.5 w-3.5 ${danger && value > 0 ? "text-kampmax-error" : "text-kampmax-text-secondary"}`}
        aria-hidden
      />
      <p className="mt-1 text-base font-semibold tabular-nums text-kampmax-text">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-kampmax-text-secondary">
        {label}
      </p>
    </div>
  );
}
