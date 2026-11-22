// One place that turns a product row from GET /admin/products into the small rows the dashboard and the reports
// show. Both screens read the same fields, so a field renamed on the backend breaks (and gets fixed) in one spot.

import type { LowStockRow, ManagedProduct, TopProductRow } from "@/types/admin";

export function toTopProductRow(p: ManagedProduct): TopProductRow {
  return {
    productId: p.id,
    title: p.title,
    vendorName: p.vendorName,
    campusShortName: p.campusShortName,
    unitsSold: p.salesCount,
    revenue: p.revenue,
  };
}

export function toLowStockRow(p: ManagedProduct): LowStockRow {
  return {
    productId: p.id,
    title: p.title,
    vendorName: p.vendorName,
    status: p.status as LowStockRow["status"],
    stock: p.stock,
  };
}
