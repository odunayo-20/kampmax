"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Package, Plus, Check } from "lucide-react";
import { useRestockProduct, useVendorLowStock } from "@/hooks/use-vendor-dashboard";
import type { Product } from "@/types";
import { formatNaira } from "@/lib/utils";

export function VendorInventoryAlerts() {
  const { data: lowStockProducts = [] } = useVendorLowStock();
  const restock = useRestockProduct();
  const [updatedMap, setUpdatedMap] = useState<Record<string, boolean>>({});

  if (lowStockProducts.length === 0) return null;

  function handleAddStock(product: Product, qty: number) {
    restock.mutate(
      { product, quantity: qty },
      {
        onSuccess: () => {
          setUpdatedMap((prev) => ({ ...prev, [product.id]: true }));
          setTimeout(() => setUpdatedMap((prev) => ({ ...prev, [product.id]: false })), 1500);
        },
      }
    );
  }

  return (
    <div className="rounded-xl border border-warning-200 bg-warning-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-warning-800">
          <AlertTriangle className="h-4 w-4 text-warning-600" />
          <h3 className="text-sm font-bold">Inventory Alerts — Low / Out of Stock</h3>
        </div>
        <Link
          href="/vendor/products?stockStatus=low_stock"
          className="text-xs font-semibold text-primary-700 hover:underline"
        >
          View all inventory
        </Link>
      </div>

      <div className="space-y-2">
        {lowStockProducts.map((p) => {
          const currentStock = p.stock ?? 0;
          const isUpdated = updatedMap[p.id];

          return (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-neutral-200 text-xs shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-md bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {p.images && p.images[0] ? (
                    <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-4 h-4 text-neutral-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900 truncate">{p.title}</p>
                  <p className="text-[11px] text-neutral-500">
                    {formatNaira(p.price)} ·{" "}
                    <span
                      className={
                        currentStock === 0 ? "text-error-600 font-bold" : "text-warning-700 font-semibold"
                      }
                    >
                      {currentStock === 0 ? "Out of Stock" : `Only ${currentStock} left`}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isUpdated ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                    <Check className="w-3 h-3 text-emerald-600" /> Refilled!
                  </span>
                ) : (
                  <>
                    <button
                      disabled={restock.isPending}
                      onClick={() => handleAddStock(p, 5)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-[11px] font-semibold text-neutral-700 border border-neutral-200 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> 5
                    </button>
                    <button
                      disabled={restock.isPending}
                      onClick={() => handleAddStock(p, 10)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary-50 hover:bg-primary-100 text-[11px] font-bold text-primary-700 border border-primary-200 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> 10
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
