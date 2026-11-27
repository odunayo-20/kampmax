"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/vendor-products/ProductForm";
import { useInvalidateProducts } from "@/hooks/use-vendor-products";
import { createVendorProductApi, ProductSavedAsDraftError } from "@/services/vendor-products";

export default function AddProductPage() {
  const router = useRouter();
  const invalidateProducts = useInvalidateProducts();

  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  const handleSave = async (data: any) => {
    setError(null);
    setDraftId(null);
    try {
      await createVendorProductApi(data);
      invalidateProducts();
      router.push("/vendor/products");
    } catch (err) {
      if (err instanceof ProductSavedAsDraftError) {
        invalidateProducts();
        setDraftId(err.productId);
      }
      setError(err instanceof Error ? err.message : "Could not create product. Please try again.");
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-kampmax-text" />
        </button>
        <h1 className="text-xl font-bold text-kampmax-text">Add New Product</h1>
      </div>

      {error && (
        <p className="text-sm text-error-600" role="alert">
          {error}{" "}
          {draftId && (
            <Link href={`/vendor/products/${draftId}/edit`} className="underline">
              Open the draft
            </Link>
          )}
        </p>
      )}
      <ProductForm onSave={handleSave} onCancel={() => router.push("/vendor/products")} />
    </div>
  );
}
