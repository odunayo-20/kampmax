import type { ManagedTransaction } from "@/types/admin";
import {
  transactionMethodLabel,
  transactionStatusLabel,
  transactionTypeLabel,
} from "./transactions-meta";

const HEADERS = [
  "Transaction ID",
  "Type",
  "Status",
  "Direction",
  "Amount (NGN)",
  "Platform fee (NGN)",
  "Method",
  "Channel",
  "Reference",
  "Order ID",
  "Customer",
  "Customer ID",
  "Vendor",
  "Created at",
];

/** Quote a cell; neutralise spreadsheet formula injection on text values. */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transactionsToCsv(rows: ManagedTransaction[]): string {
  const lines = rows.map((r) =>
    [
      r.id,
      transactionTypeLabel(r.type),
      transactionStatusLabel(r.status),
      r.direction,
      r.amount,
      r.platformFee,
      transactionMethodLabel(r.method),
      r.channelLabel,
      r.reference,
      r.orderId,
      r.customerName,
      r.customerId,
      r.vendorName,
      r.createdAt,
    ]
      .map(cell)
      .join(",")
  );
  return [HEADERS.map(cell).join(","), ...lines].join("\r\n");
}

/** Triggers a browser download. The BOM keeps Excel from mangling UTF-8. */
export function downloadTransactionsCsv(rows: ManagedTransaction[]): void {
  const blob = new Blob(["﻿", transactionsToCsv(rows)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
