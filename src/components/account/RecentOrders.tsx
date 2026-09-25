"use client";

import Link from "next/link";
import { ChevronRight, PackageOpen } from "lucide-react";
import type { Order } from "@/types";
import { OrderCard } from "@/components/orders/OrderCard";
import { getVendorById } from "@/services/users";
import { AccountEmptyState } from "./AccountEmptyState";

interface RecentOrdersProps {
  orders: Order[];
}

/** Compact "recent orders" list shown on the account dashboard. */
export function RecentOrders({ orders }: RecentOrdersProps) {
  if (orders.length === 0) {
    return (
      <AccountEmptyState
        icon={<PackageOpen />}
        title="No orders yet"
        description="When you place an order on your campus it will show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          vendorName={getVendorById(order.vendorId)?.storeName}
        />
      ))}
      <Link
        href="/orders"
        className="flex items-center justify-center gap-1 text-sm font-medium text-kampmax-blue py-2"
      >
        View all orders
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
