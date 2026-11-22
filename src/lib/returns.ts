/**
 * Refunds and returns after delivery, for both sides: what a request looks like, who can do what next,
 * and the words for each step. Mirrors the backend's order-returns rules (3-day window, 48 hours to
 * answer, part refunds priced the same way) and the mobile app's lib/returns.ts. No screens, no network.
 */

export type ReturnTone = 'attention' | 'positive' | 'info' | 'neutral' | 'bad';

export type ReturnStatus = 'REQUESTED' | 'OFFERED' | 'AWAITING_RETURN' | 'DECLINED' | 'ESCALATED' | 'REFUNDED' | 'CLOSED' | 'WITHDRAWN';

const STATUSES: readonly ReturnStatus[] = ['REQUESTED', 'OFFERED', 'AWAITING_RETURN', 'DECLINED', 'ESCALATED', 'REFUNDED', 'CLOSED', 'WITHDRAWN'];
const OPEN: readonly ReturnStatus[] = ['REQUESTED', 'OFFERED', 'AWAITING_RETURN', 'DECLINED', 'ESCALATED'];

export interface ReturnRequest {
  id: string;
  status: ReturnStatus;
  reason: string;
  statement: string | null;
  items: { orderItemId: string; productName: string; quantity: number }[];
  requestedAmount: number;
  offeredAmount: number | null;
  refundedAmount: number | null;
  vendorNote: string | null;
  deadlineAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export const RETURN_REASONS = [
  { id: 'damaged', label: 'Damaged, defective or broken' },
  { id: 'wrong_item', label: 'Wrong item, size or colour' },
  { id: 'not_as_described', label: 'Not as described' },
  { id: 'missing_parts', label: 'Missing parts or incomplete' },
  { id: 'other', label: 'Something else' },
] as const;
export type ReturnReasonId = (typeof RETURN_REASONS)[number]['id'];

export const RETURN_STATEMENT_MIN = 10;
export const RETURN_STATEMENT_MAX = 2000;
export const VENDOR_NOTE_MAX = 500;
export const DECLINE_NOTE_MIN = 5;

export function isReturnStatus(value: unknown): value is ReturnStatus {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

/** True while the request still decides how much the seller gets. */
export function isOpenReturn(status: string | null | undefined): boolean {
  return isReturnStatus(status) && OPEN.includes(status);
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: unknown): number | null => (v == null ? null : num(v));
const textOrNull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/** The server's request as the app uses it; null when there is none (or it can't be read). */
export function toReturnRequest(raw: unknown): ReturnRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !isReturnStatus(r.status)) return null;
  const items = Array.isArray(r.items) ? (r.items as Record<string, unknown>[]) : [];
  return {
    id: r.id,
    status: r.status,
    reason: typeof r.reason === 'string' ? r.reason : '',
    statement: textOrNull(r.statement),
    items: items.map((i) => ({ orderItemId: String(i.orderItemId ?? ''), productName: String(i.productName ?? 'Item'), quantity: num(i.quantity) })),
    requestedAmount: num(r.requestedAmount),
    offeredAmount: numOrNull(r.offeredAmount),
    refundedAmount: numOrNull(r.refundedAmount),
    vendorNote: textOrNull(r.vendorNote),
    deadlineAt: textOrNull(r.deadlineAt),
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : '',
    resolvedAt: textOrNull(r.resolvedAt),
  };
}

/** "2 days", "5 hours", "under an hour"; empty once the time is up. */
export function timeLeft(iso: string | null, now: Date): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - now.getTime();
  if (!(ms > 0)) return '';
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 48) return `${Math.floor(hours / 24)} days`;
  if (hours >= 1) return hours === 1 ? '1 hour' : `${hours} hours`;
  return 'under an hour';
}

function overdue(r: Pick<ReturnRequest, 'deadlineAt'>, now: Date): boolean {
  return !!r.deadlineAt && new Date(r.deadlineAt).getTime() <= now.getTime();
}

/** The order facts the buyer's "ask for a refund" depends on. */
export interface ReturnableOrder {
  /** The app's lowercase order status. */
  status: string;
  settled?: boolean;
  dispute?: unknown;
  returnRequest?: ReturnRequest | null;
  returnWindowEndsAt?: string | null;
}

/** Delivered, seller not paid, never reported or asked before, and still inside the window. Mirrors the server. */
export function canRequestReturn(o: ReturnableOrder, now: Date): boolean {
  return o.status === 'delivered' && !o.settled && !o.dispute && !o.returnRequest && !!timeLeft(o.returnWindowEndsAt ?? null, now);
}

export interface PricedOrder {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  items: { id: string; quantity: number; unitPrice: number }[];
}

/**
 * What the picked items would refund (`picked` is quantity per order item). Everything back gives the
 * whole total, delivery included; part of the order gives the items' price less their share of any discount.
 * The server prices it again; this is the preview.
 */
export function estimateRefund(order: PricedOrder, picked: Record<string, number>): { amount: number; wholeOrder: boolean } {
  let value = 0;
  let everything = order.items.length > 0;
  for (const item of order.items) {
    const q = Math.min(item.quantity, Math.max(0, Math.floor(picked[item.id] ?? 0)));
    value += q * item.unitPrice;
    if (q < item.quantity) everything = false;
  }
  if (everything) return { amount: order.totalAmount, wholeOrder: true };
  const share = order.subtotal > 0 ? (value / order.subtotal) * order.discountAmount : 0;
  return { amount: Math.round(Math.min(order.totalAmount, Math.max(0, value - share)) * 100) / 100, wholeOrder: false };
}

/** The first thing wrong with the request form, or null when it can be sent. */
export function returnRequestProblem(picked: Record<string, number>, reasonId: ReturnReasonId | null, statement: string): string | null {
  if (!Object.values(picked).some((q) => q > 0)) return 'Choose what you want a refund for.';
  if (!reasonId) return 'Pick what went wrong.';
  const s = statement.trim();
  if (s.length < RETURN_STATEMENT_MIN) return `Tell the seller what happened, in at least ${RETURN_STATEMENT_MIN} characters.`;
  if (s.length > RETURN_STATEMENT_MAX) return `Keep it under ${RETURN_STATEMENT_MAX} characters.`;
  return null;
}

/** The body for POST /orders/:id/return. */
export function buildReturnBody(picked: Record<string, number>, reasonId: ReturnReasonId, statement: string) {
  return {
    items: Object.entries(picked)
      .filter(([, q]) => q > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity })),
    reason: RETURN_REASONS.find((r) => r.id === reasonId)?.label ?? 'Something else',
    statement: statement.trim(),
  };
}

/** A seller's partial offer typed as text: null when fine, or what is wrong. */
export function offerProblem(text: string, requested: number): string | null {
  const amount = Number(text.replace(/[,\s₦]/g, ''));
  if (!text.trim() || !Number.isFinite(amount) || amount <= 0) return 'Enter the amount you will refund.';
  if (amount >= requested) return 'An offer must be less than what the buyer asked for. To refund it all, choose "Refund now".';
  return null;
}

export function parseOffer(text: string): number {
  return Math.round(Number(text.replace(/[,\s₦]/g, '')) * 100) / 100;
}

export type BuyerReturnAction = 'accept_offer' | 'escalate' | 'withdraw';
export type VendorReturnAction = 'refund' | 'return_first' | 'offer' | 'decline' | 'received' | 'escalate';

export interface ReturnView<A> {
  title: string;
  text: string;
  tone: ReturnTone;
  actions: A[];
}

type Money = (n: number) => string;

/** Where the buyer's request stands, and what they can do now. */
export function buyerReturnView(r: ReturnRequest, now: Date, money: Money): ReturnView<BuyerReturnAction> {
  const left = timeLeft(r.deadlineAt, now);
  const said = r.vendorNote ? ` The seller said: "${r.vendorNote}"` : '';
  switch (r.status) {
    case 'REQUESTED':
      return overdue(r, now)
        ? { title: 'The seller ran out of time', text: 'Kampmax will now decide on your refund. You can also ask now.', tone: 'attention', actions: ['escalate', 'withdraw'] }
        : { title: 'Waiting for the seller', text: `You asked for ${money(r.requestedAmount)} back. The seller has ${left} to answer. If they don't, Kampmax decides.`, tone: 'info', actions: ['withdraw'] };
    case 'OFFERED':
      return {
        title: `The seller offered ${money(r.offeredAmount ?? 0)}`,
        text: `You asked for ${money(r.requestedAmount)}.${said} Accept it or ask Kampmax to decide${left ? ` within ${left}` : ''}. If you do nothing, the offer is accepted.`,
        tone: 'attention',
        actions: ['accept_offer', 'escalate', 'withdraw'],
      };
    case 'AWAITING_RETURN':
      return {
        title: `Return the items to get ${money(r.requestedAmount)}`,
        text: `Hand the items back to the seller. The refund goes to your wallet as soon as they confirm they have them.${said}`,
        tone: 'attention',
        actions: ['escalate', 'withdraw'],
      };
    case 'DECLINED':
      return {
        title: 'The seller declined',
        text: `${said.trim() || 'The seller did not give a reason.'} ${left ? `You have ${left} to ask Kampmax to review it.` : 'Kampmax review is closing.'}`,
        tone: 'bad',
        actions: left ? ['escalate', 'withdraw'] : [],
      };
    case 'ESCALATED':
      return { title: 'Kampmax is reviewing your refund', text: "The seller hasn't been paid. We'll tell you the outcome here and by notification.", tone: 'info', actions: [] };
    case 'REFUNDED':
      return { title: `${money(r.refundedAmount ?? 0)} refunded`, text: 'The money is in your Kampmax wallet. You can spend it or withdraw it.', tone: 'positive', actions: [] };
    case 'CLOSED':
      return { title: 'Closed without a refund', text: 'Contact support if you still need help with this order.', tone: 'neutral', actions: [] };
    case 'WITHDRAWN':
      return { title: 'You withdrew your request', text: 'The seller is paid as normal.', tone: 'neutral', actions: [] };
  }
}

/** Where a buyer's request stands for the seller, and what they can do now. */
export function vendorReturnView(r: ReturnRequest, now: Date, money: Money): ReturnView<VendorReturnAction> {
  const left = timeLeft(r.deadlineAt, now);
  switch (r.status) {
    case 'REQUESTED':
      return {
        title: `Refund requested: ${money(r.requestedAmount)}`,
        text: left
          ? `Answer within ${left}, or Kampmax will decide. Your payout waits until this is settled.`
          : 'Your time to answer has run out, so Kampmax will decide.',
        tone: 'attention',
        actions: left ? ['refund', 'return_first', 'offer', 'decline'] : [],
      };
    case 'OFFERED':
      return { title: `You offered ${money(r.offeredAmount ?? 0)}`, text: `Waiting for the buyer${left ? ` (${left} left)` : ''}. If they don't answer, your offer is accepted.`, tone: 'info', actions: [] };
    case 'AWAITING_RETURN':
      return { title: 'Waiting for the items', text: `When you have them back, confirm it to refund ${money(r.requestedAmount)}. If the buyer doesn't return them, ask Kampmax to decide.`, tone: 'attention', actions: ['received', 'escalate'] };
    case 'DECLINED':
      return { title: 'You declined', text: `The buyer has ${left || 'a short time'} to ask Kampmax to review it. If they don't, it closes and you are paid.`, tone: 'info', actions: [] };
    case 'ESCALATED':
      return { title: 'Kampmax is reviewing', text: 'Your payout waits until Kampmax decides. You will be told the outcome.', tone: 'info', actions: [] };
    case 'REFUNDED':
      return { title: `${money(r.refundedAmount ?? 0)} refunded to the buyer`, text: 'Your payout for this order is reduced to match, and the rest is paid to you.', tone: 'neutral', actions: [] };
    case 'CLOSED':
      return { title: 'Closed without a refund', text: 'Your payout goes ahead as normal.', tone: 'positive', actions: [] };
    case 'WITHDRAWN':
      return { title: 'The buyer withdrew the request', text: 'Your payout goes ahead as normal.', tone: 'positive', actions: [] };
  }
}

/** A short label for lists (the seller's order list). */
export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  REQUESTED: 'Refund requested',
  OFFERED: 'Offer sent',
  AWAITING_RETURN: 'Return pending',
  DECLINED: 'Refund declined',
  ESCALATED: 'Refund in review',
  REFUNDED: 'Refunded',
  CLOSED: 'Refund closed',
  WITHDRAWN: 'Refund withdrawn',
};
