import { expect, it } from 'vitest';

import {
  buildReturnBody,
  buyerReturnView,
  canRequestReturn,
  estimateRefund,
  isOpenReturn,
  offerProblem,
  parseOffer,
  returnRequestProblem,
  timeLeft,
  toReturnRequest,
  vendorReturnView,
  type ReturnRequest,
} from '../returns';

const now = new Date('2026-11-22T12:00:00Z');
const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();
const money = (n: number) => `N${n}`;

const request = (over: Partial<ReturnRequest> = {}): ReturnRequest => ({
  id: 'r1',
  status: 'REQUESTED',
  reason: 'Damaged, defective or broken',
  statement: 'The lamp was cracked.',
  items: [{ orderItemId: 'i1', productName: 'Lamp', quantity: 1 }],
  requestedAmount: 1800,
  offeredAmount: null,
  refundedAmount: null,
  vendorNote: null,
  deadlineAt: inHours(40),
  createdAt: now.toISOString(),
  resolvedAt: null,
  ...over,
});

it('reads the server request and ignores anything it cannot use', () => {
  const r = toReturnRequest({ id: 'r1', status: 'OFFERED', reason: 'x', items: [{ orderItemId: 'i1', productName: 'Lamp', quantity: 2 }], requestedAmount: '1800.00', offeredAmount: '900', refundedAmount: null, deadlineAt: inHours(1), createdAt: 'c' });
  expect(r?.requestedAmount).toBe(1800);
  expect(r?.offeredAmount).toBe(900);
  expect(r?.items[0].quantity).toBe(2);
  expect(toReturnRequest(null)).toBe(null);
  expect(toReturnRequest({ id: 'r1', status: 'SOMETHING_NEW' })).toBe(null);
});

it('time left reads like a person would say it, and is empty once up', () => {
  expect(timeLeft(inHours(60), now)).toBe('2 days');
  expect(timeLeft(inHours(5.5), now)).toBe('5 hours');
  expect(timeLeft(inHours(1), now)).toBe('1 hour');
  expect(timeLeft(inHours(0.2), now)).toBe('under an hour');
  expect(timeLeft(inHours(-1), now)).toBe('');
  expect(timeLeft(null, now)).toBe('');
});

it('a refund can be asked for only on a delivered, unpaid-out, unreported order inside the window, once', () => {
  const o = { status: 'delivered', settled: false, dispute: null, returnRequest: null, returnWindowEndsAt: inHours(10) };
  expect(canRequestReturn(o, now)).toBe(true);
  expect(canRequestReturn({ ...o, status: 'out_for_delivery' }, now)).toBe(false);
  expect(canRequestReturn({ ...o, settled: true }, now)).toBe(false);
  expect(canRequestReturn({ ...o, dispute: {} }, now)).toBe(false);
  expect(canRequestReturn({ ...o, returnRequest: request() }, now)).toBe(false);
  expect(canRequestReturn({ ...o, returnWindowEndsAt: inHours(-1) }, now)).toBe(false);
});

it('the estimate matches the server: everything back is the whole total, part is items less their discount share', () => {
  const order = { subtotal: 5000, discountAmount: 500, totalAmount: 4800, items: [{ id: 'lamp', quantity: 2, unitPrice: 2000 }, { id: 'bulb', quantity: 1, unitPrice: 1000 }] };
  expect(estimateRefund(order, { lamp: 2, bulb: 1 })).toEqual({ amount: 4800, wholeOrder: true });
  expect(estimateRefund(order, { lamp: 1 })).toEqual({ amount: 1800, wholeOrder: false });
  expect(estimateRefund(order, { lamp: 9 })).toEqual({ amount: 3600, wholeOrder: false });
});

it('the request form asks for items, a reason and a few words, then builds the body', () => {
  expect(returnRequestProblem({}, 'damaged', 'It arrived broken')).toMatch(/Choose what/);
  expect(returnRequestProblem({ i1: 1 }, null, 'It arrived broken')).toMatch(/Pick what/);
  expect(returnRequestProblem({ i1: 1 }, 'damaged', 'short')).toMatch(/at least/);
  expect(returnRequestProblem({ i1: 1 }, 'damaged', 'It arrived broken')).toBe(null);
  expect(buildReturnBody({ i1: 1, i2: 0 }, 'damaged', '  It arrived broken ')).toEqual({
    items: [{ orderItemId: 'i1', quantity: 1 }],
    reason: 'Damaged, defective or broken',
    statement: 'It arrived broken',
  });
});

it('an offer must be a real amount below what was asked', () => {
  expect(offerProblem('', 1800)!).toMatch(/Enter/);
  expect(offerProblem('abc', 1800)!).toMatch(/Enter/);
  expect(offerProblem('1,800', 1800)!).toMatch(/less than/);
  expect(offerProblem('₦1,200', 1800)).toBe(null);
  expect(parseOffer('1,200.555')).toBe(1200.56);
});

it('the buyer is told what is happening and offered only the steps the server allows', () => {
  expect(buyerReturnView(request(), now, money).actions).toEqual(['withdraw']);
  expect(buyerReturnView(request({ deadlineAt: inHours(-1) }), now, money).actions).toEqual(['escalate', 'withdraw']);
  const offer = buyerReturnView(request({ status: 'OFFERED', offeredAmount: 900, vendorNote: 'Half is fine' }), now, money);
  expect(offer.title).toBe('The seller offered N900');
  expect(offer.text).toMatch(/Half is fine/);
  expect(offer.actions).toEqual(['accept_offer', 'escalate', 'withdraw']);
  expect(buyerReturnView(request({ status: 'DECLINED', deadlineAt: inHours(-1) }), now, money).actions).toEqual([]);
  expect(buyerReturnView(request({ status: 'ESCALATED' }), now, money).actions).toEqual([]);
  expect(buyerReturnView(request({ status: 'REFUNDED', refundedAmount: 1800 }), now, money).tone).toBe('positive');
});

it('the seller answers once, in time; then waits, confirms the items, or asks Kampmax', () => {
  expect(vendorReturnView(request(), now, money).actions).toEqual(['refund', 'return_first', 'offer', 'decline']);
  expect(vendorReturnView(request({ deadlineAt: inHours(-1) }), now, money).actions).toEqual([]);
  expect(vendorReturnView(request({ status: 'AWAITING_RETURN' }), now, money).actions).toEqual(['received', 'escalate']);
  expect(vendorReturnView(request({ status: 'OFFERED', offeredAmount: 900 }), now, money).actions).toEqual([]);
});

it('open requests are the ones that still hold the payout', () => {
  expect(isOpenReturn('ESCALATED')).toBe(true);
  expect(isOpenReturn('REFUNDED')).toBe(false);
  expect(isOpenReturn(null)).toBe(false);
});
