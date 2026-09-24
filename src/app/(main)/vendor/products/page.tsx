"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import {
  useArchiveProduct,
  useDeleteProduct,
  usePublishProduct,
  useRestoreProduct,
  useVendorProductCategories,
  useVendorProductCounts,
  useVendorProductList,
} from "@/hooks/use-vendor-products";
import { ProductHeader } from "@/components/vendor-products/ProductHeader";
import { ProductToolbar } from "@/components/vendor-products/ProductToolbar";
import { ProductFilters } from "@/components/vendor-products/ProductFilters";
import { ProductsTable } from "@/components/vendor-products/ProductsTable";
import { ProductGrid } from "@/components/vendor-products/ProductGrid";
import { ProductPagination } from "@/components/vendor-products/ProductPagination";
import { BulkActions } from "@/components/vendor-products/BulkActions";
import type { Product } from "@/types";
import type { ProductPublishStatus, ProductStockStatus, ProductSortField } from "@/types/vendor-products";

const PAGE_SIZE = 20;

const EMPTY_COUNTS: Record<ProductPublishStatus | "all", number> = {
  all: 0,
  draft: 0,
  pending_review: 0,
  active: 0,
  inactive: 0,
  rejected: 0,
  archived: 0,
};

export default function VendorProductsPage({ params }: { params: Promise<{}> }) {
  use(params);
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ProductSortField>("newest");
  const [statusFilter, setStatusFilter] = useState<ProductPublishStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<ProductStockStatus | "all">("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const listQuery = useVendorProductList({
    search,
    status: statusFilter,
    categoryId: categoryFilter === "all" ? undefined : categoryFilter,
    stockStatus: stockFilter === "all" ? undefined : stockFilter,
    minPrice: priceMin ? Number(priceMin) : undefined,
    maxPrice: priceMax ? Number(priceMax) : undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });
  const countsQuery = useVendorProductCounts();
  const categoriesQuery = useVendorProductCategories();

  const publish = usePublishProduct();
  const archive = useArchiveProduct();
  const restore = useRestoreProduct();
  const remove = useDeleteProduct();

  const products = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 1;
  const categories = categoriesQuery.data ?? [];
  const statusCounts = countsQuery.data ?? EMPTY_COUNTS;
  const bulkActionLoading =
    publish.isPending || archive.isPending || restore.isPending || remove.isPending;
  const loadError =
    actionError ?? (listQuery.isError ? "Couldn't load your products." : null);

  const runAction = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "That action failed. Please try again.");
    } finally {
      setSelectedIds([]);
    }
  };

  const selectedProducts = () => products.filter((p) => selectedIds.includes(p.id));

  const handleBulkPublish = () =>
    runAction(async () => {
      for (const p of selectedProducts()) {
        if (p.publishedStatus === "active") continue;
        await publish.mutateAsync({ id: p.id, status: "active" });
      }
    });

  const handleBulkUnpublish = () =>
    runAction(async () => {
      for (const p of selectedProducts()) {
        if (p.publishedStatus === "active") await publish.mutateAsync({ id: p.id, status: "inactive" });
      }
    });

  const handleBulkArchive = () =>
    runAction(async () => {
      for (const p of selectedProducts()) {
        if (p.publishedStatus !== "archived") await archive.mutateAsync(p);
      }
    });

  const rowActions = {
    onPublish: (p: Product) => runAction(() => publish.mutateAsync({ id: p.id, status: "active" })),
    onArchive: (p: Product) => runAction(() => archive.mutateAsync(p)),
    onRestore: (p: Product) => runAction(() => restore.mutateAsync(p)),
    onDelete: (p: Product) => runAction(() => remove.mutateAsync(p)),
  };

  return (
    <div className="space-y-4">
      <ProductHeader totalCount={total} onAddProduct={() => router.push("/vendor/products/new")} />

      {loadError && (
        <p className="text-sm text-error-600" role="alert">{loadError}</p>
      )}

      <ProductToolbar
        searchValue={search}
        onSearchChange={setSearch}
        sortValue={sort}
        onSortChange={(v) => { setSort(v as ProductSortField); setPage(1); }}
        hasActiveFilters={
          statusFilter !== "all" ||
          categoryFilter !== "all" ||
          stockFilter !== "all" ||
          Boolean(priceMin) ||
          Boolean(priceMax)
        }
        onClearFilters={() => {
          setStatusFilter("all");
          setCategoryFilter("all");
          setStockFilter("all");
          setPriceMin("");
          setPriceMax("");
          setPage(1);
        }}
      />

      <ProductFilters
        statusFilter={statusFilter}
        onStatusChange={(v) => { setStatusFilter(v); setPage(1); }}
        categoryFilter={categoryFilter}
        onCategoryChange={(v) => { setCategoryFilter(v); setPage(1); }}
        stockFilter={stockFilter}
        onStockChange={(v) => { setStockFilter(v); setPage(1); }}
        priceMin={priceMin}
        onPriceMinChange={setPriceMin}
        priceMax={priceMax}
        onPriceMaxChange={setPriceMax}
        categories={categories}
        statusCounts={statusCounts}
      />

      <div className="hidden md:block">
        <ProductsTable
          products={products}
          categoryNames={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
          onView={(p) => router.push(`/vendor/products/${p.id}`)}
          onEdit={(p) => router.push(`/vendor/products/${p.id}/edit`)}
          {...rowActions}
          bulkAction={{
            selectedIds,
            onSelectAll: (checked) => setSelectedIds(checked ? products.map((p) => p.id) : []),
            onSelectionChange: setSelectedIds,
            onBulkPublish: handleBulkPublish,
            onBulkUnpublish: handleBulkUnpublish,
            onBulkArchive: handleBulkArchive,
          }}
        />
      </div>

      <div className="md:hidden">
        <ProductGrid
          products={products}
          onView={(p) => router.push(`/vendor/products/${p.id}`)}
          onEdit={(p) => router.push(`/vendor/products/${p.id}/edit`)}
          {...rowActions}
        />
      </div>

      <ProductPagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <BulkActions
        selectedCount={selectedIds.length}
        onBulkPublish={handleBulkPublish}
        onBulkUnpublish={handleBulkUnpublish}
        onBulkArchive={handleBulkArchive}
        onClearSelection={() => setSelectedIds([])}
        disabled={bulkActionLoading}
      />
    </div>
  );
}