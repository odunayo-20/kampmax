"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, MoreHorizontal, Pencil, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminArticleQuery, ArticleListItem } from "@/types/blog";
import { ArticleStatusBadge } from "./ArticleStatusBadge";
import { formatDateTime } from "./blog-meta";

export type ArticleRowAction = "publish" | "unpublish" | "archive" | "restore" | "feature" | "unfeature" | "delete";

export interface ArticleRowPermissions {
  update: boolean;
  publish: boolean;
  delete: boolean;
}

type SortField = NonNullable<AdminArticleQuery["sortBy"]>;

interface AdminArticleTableProps {
  articles: ArticleListItem[];
  can: ArticleRowPermissions;
  sortBy: SortField;
  sortOrder: "ASC" | "DESC";
  onSort: (field: SortField) => void;
  onAction: (article: ArticleListItem, action: ArticleRowAction) => void;
  busyId?: string | null;
}

function availableActions(article: ArticleListItem, can: ArticleRowPermissions): { action: ArticleRowAction; label: string; danger?: boolean }[] {
  const out: { action: ArticleRowAction; label: string; danger?: boolean }[] = [];
  const { status } = article;
  if (can.publish && (status === "DRAFT" || status === "SCHEDULED")) out.push({ action: "publish", label: status === "SCHEDULED" ? "Publish now" : "Publish" });
  if (can.publish && (status === "PUBLISHED" || status === "SCHEDULED")) out.push({ action: "unpublish", label: "Unpublish (back to draft)" });
  if (can.publish && status === "PUBLISHED") out.push({ action: article.isFeatured ? "unfeature" : "feature", label: article.isFeatured ? "Remove from featured" : "Feature on blog" });
  if (can.update && status === "ARCHIVED") out.push({ action: "restore", label: "Restore as draft" });
  if (can.delete && status !== "ARCHIVED") out.push({ action: "archive", label: "Archive" });
  if (can.delete) out.push({ action: "delete", label: "Delete", danger: true });
  return out;
}

function RowMenu({ article, can, busy, onAction }: { article: ArticleListItem; can: ArticleRowPermissions; busy: boolean; onAction: AdminArticleTableProps["onAction"] }) {
  const actions = availableActions(article, can);
  if (actions.length === 0) return null;
  return (
    <details className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.open = false; }}>
      <summary
        aria-label={`More actions for ${article.title}`}
        className={cn(
          "flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md text-kampmax-text-secondary hover:bg-kampmax-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue [&::-webkit-details-marker]:hidden",
          busy && "pointer-events-none opacity-50"
        )}
      >
        <MoreHorizontal aria-hidden className="h-4 w-4" />
      </summary>
      <ul className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-kampmax-border bg-white p-1 shadow-lg">
        {actions.map(({ action, label, danger }) => (
          <li key={action}>
            <button
              type="button"
              onClick={(e) => {
                (e.currentTarget.closest("details") as HTMLDetailsElement).open = false;
                onAction(article, action);
              }}
              className={cn(
                "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-kampmax-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue",
                danger ? "text-kampmax-error" : "text-kampmax-text"
              )}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

function SortHeader({ field, label, sortBy, sortOrder, onSort, className }: { field: SortField; label: string; sortBy: SortField; sortOrder: "ASC" | "DESC"; onSort: (f: SortField) => void; className?: string }) {
  const active = sortBy === field;
  return (
    <th scope="col" aria-sort={active ? (sortOrder === "ASC" ? "ascending" : "descending") : "none"} className={cn("px-4 py-2.5 text-left font-medium", className)}>
      <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 hover:text-kampmax-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue">
        {label}
        {active && (sortOrder === "ASC" ? <ArrowUp aria-hidden className="h-3 w-3" /> : <ArrowDown aria-hidden className="h-3 w-3" />)}
      </button>
    </th>
  );
}

function TitleCell({ article }: { article: ArticleListItem }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        {article.isFeatured && <Star aria-label="Featured" className="h-3.5 w-3.5 shrink-0 fill-kampmax-gold text-kampmax-gold" />}
        <Link href={`/admin/blog/${article.id}`} className="truncate font-medium text-kampmax-text hover:text-kampmax-blue">
          {article.title}
        </Link>
      </div>
      <p className="mt-0.5 truncate text-xs text-kampmax-text-muted">/blog/{article.slug}</p>
    </div>
  );
}

function dateFor(article: ArticleListItem): { label: string; value: string } {
  if (article.status === "SCHEDULED") return { label: "Goes live", value: formatDateTime(article.publishedAt) };
  if (article.status === "PUBLISHED") return { label: "Published", value: formatDateTime(article.publishedAt) };
  return { label: "Updated", value: formatDateTime(article.updatedAt) };
}

export function AdminArticleTable({ articles, can, sortBy, sortOrder, onSort, onAction, busyId }: AdminArticleTableProps) {
  return (
    <>
      {/* Tablet and up: sortable table */}
      <div className="hidden overflow-hidden rounded-lg border border-kampmax-border bg-white md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Blog articles</caption>
          <thead className="border-b border-kampmax-border bg-kampmax-muted/50 text-xs text-kampmax-text-secondary">
            <tr>
              <SortHeader field="title" label="Article" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
              <th scope="col" className="px-4 py-2.5 text-left font-medium">Status</th>
              <th scope="col" className="hidden px-4 py-2.5 text-left font-medium lg:table-cell">Category</th>
              <th scope="col" className="hidden px-4 py-2.5 text-left font-medium xl:table-cell">Author</th>
              <SortHeader field={sortBy === "publishedAt" ? "publishedAt" : "updatedAt"} label="Date" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
              <SortHeader field="viewCount" label="Views" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="hidden lg:table-cell" />
              <th scope="col" className="w-24 px-4 py-2.5 text-right font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kampmax-border">
            {articles.map((article) => {
              const date = dateFor(article);
              return (
                <tr key={article.id} className={cn("hover:bg-kampmax-muted/30", busyId === article.id && "opacity-60")}>
                  <td className="max-w-[22rem] px-4 py-3"><TitleCell article={article} /></td>
                  <td className="px-4 py-3"><ArticleStatusBadge status={article.status} /></td>
                  <td className="hidden px-4 py-3 text-kampmax-text-secondary lg:table-cell">{article.category?.name ?? <span className="text-kampmax-warning">None</span>}</td>
                  <td className="hidden px-4 py-3 text-kampmax-text-secondary xl:table-cell">{article.author.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-kampmax-text-secondary">
                    <span className="block text-[11px] uppercase tracking-wide text-kampmax-text-muted">{date.label}</span>
                    {date.value}
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums text-kampmax-text-secondary lg:table-cell">{article.viewCount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      {article.status === "PUBLISHED" && (
                        <a href={`/blog/${article.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${article.title} on the blog (opens in a new tab)`} className="flex h-9 w-9 items-center justify-center rounded-md text-kampmax-text-secondary hover:bg-kampmax-muted">
                          <ExternalLink aria-hidden className="h-4 w-4" />
                        </a>
                      )}
                      <Link href={`/admin/blog/${article.id}`} aria-label={`Edit ${article.title}`} className="flex h-9 w-9 items-center justify-center rounded-md text-kampmax-text-secondary hover:bg-kampmax-muted">
                        <Pencil aria-hidden className="h-4 w-4" />
                      </Link>
                      <RowMenu article={article} can={can} busy={busyId === article.id} onAction={onAction} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-3 md:hidden">
        {articles.map((article) => {
          const date = dateFor(article);
          return (
            <li key={article.id} className={cn("rounded-lg border border-kampmax-border bg-white p-3.5", busyId === article.id && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <TitleCell article={article} />
                <RowMenu article={article} can={can} busy={busyId === article.id} onAction={onAction} />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-kampmax-text-secondary">
                <ArticleStatusBadge status={article.status} />
                <span>{article.category?.name ?? "No category"}</span>
                <span>{date.label}: {date.value}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/admin/blog/${article.id}`} className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-kampmax-border text-sm font-medium text-kampmax-text hover:bg-kampmax-muted">Edit</Link>
                {article.status === "PUBLISHED" && (
                  <a href={`/blog/${article.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-kampmax-border text-sm font-medium text-kampmax-text hover:bg-kampmax-muted">View live</a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
