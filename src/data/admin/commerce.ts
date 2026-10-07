import { AdminOrder, PaymentRecord } from "@/types/admin";
import { mockUsers, mockVendors } from "./people";

export { mockVendors };
import { daysAgoIso, intBetween, pick, seededRandom } from "@/lib/admin/api";

// ------------------------------------------------------------
// ORDERS
// ------------------------------------------------------------

const ORDER_STATUSES = [
  "placed", "confirmed", "preparing", "out_for_delivery",
  "delivered", "delivered", "delivered", "cancelled",
] as const;

const PAYMENT_METHODS = ["paystack", "wallet", "bank_transfer", "cod"] as const;

export function buildMockOrders(count = 38): AdminOrder[] {
  const rand = seededRandom(15);
  const orders: AdminOrder[] = [];
  const approved = mockVendors.filter((v) => v.status === "approved");

  for (let i = 0; i < count; i++) {
    const vendor = pick(rand, approved);
    const customer = mockUsers[intBetween(rand, 0, mockUsers.length - 1)];
    const status = pick(rand, ORDER_STATUSES);
    const method = pick(rand, PAYMENT_METHODS);
    const subtotal = intBetween(rand, 8, 900) * 250;
    const deliveryMethod = pick(rand, ["campus_pickup", "meetup", "delivery"] as const);
    const deliveryFee = deliveryMethod === "delivery" ? 500 : 0;
    const paymentStatus =
      status === "cancelled"
        ? rand() > 0.5 ? "refunded" : "failed"
        : method === "cod"
          ? status === "delivered" ? "paid" : "pending"
          : "paid";

    orders.push({
      id: `KMP-${2400 + i}`,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      vendorId: vendor.id,
      vendorName: vendor.storeName,
      campusId: vendor.campusId,
      itemsCount: intBetween(rand, 1, 6),
      itemsSummary: `${intBetween(rand, 1, 3)}× ${pick(rand, ["Textbook", "Power bank", "Hoodie", "Groceries box", "Earbuds", "Mattress", "Skincare kit", "Photocopy pack"])}`,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      paymentMethod: method,
      paymentStatus,
      status,
      deliveryMethod,
      createdAt: daysAgoIso(rand, intBetween(rand, 0, 45)),
    });
  }
  return orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export const mockOrders: AdminOrder[] = buildMockOrders();

// ------------------------------------------------------------
// PAYMENTS LEDGER
// ------------------------------------------------------------

const PAYMENT_TYPES = [
  "order_payment", "order_payment", "order_payment",
  "wallet_funding", "vendor_payout", "refund", "commission",
] as const;

function makeRef(rand: () => number): string {
  return `PSK-${intBetween(rand, 100000, 999999)}${String.fromCharCode(65 + intBetween(rand, 0, 25))}`;
}

export function buildMockPayments(count = 34): PaymentRecord[] {
  const rand = seededRandom(23);
  const payments: PaymentRecord[] = [];

  for (let i = 0; i < count; i++) {
    const user = mockUsers[intBetween(rand, 0, mockUsers.length - 1)];
    const type = pick(rand, PAYMENT_TYPES);
    const statusRoll = rand();
    const amount =
      type === "commission"
        ? intBetween(rand, 4, 60) * 100
        : intBetween(rand, 10, 1200) * 250;

    payments.push({
      id: `pay-${String(i + 1).padStart(3, "0")}`,
      reference: makeRef(rand),
      userId: user.id,
      userName: user.name,
      counterparty:
        type === "vendor_payout"
          ? pick(rand, mockVendors.filter((v) => v.status === "approved")).storeName
          : type === "order_payment" || type === "commission"
            ? pick(rand, mockVendors.filter((v) => v.status === "approved")).storeName
            : null,
      type,
      method:
        type === "vendor_payout"
          ? "bank_transfer"
          : pick(rand, ["paystack", "wallet"] as const),
      amount,
      fee: Math.round(amount * 0.015),
      status:
        statusRoll > 0.9 ? "pending" : statusRoll > 0.84 ? "failed" : statusRoll > 0.79 ? "refunded" : "successful",
      createdAt: daysAgoIso(rand, intBetween(rand, 0, 30)),
    });
  }
  return payments.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export const mockPayments: PaymentRecord[] = buildMockPayments();
