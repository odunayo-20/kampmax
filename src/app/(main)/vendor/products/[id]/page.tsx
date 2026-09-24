"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getVendorProductByIdApi, setProductPublishedStatusApi, archiveVendorProductApi, restoreVendorProductApi, deleteVendorProductApi } from "@/services/vendor-products";
import { ProductDetail } from "@/components/vendor-products/ProductDetail";
import type { Product } from "@/types";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const load = () =>
    getVendorProductByIdApi(id)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn: () => Promise<void>, after?: () => void) => {
    setError(null);
    try {
      await fn();
      if (after) after(); else await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That action failed. Please try again.");
    }
  };

  const setStatus = (status: "active" | "inactive") =>
    act(async () => {
      const r = await setProductPublishedStatusApi(id, status);
      if (!r.success) throw new Error(r.reason ?? "Could not update product status");
    });

  const handlePublish = () => setStatus("active");
  const handleUnpublish = () => setStatus("inactive");
  const handleArchive = () => act(() => archiveVendorProductApi(id), () => router.push("/vendor/products"));
  const handleRestore = () => act(() => restoreVendorProductApi(id));
  const handleDelete = () => act(() => deleteVendorProductApi(id), () => router.push("/vendor/products"));

  const handleInventory = () => {
    router.push(`/vendor/products/${id}/inventory`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center">
            <svg className="h-5 w-5 text-kampmax-text" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-bold text-kampmax-text">Product Details</h1>
        </div>
        <div className="bg-white rounded-xl border border-kampmax-border p-8 text-center">
          <p className="text-sm text-kampmax-text">Product not found</p>
          <button onClick={() => router.push("/vendor/products")} className="mt-4 text-kampmax-blue hover:underline text-sm">
            Back to products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl">
      {error && <p className="text-sm text-error-600" role="alert">{error}</p>}
      <ProductDetail
        product={product}
        onEdit={() => router.push(`/vendor/products/${id}/edit`)}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onArchive={handleArchive}
        onRestore={handleRestore}
        onDelete={handleDelete}
        onInventory={handleInventory}
      />
    </div>
  );
}