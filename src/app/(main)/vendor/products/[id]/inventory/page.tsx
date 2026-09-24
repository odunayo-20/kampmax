"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getVendorProductByIdApi, adjustInventoryApi, getInventoryMovementsApi, updateVendorProductApi } from "@/services/vendor-products";
import { ProductInventoryPanel } from "@/components/vendor-products/ProductInventoryPanel";
import type { Product } from "@/types";
import type { InventoryMovement } from "@/types/vendor-products";

export default function ProductInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const p = await getVendorProductByIdApi(id);
      setProduct(p);
      setMovements(p ? await getInventoryMovementsApi(id) : []);
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAdjust = async (input: { type: "add" | "subtract" | "set"; quantity: number; reason: string; expectedStock?: number }) => {
    await adjustInventoryApi(id, input);
    await load();
  };

  const handleSetThreshold = async (threshold: number) => {
    await updateVendorProductApi(id, { lowStockThreshold: threshold });
    await load();
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
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-kampmax-text" />
          </button>
          <h1 className="text-xl font-bold text-kampmax-text">Inventory</h1>
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
        <button onClick={() => router.push(`/vendor/products/${id}`)} className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-kampmax-text" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-kampmax-text">Inventory</h1>
          <p className="text-sm text-kampmax-text-secondary">{product.title}</p>
        </div>
      </div>

      <ProductInventoryPanel
        product={product}
        onAdjustInventory={handleAdjust}
        onSetThreshold={handleSetThreshold}
        movements={movements}
      />
    </div>
  );
}