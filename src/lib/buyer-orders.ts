import type { Order, OrderStatus } from "@/types";

/**
 * What a buyer needs to know about an order in plain words, as on the mobile app: what comes
 * next for an order that is still moving, and which orders are waiting on the buyer.
 */

/** The next step, for the statuses an order passes through before it is delivered or cancelled. */
const NEXT_STEP: Partial<Record<OrderStatus, string>> = {
  placed: "This order is not paid for yet. Nothing is charged until you pay.",
  confirmed: "The seller has your order and will start preparing it.",
  preparing: "The seller is getting your items ready.",
  ready: "The seller is getting your items ready.",
  out_for_delivery: "Your order is on its way. Keep your phone close.",
};

/** One line on what happens next, or null once the order is delivered or cancelled. */
export function nextStepText(status: OrderStatus): string | null {
  return NEXT_STEP[status] ?? null;
}

/** One line for the top of the list: what is on its way, then what is waiting for payment. Null when nothing needs attention. */
export function ordersHeadline(statuses: OrderStatus[]): string | null {
  const onTheWay = statuses.filter((s) => s === "out_for_delivery").length;
  if (onTheWay > 0) return onTheWay === 1 ? "1 order is on its way" : `${onTheWay} orders are on their way`;
  const unpaid = statuses.filter((s) => s === "placed").length;
  if (unpaid > 0) return unpaid === 1 ? "1 order is waiting for payment" : `${unpaid} orders are waiting for payment`;
  return null;
}

/** Whether an order answers a search: its number, its seller's name or a product in it, in any case, ignoring a leading "#". */
export function matchesOrder(order: Pick<Order, "id" | "vendorName" | "items">, query: string, vendorName?: string): boolean {
  const q = query.trim().replace(/^#/, "").toLowerCase();
  if (!q) return true;
  return (
    order.id.toLowerCase().includes(q) ||
    (vendorName ?? order.vendorName ?? "").toLowerCase().includes(q) ||
    order.items.some((i) => i.product.title.toLowerCase().includes(q))
  );
}
