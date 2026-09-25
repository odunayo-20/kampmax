"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Layers,
  PlusCircle,
  Search,
  XCircle,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { CategoriesTable } from "@/components/admin/categories/CategoriesTable";
import { CategoryFormDialog } from "@/components/admin/categories/CategoryFormDialog";
import { categoryStatusLabel } from "@/components/admin/categories/categories-meta";
import type { CategoryReorderDirection } from "@/types/admin";
import { categoryManagementService, setCategoryTaxonomy } from "@/services/admin";
import { useQueryClient } from "@tanstack/react-query";
import { taxonomyKeys, useTaxonomyTypes } from "@/hooks/use-taxonomy";
import type { TaxonomyType } from "@/services/taxonomy";
import type {
  CategoryInput,
  CategoryParentOption,
  CategoryStatusCounts,
  ManagedCategory,
  ManagedCategoryStatus,
  Paginated,
} from "@/types/admin";

export default function AdminCategoriesPage() {
  return (
    <Suspense
      fallback={<LoadingSkeleton variant="cards" rows={4} />}
    >
      <CategoriesConsole />
    </Suspense>
  );
}

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

type FormState =
  | { mode: "create" }
  | { mode: "sub"; parent: ManagedCategory }
  | { mode: "edit"; category: ManagedCategory }
  | null;

const STATUS_TABS: (ManagedCategoryStatus | "all")[] = [
  "all",
  "active",
  "inactive",
];

function CategoriesConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ----- filters (URL-seeded) -----
  const initialQ = searchParams.get("q") ?? "";
  const initialStatus = (searchParams.get("status") ?? "all") as
    | ManagedCategoryStatus
    | "all";

  // Which taxonomy the console manages (Product Categories, Skills, ...).
  // The service reads it on every call, so it is set during render, before
  // any effect below loads data.
  const [taxonomy, setTaxonomy] = useState<TaxonomyType>(
    (searchParams.get("type") as TaxonomyType | null) ?? "PRODUCT"
  );
  setCategoryTaxonomy(taxonomy);
  const queryClient = useQueryClient();
  const { data: taxonomyTypes } = useTaxonomyTypes();
  const typeLabel = taxonomyTypes?.find((t) => t.key === taxonomy);

  const [searchInput, setSearchInput] = useState(initialQ);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const search = useDebounce(searchInput, 350);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // ----- data -----
  const [list, setList] = useState<Paginated<ManagedCategory> | null>(null);
  const [counts, setCounts] = useState<CategoryStatusCounts | null>(null);
  const [parentOptions, setParentOptions] = useState<CategoryParentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ----- overlays -----
  const [form, setForm] = useState<FormState>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedCategory | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ManagedCategory | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);

  function pushToast(tone: ToastMessage["tone"], text: string) {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }

  const loadMeta = useCallback(async () => {
    // Runs after every mutation: make forms elsewhere refetch the taxonomy.
    void queryClient.invalidateQueries({ queryKey: taxonomyKeys.all });
    try {
      const [c, p] = await Promise.all([
        categoryManagementService.getCounts(),
        categoryManagementService.getParentOptions(),
      ]);
      setCounts(c);
      setParentOptions(p);
    } catch {
      /* counts are non-critical */
    }
  }, [queryClient, taxonomy]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await categoryManagementService.list({
        search: search.trim() || undefined,
        status: statusFilter,
        sortBy: "sortOrder",
        sortDir: "asc",
        page,
        pageSize,
      });
      setList(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, pageSize, taxonomy]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  // ----- URL sync -----
  function syncUrl(next: { q?: string; status?: string }) {
    const params = new URLSearchParams();
    const q = next.q ?? searchInput;
    const status = next.status ?? statusFilter;
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);
    if (taxonomy !== "PRODUCT") params.set("type", taxonomy);
    const qs2 = params.toString();
    router.replace(qs2 ? `/admin/categories?${qs2}` : "/admin/categories", {
      scroll: false,
    });
  }

  function patchFilters(patch: {
    q?: string;
    status?: ManagedCategoryStatus | "all";
  }) {
    if (patch.q !== undefined) setSearchInput(patch.q);
    if (patch.status !== undefined) setStatusFilter(patch.status);
    setPage(1);
    syncUrl(patch);
  }

  const hasActiveFilters =
    searchInput.trim().length > 0 || statusFilter !== "all";

  // ----- mutations -----

  async function submitForm(input: CategoryInput) {
    if (!form) return;
    setFormSaving(true);
    try {
      if (form.mode === "edit") {
        await categoryManagementService.update(form.category.id, input);
        pushToast("success", `“${input.name}” updated.`);
      } else {
        await categoryManagementService.create(input);
        pushToast(
          "success",
          input.parentId
            ? `Subcategory “${input.name}” created under ${
                parentOptions.find((o) => o.id === input.parentId)?.name ?? "its parent"
              }.`
            : `Top-level category “${input.name}” created.`
        );
      }
      setForm(null);
      await Promise.all([loadList(), loadMeta()]);
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Couldn't save the category. Try again."
      );
    } finally {
      setFormSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await categoryManagementService.remove(deleteTarget.id);
      pushToast("success", `“${deleteTarget.name}” deleted.`);
      setDeleteTarget(null);
      await Promise.all([loadList(), loadMeta()]);
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Couldn't delete the category."
      );
      setDeleteTarget(null);
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    try {
      await categoryManagementService.setStatus(deactivateTarget.id, "inactive");
      pushToast("success", `“${deactivateTarget.name}” deactivated - hidden from new listings.`);
      setDeactivateTarget(null);
      await Promise.all([loadList(), loadMeta()]);
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Couldn't update the category."
      );
      setDeactivateTarget(null);
    }
  }

  async function toggleStatus(category: ManagedCategory) {
    if (category.status === "active") {
      setDeactivateTarget(category); // destructive-ish: confirm first
      return;
    }
    try {
      await categoryManagementService.setStatus(category.id, "active");
      pushToast("success", `“${category.name}” is live again.`);
      await Promise.all([loadList(), loadMeta()]);
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Couldn't activate the category."
      );
    }
  }

  async function reorder(
    category: ManagedCategory,
    direction: CategoryReorderDirection
  ) {
    try {
      await categoryManagementService.reorder(category.id, direction);
      await loadList();
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Couldn't reorder that category."
      );
    }
  }

  function requestDelete(category: ManagedCategory) {
    if (category.subcategoryCount > 0 || category.productCount > 0) {
      pushToast(
        "error",
        category.subcategoryCount > 0
          ? `Delete or move the ${category.subcategoryCount} subcategories of “${category.name}” first.`
          : `${category.productCount.toLocaleString("en-NG")} product${
              category.productCount === 1 ? " is" : "s are"
            } still assigned to “${category.name}”. Reassign them before deleting.`
      );
      return;
    }
    setDeleteTarget(category);
  }

  // ----- render -----

  return (
    <>
      <AdminPageHeader
        title={typeLabel?.label ?? "Categories"}
        description={
          typeLabel?.description ??
          "Taxonomy - top-level categories, subcategories, display order and lifecycle."
        }
        actions={
          <>
            {counts && (
              <span className="hidden h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text-secondary sm:inline-flex">
                <Layers className="h-3.5 w-3.5 opacity-60" />
                {counts.total} categor{counts.total === 1 ? "y" : "ies"} ·{" "}
                {counts.productsCovered.toLocaleString("en-NG")} products covered
              </span>
            )}
            <button
              type="button"
              onClick={() => setForm({ mode: "create" })}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-blue px-3 text-sm font-medium text-white transition-colors hover:bg-kampmax-blue/90"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New category
            </button>
          </>
        }
      />

      {/* Taxonomy type tabs: one console manages every classification list */}
      <div
        role="tablist"
        aria-label="Taxonomy type"
        className="mb-3 flex gap-1 overflow-x-auto no-scrollbar"
      >
        {(taxonomyTypes ?? [{ key: "PRODUCT" as TaxonomyType, label: "Product Categories" }]).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={taxonomy === t.key}
            onClick={() => {
              setTaxonomy(t.key);
              setPage(1);
              setStatusFilter("all");
              setSearchInput("");
            }}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors",
              taxonomy === t.key
                ? "border-kampmax-blue bg-kampmax-blue text-white"
                : "border-kampmax-border bg-white text-kampmax-text-secondary hover:text-kampmax-text"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status tabs + search */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Filter by status"
          className="flex gap-1 overflow-x-auto border-b border-kampmax-border px-3 py-2 no-scrollbar"
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab}
              onClick={() => patchFilters({ status: tab })}
              className={cn(
                "-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-1.5 text-[13px] font-medium capitalize transition-colors",
                statusFilter === tab
                  ? "border-kampmax-blue text-kampmax-blue"
                  : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
              )}
            >
              {tab === "all" ? "All" : categoryStatusLabel(tab)}
              {counts && (
                <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums">
                  {tab === "all"
                    ? counts.total
                    : tab === "active"
                      ? counts.active
                      : counts.inactive}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <Input
            value={searchInput}
            placeholder="Search categories…"
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Search categories"
            onChange={(e) => patchFilters({ q: e.target.value })}
          />
        </div>
      </div>

      <CategoriesTable
        items={list?.items ?? []}
        loading={loading && !list}
        error={error}
        onRetry={() => void loadList()}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => patchFilters({ q: "", status: "all" })}
        onEdit={(category) => setForm({ mode: "edit", category })}
        onCreateSub={(parent) => setForm({ mode: "sub", parent })}
        onToggleStatus={(category) => void toggleStatus(category)}
        onDelete={requestDelete}
        onReorder={(category, direction) => void reorder(category, direction)}
      />

      {list && list.totalPages > 1 && (
        <div className="mt-3 flex justify-center">
          <Pagination
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            totalPages={list.totalPages}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPage(1);
              setPageSize(n);
            }}
          />
        </div>
      )}

      {/* Create / edit / subcategory form */}
      <CategoryFormDialog
        open={form !== null}
        mode={form?.mode ?? "create"}
        category={form?.mode === "edit" ? form.category : null}
        parent={form?.mode === "sub" ? form.parent : null}
        parentOptions={parentOptions}
        loading={formSaving}
        onClose={() => setForm(null)}
        onSubmit={(input) => void submitForm(input)}
      />

      {/* Delete (only reachable for empty leaf categories) */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete “${deleteTarget?.name}”?`}
        message="This permanently removes the category from the marketplace taxonomy. It has no products or subcategories assigned."
        confirmLabel="Delete category"
        tone="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Deactivate */}
      <ConfirmDialog
        open={deactivateTarget !== null}
        title={`Deactivate “${deactivateTarget?.name}”?`}
        message="Buyers and vendors can no longer select this category for listings. Assigned products stay listed but appear uncategorised in storefront filters."
        confirmLabel="Deactivate"
        tone="warning"
        onConfirm={() => void confirmDeactivate()}
        onCancel={() => setDeactivateTarget(null)}
      />

      {/* Toasts */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex max-w-sm items-start gap-2 rounded-lg border border-kampmax-border bg-white px-3.5 py-2.5 text-sm shadow-lg animate-[kampmax-fade-in_.18s_ease-out]"
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-success" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-error" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </>
  );
}
