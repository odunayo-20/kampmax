import { describe, expect, it, vi } from "vitest";
import { createMockSupportManagementService } from "@/services/admin/support-management.service";
import { buildSupportDataset } from "@/data/admin/support-management";
import { getNotificationsByUser } from "@/data/notifications";
import { getWallet, getWalletTransactions } from "@/services/wallet";
import type { SupportTicket } from "@/types/admin";
import type { AdminActingContext } from "@/types/admin";

// ------------------------------------------------------------
// CUSTOMER SUPPORT SURFACE TESTS (Customer Support portal side
// of Module 56).
//
// Exercises the customer-facing operations of the SHARED support
// store: scoping to the caller, ownership enforcement on related
// resources, least-privilege responses (no internal notes, no
// escalation exposure), server-forced priority/status, and the
// real notification that a support reply delivers to the customer
// (actionUrl deep-links to /support/<ticketId>).
// ------------------------------------------------------------

// Orders now come only from the backend; supply the one order this suite needs.
vi.mock("@/services/orders", async (importActual) => {
  const actual = await importActual<typeof import("@/services/orders")>();
  return {
    ...actual,
    getOrderById: (id: string) =>
      id === "KMP-3847" ? ({ id, buyerId: "u1" } as never) : undefined,
  };
});

type CombinedService = ReturnType<typeof createMockSupportManagementService>;

/** Live (mutatable) seeded ticket in the dataset's own identity space. */
function pickTicket(match: (t: SupportTicket) => boolean): SupportTicket {
  const dataset = buildSupportDataset();
  const ticket = dataset.tickets.find(match);
  expect(ticket).toBeDefined();
  return ticket as SupportTicket;
}

// Demo customer with owned orders and wallet transactions (deterministic
// seed data: u1 owns KMP-3847.. and wallet w1 with transactions).
const BUYER = "u1";
const STRANGER = "u2";

describe("supportService customer surface (shared store)", () => {
  it("listMine returns only the caller's tickets, newest activity first", async () => {
    const svc = createMockSupportManagementService();
    const ticket = pickTicket(() => true);

    const mine = await svc.listMine(ticket.customer.id);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((t) => t.customer.id === ticket.customer.id)).toBe(true);

    const times = mine.map((t) => new Date(t.updatedAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));

    const strangers = await svc.listMine(STRANGER);
    expect(
      strangers.every((t) => t.customer.id === STRANGER)
    ).toBe(true);
  });

  it("getMine returns a customer-safe detail: no internal notes, no escalation metadata, no PII dump", async () => {
    const svc = createMockSupportManagementService();
    const ticket = pickTicket(() => true);

    const detail = await svc.getMine(ticket.customer.id, ticket.id);
    expect(detail).not.toBeNull();
    if (!detail) return;

    expect(detail.ticket.id).toBe(ticket.id);
    expect(detail.ticket.escalated).toBe(false);
    expect(detail.ticket.escalation).toBeNull();
    expect(detail.ticket).not.toHaveProperty("internalNotes");
    expect(detail.messages.every((m) => m.visibility === "customer")).toBe(
      true
    );
    expect(detail.ticket.customer).not.toHaveProperty("email");
  });

  it("getMine refuses to leak another customer's case", async () => {
    const svc = createMockSupportManagementService();
    const ticket = pickTicket(() => true);

    const other = ticket.customer.id === BUYER ? STRANGER : BUYER;
    const detail = await svc.getMine(other, ticket.id);
    expect(detail).toBeNull();
  });

  it("createForCustomer opens a ticket with server-forced priority/status that the admin console sees", async () => {
    const svc = createMockSupportManagementService();
    const before = (await svc.list({ pageSize: 100 })).total;

    const created = await svc.createForCustomer(BUYER, {
      category: "marketplace",
      subject: "Order never arrived",
      description: "My order has been showing out for delivery for days.",
      attachments: [
        {
          id: "att-test-1",
          name: "receipt.png",
          sizeBytes: 24000,
          mimeType: "image/png",
          kind: "image",
          uploadedBy: "customer",
        },
      ],
    });

    expect(created.ticket.id).toMatch(/^tkt-\d{3}$/);
    expect(created.ticket.status).toBe("open");
    expect(created.ticket.priority).toBe("normal");
    expect(created.ticket.customer.id).toBe(BUYER);
    expect(created.ticket.escalated).toBe(false);
    expect(created.ticket.assigneeId).toBeNull();
    expect(created.description).toContain("out for delivery");
    expect(created.ticket.relatedResource).toBeNull();

    const adminView = await svc.list({ pageSize: 100 });
    expect(adminView.total).toBe(before + 1);
    expect(
      adminView.items.some((t) => t.id === created.ticket.id)
    ).toBe(true);
  });

  it("rejects creation with an invalid category or too-short description", async () => {
    const svc = createMockSupportManagementService();

    await expect(
      svc.createForCustomer(BUYER, {
        category: "not_a_category" as SupportTicket["category"],
        subject: "Whatever",
        description: "A sufficiently long description.",
      })
    ).rejects.toThrow("valid category");

    await expect(
      svc.createForCustomer(BUYER, {
        category: "payments",
        subject: "Payment",
        description: "short",
      })
    ).rejects.toThrow("a little more detail");
  });

  it("only lets a customer attach an order they own", async () => {
    const svc = createMockSupportManagementService();
    const theirOrder = "KMP-3847"; // buyerId u1

    const ok = await svc.createForCustomer(BUYER, {
      category: "marketplace",
      subject: "Refund for an order",
      description: "This order was charged twice and I need a refund.",
      related: { kind: "order", id: theirOrder },
    });
    expect(ok.ticket.relatedResource).toMatchObject({
      type: "order",
      id: theirOrder,
    });

    await expect(
      svc.createForCustomer(STRANGER, {
        category: "marketplace",
        subject: "Refund for an order",
        description: "This order was charged twice and I need a refund.",
        related: { kind: "order", id: theirOrder },
      })
    ).rejects.toThrow("verify this order belongs to your account");
  });

  it("only lets a customer attach a transaction from their own wallet", async () => {
    const svc = createMockSupportManagementService();
    const wallet = getWallet(BUYER);
    const theirTx = wallet ? getWalletTransactions(wallet.id)[0] : undefined;
    expect(theirTx).toBeDefined();
    if (!theirTx) return;

    const ok = await svc.createForCustomer(BUYER, {
      category: "payments",
      subject: "Duplicate charge",
      description: "My wallet shows a payment I never authorised.",
      related: { kind: "transaction", id: theirTx.id },
    });
    expect(ok.ticket.relatedResource).toMatchObject({
      type: "transaction",
      id: theirTx.id,
    });

    await expect(
      svc.createForCustomer(STRANGER, {
        category: "payments",
        subject: "Duplicate charge",
        description: "My wallet shows a payment I never authorised.",
        related: { kind: "transaction", id: theirTx.id },
      })
    ).rejects.toThrow("verify this transaction belongs to your account");
  });

  it("replyForCustomer appends to the thread and moves waiting_on_customer back to open", async () => {
    const svc = createMockSupportManagementService();
    const ticket = pickTicket(
      (t) => t.status === "waiting_on_customer"
    );

    const detail = await svc.replyForCustomer(ticket.customer.id, ticket.id, {
      body: "Yes, the screenshot you asked for is attached.",
    });
    expect(detail).not.toBeNull();
    if (!detail) return;

    expect(detail.ticket.status).toBe("open");
    expect(detail.messages.at(-1)?.postedBy).toBe("customer");
    expect(detail.messages.at(-1)?.body).toContain("screenshot");
  });

  it("blocks replies to resolved/closed cases and rejects unknown cases silently", async () => {
    const svc = createMockSupportManagementService();
    const finished = pickTicket(
      (t) => t.status === "resolved" || t.status === "closed"
    );

    await expect(
      svc.replyForCustomer(finished.customer.id, finished.id, {
        body: "Can you reopen this?",
      })
    ).rejects.toThrow("closed");

    const ghost = await svc.replyForCustomer(BUYER, "tkt-999", {
      body: "Hello?",
    });
    expect(ghost).toBeNull();
  });

  it("notifies the customer (in-app) when support replies, deep-linking to /support/<id>", async () => {
    const svc = createMockSupportManagementService();
    const ticket = pickTicket((t) => t.status === "open");
    const customerId = ticket.customer.id;

    const before = getNotificationsByUser(customerId);

    const admin = {
      id: "adm-test-reply",
      name: "Test Support Admin",
      role: "ADMIN" as const,
      email: "adm-test-reply@kampmax.ng",
      campusId: null,
      avatar: "/brand/avatar.png",
      title: "Test",
      lastLoginAt: "2026-01-01T08:00:00.000Z",
    };
    const ctx: AdminActingContext = { actor: admin };

    await svc.respond(
      ticket.id,
      { body: "Thanks — we are on it.", visibility: "customer" },
      ctx
    );

    const after = getNotificationsByUser(customerId);
    expect(after.length).toBe(before.length + 1);
    const newest = after[0];
    expect(newest.userId).toBe(customerId);
    expect(newest.actionUrl).toBe(`/support/${ticket.id}`);
    expect(newest.message).toContain(ticket.subject);
  });

  it("setStatus notifies the customer with a /support deep link when the case is resolved", async () => {
    const svc = createMockSupportManagementService();
    const ticket = pickTicket(
      (t) => t.status === "open" || t.status === "in_progress"
    );
    const customerId = ticket.customer.id;

    const before = getNotificationsByUser(customerId);

    const admin = {
      id: "adm-test-resolve",
      name: "Test Support Admin",
      role: "ADMIN" as const,
      email: "adm-test-resolve@kampmax.ng",
      campusId: null,
      avatar: "/brand/avatar.png",
      title: "Test",
      lastLoginAt: "2026-01-01T08:00:00.000Z",
    };
    const ctx: AdminActingContext = { actor: admin };

    await svc.setStatus(ticket.id, { status: "resolved" }, ctx);

    const after = getNotificationsByUser(customerId);
    expect(after.length).toBe(before.length + 1);
    expect(after[0].actionUrl).toBe(`/support/${ticket.id}`);
    expect(after[0].message).toContain("resolved");
  });
});