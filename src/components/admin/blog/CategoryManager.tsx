"use client";

import { useState } from "react";
import { Plus, Tags } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { canAdminPerform } from "@/lib/admin/permissions";
import { useBlogCategories, useBlogCategoryMutations } from "@/hooks/admin/use-admin-blog";
import type { BlogCategoryItem } from "@/types/blog";
import { BlogAdminTabs } from "./BlogAdminTabs";
import { BUTTON_PRIMARY } from "./blog-meta";
import { TaxonomyFormDialog, type TaxonomyFormValues } from "./TaxonomyFormDialog";
import { ToastStack, useToasts } from "./useToasts";

const BLANK: TaxonomyFormValues = { name: "", slug: "", description: "", isActive: true };

export function CategoryManager() {
  const { admin } = useAdminSession();
  const canManage = admin ? canAdminPerform(admin, "blog", "manageCategories") : false;
  const { data, isLoading, isError, error, refetch } = useBlogCategories();
  const mutations = useBlogCategoryMutations();
  const toasts = useToasts();
  const [form, setForm] = useState<{ mode: "create" } | { mode: "edit"; item: BlogCategoryItem } | null>(null);
  const [toDelete, setToDelete] = useState<BlogCategoryItem | null>(null);

  async function save(values: TaxonomyFormValues) {
    if (form?.mode === "edit") {
      await mutations.update.mutateAsync({ id: form.item.id, input: { name: values.name, slug: values.slug || undefined, description: values.description, isActive: values.isActive } });
      toasts.success("Category updated.");
    } else {
      await mutations.create.mutateAsync({ name: values.name, slug: values.slug || undefined, description: values.description || undefined, isActive: values.isActive });
      toasts.success("Category created.");
    }
    setForm(null);
  }

  async function toggleActive(item: BlogCategoryItem) {
    try {
      await mutations.update.mutateAsync({ id: item.id, input: { isActive: !item.isActive } });
      toasts.success(item.isActive ? "Category archived. Existing articles keep it." : "Category restored.");
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : "That didn't work.");
    }
  }

  async function remove() {
    if (!toDelete) return;
    try {
      await mutations.remove.mutateAsync(toDelete.id);
      toasts.success("Category deleted.");
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setToDelete(null);
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Blog categories"
        description="Categories organise the blog and drive its navigation. Archive a category instead of deleting it once articles use it."
        actions={canManage && <button type="button" onClick={() => setForm({ mode: "create" })} className={BUTTON_PRIMARY}><Plus aria-hidden className="h-4 w-4" /> New category</button>}
      />
      <BlogAdminTabs />

      {isLoading ? <LoadingSkeleton variant="table" rows={5} />
        : isError ? <ErrorState title="Couldn't load categories" message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
        : !data || data.length === 0 ? <EmptyState icon={Tags} title="No categories yet" message="Create a category before publishing articles." />
        : (
          <ul className="divide-y divide-kampmax-border overflow-hidden rounded-lg border border-kampmax-border bg-white">
            {data.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-kampmax-text">
                    {item.name}
                    {!item.isActive && <span className="rounded-full bg-warning-50 px-2 py-0.5 text-xs text-warning-700 ring-1 ring-inset ring-warning-100">Archived</span>}
                  </p>
                  <p className="truncate text-xs text-kampmax-text-muted">/blog/category/{item.slug}{item.description ? ` · ${item.description}` : ""}</p>
                </div>
                <p className="text-sm tabular-nums text-kampmax-text-secondary">{item.articleCount} {item.articleCount === 1 ? "article" : "articles"}</p>
                {canManage && (
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => setForm({ mode: "edit", item })} className="text-kampmax-blue hover:underline">Edit</button>
                    <button type="button" onClick={() => void toggleActive(item)} className="text-kampmax-text-secondary hover:underline">{item.isActive ? "Archive" : "Restore"}</button>
                    <button type="button" onClick={() => setToDelete(item)} disabled={item.articleCount > 0} title={item.articleCount > 0 ? "In use. Archive it instead." : undefined} className="text-kampmax-error hover:underline disabled:cursor-not-allowed disabled:text-kampmax-text-muted disabled:no-underline">Delete</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

      {form && (
        <TaxonomyFormDialog
          noun="category"
          mode={form.mode}
          initial={form.mode === "edit" ? { name: form.item.name, slug: form.item.slug, description: form.item.description ?? "", isActive: form.item.isActive } : BLANK}
          onSubmit={save}
          onClose={() => setForm(null)}
        />
      )}
      <ConfirmDialog open={!!toDelete} tone="danger" title={`Delete “${toDelete?.name ?? ""}”?`} message="This category has no articles and will be removed permanently." confirmLabel="Delete category" loading={mutations.remove.isPending} onConfirm={() => void remove()} onCancel={() => setToDelete(null)} />
      <ToastStack toasts={toasts.toasts} />
    </>
  );
}
