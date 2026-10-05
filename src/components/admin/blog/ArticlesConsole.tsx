"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FilePlus2, Newspaper, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { canAdminPerform } from "@/lib/admin/permissions";
import { useAdminArticles, useBlogCategories, useBlogMutations } from "@/hooks/admin/use-admin-blog";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { AdminArticleQuery, ArticleListItem, ArticleStatus } from "@/types/blog";
import { AdminArticleTable, type ArticleRowAction } from "./AdminArticleTable";
import { BlogAdminTabs } from "./BlogAdminTabs";
import { BUTTON_PRIMARY, FIELD_CLASS, STATUS_LABEL, STATUS_TABS } from "./blog-meta";
import { ToastStack, useToasts } from "./useToasts";

type SortField = NonNullable<AdminArticleQuery["sortBy"]>;

const CONFIRM_COPY: Record<"unpublish" | "archive" | "delete" | "publish", { title: (a: ArticleListItem) => string; message: string; confirm: string; tone: "danger" | "warning" | "default" }> = {
  publish: { title: (a) => `Publish “${a.title}”?`, message: "It will appear on the public blog immediately.", confirm: "Publish", tone: "default" },
  unpublish: { title: (a) => `Unpublish “${a.title}”?`, message: "It will disappear from the public blog and return to draft. The URL keeps working once it is republished.", confirm: "Unpublish", tone: "warning" },
  archive: { title: (a) => `Archive “${a.title}”?`, message: "It will be hidden from the public blog but kept on file. You can restore it later.", confirm: "Archive", tone: "warning" },
  delete: { title: (a) => `Delete “${a.title}”?`, message: "The article is removed from the console and the public blog. This cannot be undone from here.", confirm: "Delete article", tone: "danger" },
};

export function ArticlesConsole() {
  const { admin } = useAdminSession();
  const can = {
    create: admin ? canAdminPerform(admin, "blog", "create") : false,
    update: admin ? canAdminPerform(admin, "blog", "update") : false,
    publish: admin ? canAdminPerform(admin, "blog", "publish") : false,
    delete: admin ? canAdminPerform(admin, "blog", "delete") : false,
  };

  const [status, setStatus] = useState<ArticleStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const q = useDebounce(searchInput.trim(), 350);

  const query = useMemo<AdminArticleQuery>(
    () => ({
      page,
      limit: pageSize,
      q: q || undefined,
      status: status === "all" ? undefined : status,
      categoryId: categoryId || undefined,
      featured: featuredOnly ? true : undefined,
      sortBy,
      sortOrder,
    }),
    [page, pageSize, q, status, categoryId, featuredOnly, sortBy, sortOrder]
  );

  const articles = useAdminArticles(query);
  const categories = useBlogCategories();
  const mutations = useBlogMutations();
  const toasts = useToasts();

  const [pending, setPending] = useState<{ article: ArticleListItem; action: "publish" | "unpublish" | "archive" | "delete" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const hasFilters = !!q || status !== "all" || !!categoryId || featuredOnly;
  const resetPage = () => setPage(1);

  function toggleSort(field: SortField) {
    if (field === sortBy) setSortOrder((o) => (o === "ASC" ? "DESC" : "ASC"));
    else {
      setSortBy(field);
      setSortOrder(field === "title" ? "ASC" : "DESC");
    }
    resetPage();
  }

  async function run(article: ArticleListItem, action: ArticleRowAction) {
    setBusyId(article.id);
    try {
      switch (action) {
        case "publish": await mutations.publish.mutateAsync({ id: article.id }); toasts.success("Article published."); break;
        case "unpublish": await mutations.unpublish.mutateAsync(article.id); toasts.success("Article moved back to draft."); break;
        case "archive": await mutations.archive.mutateAsync(article.id); toasts.success("Article archived."); break;
        case "restore": await mutations.restore.mutateAsync(article.id); toasts.success("Article restored as a draft."); break;
        case "feature": await mutations.feature.mutateAsync({ id: article.id, featured: true }); toasts.success("Article is now featured."); break;
        case "unfeature": await mutations.feature.mutateAsync({ id: article.id, featured: false }); toasts.success("Article removed from featured."); break;
        case "delete": await mutations.remove.mutateAsync(article.id); toasts.success("Article deleted."); break;
      }
    } catch (error) {
      toasts.error(error instanceof Error ? error.message : "That didn't work. Try again.");
    } finally {
      setBusyId(null);
      setPending(null);
    }
  }

  function onAction(article: ArticleListItem, action: ArticleRowAction) {
    if (action === "publish" || action === "unpublish" || action === "archive" || action === "delete") {
      setPending({ article, action });
    } else {
      void run(article, action);
    }
  }

  const data = articles.data;
  const copy = pending ? CONFIRM_COPY[pending.action] : null;

  return (
    <>
      <AdminPageHeader
        title="Blog"
        description="Write, schedule and publish the articles that bring students, vendors and freelancers to Kampmax."
        actions={
          can.create && (
            <Link href="/admin/blog/new" className={BUTTON_PRIMARY}>
              <FilePlus2 aria-hidden className="h-4 w-4" /> New article
            </Link>
          )
        }
      />
      <BlogAdminTabs />

      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by status">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={status === tab}
            onClick={() => { setStatus(tab); resetPage(); }}
            className={cn(
              "h-8 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue",
              status === tab ? "border-kampmax-navy bg-kampmax-navy text-white" : "border-kampmax-border bg-white text-kampmax-text-secondary hover:bg-kampmax-muted"
            )}
          >
            {tab === "all" ? "All" : STATUS_LABEL[tab]}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <label htmlFor="blog-admin-search" className="sr-only">Search articles</label>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kampmax-text-muted" />
          <input id="blog-admin-search" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); resetPage(); }} placeholder="Search by title, excerpt or slug" maxLength={100} className={cn(FIELD_CLASS, "pl-9")} />
        </div>
        <div>
          <label htmlFor="blog-admin-category" className="sr-only">Category</label>
          <select id="blog-admin-category" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); resetPage(); }} className={cn(FIELD_CLASS, "sm:w-48")}>
            <option value="">All categories</option>
            {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <label className="flex h-[38px] items-center gap-2 rounded-lg border border-kampmax-border bg-white px-3 text-sm text-kampmax-text">
          <input type="checkbox" checked={featuredOnly} onChange={(e) => { setFeaturedOnly(e.target.checked); resetPage(); }} className="h-4 w-4 rounded border-kampmax-border-strong accent-kampmax-blue" />
          Featured only
        </label>
      </div>

      {articles.isLoading ? (
        <LoadingSkeleton variant="table" rows={6} />
      ) : articles.isError ? (
        <ErrorState title="Couldn't load articles" message={articles.error instanceof Error ? articles.error.message : undefined} onRetry={() => void articles.refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title={hasFilters ? "No articles match your filters" : "No articles yet"}
          message={hasFilters ? "Try a different search or clear the filters." : "Create your first draft to get started."}
          action={
            hasFilters ? (
              <button type="button" className="text-sm font-medium text-kampmax-blue hover:underline" onClick={() => { setStatus("all"); setSearchInput(""); setCategoryId(""); setFeaturedOnly(false); resetPage(); }}>
                Clear filters
              </button>
            ) : can.create ? (
              <Link href="/admin/blog/new" className={BUTTON_PRIMARY}>New article</Link>
            ) : undefined
          }
        />
      ) : (
        <div className={cn(articles.isFetching && "opacity-70 transition-opacity")} aria-busy={articles.isFetching}>
          <AdminArticleTable articles={data.items} can={can} sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} onAction={onAction} busyId={busyId} />
          <Pagination
            page={data.meta.page}
            pageSize={pageSize}
            total={data.meta.total}
            totalPages={Math.max(1, data.meta.totalPages)}
            onPageChange={setPage}
            onPageSizeChange={(n) => { setPageSize(n); resetPage(); }}
            unitLabel="articles"
          />
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        title={pending && copy ? copy.title(pending.article) : ""}
        message={copy?.message ?? ""}
        confirmLabel={copy?.confirm}
        tone={copy?.tone}
        loading={!!busyId}
        onConfirm={() => pending && void run(pending.article, pending.action)}
        onCancel={() => setPending(null)}
      />
      <ToastStack toasts={toasts.toasts} />
    </>
  );
}
