"use client";

import { X, Printer, CheckCircle, MapPin } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { VendorOrder } from "@/types/vendor-orders";
import { Logo } from "@/components/ui/Logo";

interface OrderReceiptModalProps {
  order: VendorOrder;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderReceiptModal({ order, isOpen, onClose }: OrderReceiptModalProps) {
  if (!isOpen || !order) return null;

  function handlePrint() {
    window.print();
  }

  const orderDate = new Date(order.createdAt).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const deliveryLocation = order.pickup?.location || order.customer.campusLabel || "Main Campus";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-neutral-50 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary-600" />
            <h2 className="text-base font-bold text-neutral-900">Packing Slip & Order Receipt</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 space-y-5 overflow-y-auto print:p-0 print:overflow-visible">
          {/* Slip Header */}
          <div className="border-b border-neutral-200 pb-4 flex justify-between items-start">
            <div>
              <Logo size="sm" />
              <p className="text-xs text-neutral-500 font-medium mt-1">Campus Super-App Order Receipt</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                {order.orderNumber ?? order.id}
              </span>
              <p className="text-[11px] text-neutral-500 mt-1">{orderDate}</p>
            </div>
          </div>

          {/* Customer & Delivery Section */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Customer Details
              </span>
              <p className="font-bold text-neutral-900 mt-0.5">{order.customer.displayName}</p>
              {order.customer.phone && (
                <p className="text-neutral-600">{order.customer.phone}</p>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Fulfillment & Location
              </span>
              <p className="font-bold text-neutral-900 mt-0.5 capitalize">
                {order.deliveryMethod.replace("_", " ")}
              </p>
              <p className="text-neutral-600 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                {deliveryLocation}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <span className="text-xs font-bold text-neutral-700 mb-2 block">Ordered Items</span>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 font-semibold">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5">
                      <p className="font-semibold text-neutral-900">{item.title}</p>
                      {item.sku && <span className="text-[10px] text-neutral-400">SKU: {item.sku}</span>}
                    </td>
                    <td className="py-2.5 text-center font-semibold text-neutral-700">{item.quantity}</td>
                    <td className="py-2.5 text-right font-medium text-neutral-600">
                      {formatNaira(item.unitPrice)}
                    </td>
                    <td className="py-2.5 text-right font-bold text-neutral-900">
                      {formatNaira(item.unitPrice * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="border-t border-neutral-200 pt-3 space-y-1 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Items Subtotal</span>
              <span className="font-semibold">{formatNaira(order.totals.vendorSubtotal)}</span>
            </div>
            {order.totals.deliveryFee !== undefined && order.totals.deliveryFee > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Delivery Fee</span>
                <span className="font-semibold">{formatNaira(order.totals.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-600">
              <span>Platform Service Fee</span>
              <span className="font-semibold">-{formatNaira(order.totals.platformFee)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-neutral-200 text-sm font-bold text-neutral-900">
              <span>Net Vendor Earnings</span>
              <span className="text-primary-700">
                {formatNaira(order.totals.vendorSubtotal - order.totals.platformFee)}
              </span>
            </div>
          </div>

          {/* Verification Footer */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Paid & Escrow Secured by Kampmax</span>
            </div>
            <span className="font-mono font-bold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
              PIN: {order.id.slice(-4)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
