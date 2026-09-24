"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import {
  getVendorProductsApi,
  getVendorProductCountsApi,
  getCategoriesForVendorApi,
  setProductPublishedStatusApi,
  archiveVendorProductApi,
  restoreVendorProductApi,
  deleteVendorProductApi,
} from "@/services/vendor-products";
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

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState<Record<ProductPublishStatus | "all", number>>({
    all: 0,
    draft: 0,
    pending_review: 0,
    active: 0,
    inactive: 0,
    rejected: 0,
    archived: 0,
  });
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    getCategoriesForVendorApi().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSelectedIds([]);
    const fetchData = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [result, counts] = await Promise.all([
          getVendorProductsApi({
            search,
            status: statusFilter,
            categoryId: categoryFilter === "all" ? undefined : categoryFilter,
            stockStatus: stockFilter === "all" ? undefined : stockFilter,
            minPrice: priceMin ? Number(priceMin) : undefined,
            maxPrice: priceMax ? Number(priceMax) : undefined,
            sort,
            page,
            pageSize: PAGE_SIZE,
          }),
          getVendorProductCountsApi(),
        ]);
        if (cancelled) return;
        setProducts(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        setStatusCounts(counts);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Couldn't load your products.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [page, search, sort, statusFilter, categoryFilter, stockFilter, priceMin, priceMax, reloadKey]);

  const runAction = async (fn: () => Promise<void>) => {
    setBulkActionLoading(true);
    setLoadError(null);
    try {
      await fn();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "That action failed. Please try again.");
    } finally {
      setSelectedIds([]);
      setBulkActionLoading(false);
      setReloadKey((k) => k + 1);
    }
  };

  const selectedProducts = () => products.filter((p) => selectedIds.includes(p.id));

  const handleBulkPublish = () =>
    runAction(async () => {
      for (const p of selectedProducts()) {
        if (p.publishedStatus === "active") continue;
        const r = await setProductPublishedStatusApi(p.id, "active");
        if (!r.success) throw new Error(`"${p.title}": ${r.reason ?? "could not publish"}`);
      }
    });

  const handleBulkUnpublish = () =>
    runAction(async () => {
      for (const p of selectedProducts()) {
        if (p.publishedStatus === "active") await setProductPublishedStatusApi(p.id, "inactive");
      }
    });

  const handleBulkArchive = () =>
    runAction(async () => {
      for (const p of selectedProducts()) {
        if (p.publishedStatus !== "archived") await archiveVendorProductApi(p.id);
      }
    });

  const rowActions = {
    onPublish: (p: Product) =>
      runAction(async () => {
        const r = await setProductPublishedStatusApi(p.id, "active");
        if (!r.success) throw new Error(r.reason ?? "Could not publish product");
      }),
    onArchive: (p: Product) => runAction(() => archiveVendorProductApi(p.id)),
    onRestore: (p: Product) => runAction(() => restoreVendorProductApi(p.id)),
    onDelete: (p: Product) => runAction(() => deleteVendorProductApi(p.id)),
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