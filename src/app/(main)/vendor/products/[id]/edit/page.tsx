"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getVendorProductByIdApi, updateVendorProductApi, setProductPublishedStatusApi } from "@/services/vendor-products";
import { ProductForm } from "@/components/vendor-products/ProductForm";
import type { Product } from "@/types";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVendorProductByIdApi(id)
      .then((p) => { if (!cancelled) setProduct(p); })
      .catch(() => { if (!cancelled) setProduct(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const handleSave = async (data: any) => {
    setError(null);
    try {
      const { publishedStatus, ...fields } = data;
      await updateVendorProductApi(id, fields);
      if (publishedStatus && publishedStatus !== product?.publishedStatus) {
        const r = await setProductPublishedStatusApi(id, publishedStatus);
        if (!r.success) throw new Error(r.reason ?? "Saved, but the status could not be changed.");
      }
      router.push(`/vendor/products/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save product. Please try again.");
    }
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
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-kampmax-text" />
          </button>
          <h1 className="text-xl font-bold text-kampmax-text">Edit Product</h1>
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
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-kampmax-text" />
        </button>
        <h1 className="text-xl font-bold text-kampmax-text">Edit Product</h1>
      </div>

      {error && <p className="text-sm text-error-600" role="alert">{error}</p>}
      <ProductForm
        initialData={product}
        onSave={handleSave}
        onCancel={() => router.push(`/vendor/products/${id}`)}
      />
    </div>
  );
}