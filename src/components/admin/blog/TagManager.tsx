"use client";

import { useState } from "react";
import { Plus, Search, Tag } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { canAdminPerform } from "@/lib/admin/permissions";
import { useBlogTagMutations, useBlogTags } from "@/hooks/admin/use-admin-blog";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { BlogTagItem } from "@/types/blog";
import { BlogAdminTabs } from "./BlogAdminTabs";
import { BUTTON_PRIMARY, FIELD_CLASS } from "./blog-meta";
import { TaxonomyFormDialog, type TaxonomyFormValues } from "./TaxonomyFormDialog";
import { ToastStack, useToasts } from "./useToasts";

const BLANK: TaxonomyFormValues = { name: "", slug: "", description: "", isActive: true };

export function TagManager() {
  const { admin } = useAdminSession();
  const canManage = admin ? canAdminPerform(admin, "blog", "manageTags") : false;
  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim(), 300);
  const { data, isLoading, isError, error, refetch } = useBlogTags(q);
  const mutations = useBlogTagMutations();
  const toasts = useToasts();
  const [form, setForm] = useState<{ mode: "create" } | { mode: "edit"; item: BlogTagItem } | null>(null);
  const [toDelete, setToDelete] = useState<BlogTagItem | null>(null);

  async function save(values: TaxonomyFormValues) {
    const input = { name: values.name, slug: values.slug || undefined, description: values.description || null, isActive: values.isActive };
    if (form?.mode === "edit") {
      await mutations.update.mutateAsync({ id: form.item.id, input });
      toasts.success("Tag updated.");
    } else {
      await mutations.create.mutateAsync(input);
      toasts.success("Tag created.");
    }
    setForm(null);
  }

  async function remove() {
    if (!toDelete) return;
    try {
      await mutations.remove.mutateAsync(toDelete.id);
      toasts.success("Tag deleted.");
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setToDelete(null);
    }
  }

  const items = data?.items ?? [];
  return (
    <>
      <AdminPageHeader
        title="Blog tags"
        description="Tags are reusable labels shared across articles, such as a campus, a topic or an audience."
        actions={canManage && <button type="button" onClick={() => setForm({ mode: "create" })} className={BUTTON_PRIMARY}><Plus aria-hidden className="h-4 w-4" /> New tag</button>}
      />
      <BlogAdminTabs />

      <div className="relative mb-4 max-w-sm">
        <label htmlFor="tag-search" className="sr-only">Search tags</label>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kampmax-text-muted" />
        <input id="tag-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tags" maxLength={60} className={cn(FIELD_CLASS, "pl-9")} />
      </div>

      {isLoading ? <LoadingSkeleton variant="table" rows={5} />
        : isError ? <ErrorState title="Couldn't load tags" message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
        : items.length === 0 ? <EmptyState icon={Tag} title={q ? "No tags match your search" : "No tags yet"} message={q ? "Try a different search." : "Create tags to group related articles."} />
        : (
          <ul className="divide-y divide-kampmax-border overflow-hidden rounded-lg border border-kampmax-border bg-white">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-kampmax-text">
                    #{item.name}
                    {!item.isActive && <span className="rounded-full bg-warning-50 px-2 py-0.5 text-xs text-warning-700 ring-1 ring-inset ring-warning-100">Inactive</span>}
                  </p>
                  <p className="truncate text-xs text-kampmax-text-muted">/blog/tag/{item.slug}</p>
                </div>
                <p className="text-sm tabular-nums text-kampmax-text-secondary">{item.articleCount} {item.articleCount === 1 ? "article" : "articles"}</p>
                {canManage && (
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => setForm({ mode: "edit", item })} className="text-kampmax-blue hover:underline">Edit</button>
                    <button type="button" onClick={() => setToDelete(item)} className="text-kampmax-error hover:underline">Delete</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

      {form && (
        <TaxonomyFormDialog
          noun="tag"
          mode={form.mode}
          initial={form.mode === "edit" ? { name: form.item.name, slug: form.item.slug, description: form.item.description ?? "", isActive: form.item.isActive } : BLANK}
          onSubmit={save}
          onClose={() => setForm(null)}
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        tone="danger"
        title={`Delete #${toDelete?.name ?? ""}?`}
        message={toDelete && toDelete.articleCount > 0 ? `It will be removed from ${toDelete.articleCount} article${toDelete.articleCount === 1 ? "" : "s"}. The articles themselves are not affected.` : "This tag is not used by any article."}
        confirmLabel="Delete tag"
        loading={mutations.remove.isPending}
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      />
      <ToastStack toasts={toasts.toasts} />
    </>
  );
}
