// ============================================================
// SERVICE FEE — WORDING AND PREVIEW MATH
// ============================================================
//
// The freelancer pays a service fee on each payment, taken from what they are
// paid (the client never pays more than the agreed price). The backend is the
// only thing that takes it, using the terms locked on the contract. This file
// mirrors its rule so a form can say what to expect BEFORE anyone agrees; the
// real numbers always come back from the server once a payment is made.

import { formatNaira } from "@/lib/utils";

export interface FeeTerms {
  /** Percent of each payment. 0 means no fee is charged. */
  rate: number;
  /** The least a payment is charged once the rate is above zero, in naira. */
  minimum: number;
}

export const NO_FEE: FeeTerms = { rate: 0, minimum: 0 };

const toKobo = (naira: number): number => Math.round(naira * 100);

/**
 * What a payment of `amount` would be charged and leave the freelancer: the
 * rate (half up, to the kobo) but not below the minimum, and never more than
 * the payment. `fee + net` is always exactly `amount`.
 */
export function splitServiceFee(amount: number, terms: FeeTerms): { fee: number; net: number } {
  const paid = toKobo(amount);
  if (!Number.isFinite(paid) || paid <= 0 || !(terms.rate > 0)) return { fee: 0, net: amount };
  const basisPoints = Math.round(terms.rate * 100);
  const byRate = Math.floor((paid * basisPoints + 5000) / 10000);
  const fee = Math.min(Math.max(byRate, toKobo(terms.minimum)), paid);
  return { fee: fee / 100, net: (paid - fee) / 100 };
}

/** "10%" or "7.5%". */
export function formatFeeRate(rate: number): string {
  return `${Number.isInteger(rate) ? rate : rate.toFixed(2).replace(/0+$/, "")}%`;
}

/**
 * The line shown under a price: what the freelancer receives after the fee.
 * Null when there is no fee or no price to work from.
 */
export function describeNet(amount: number | undefined, terms: FeeTerms): string | null {
  if (amount === undefined || !(amount > 0) || !(terms.rate > 0)) return null;
  const { fee, net } = splitServiceFee(amount, terms);
  return `${formatNaira(net)} after the ${formatNaira(fee)} service fee`;
}

/** How the fee works, for the fine print: the rate and the minimum. */
export function describeFeeTerms(terms: FeeTerms): string | null {
  if (!(terms.rate > 0)) return null;
  const minimum = terms.minimum > 0 ? `, at least ${formatNaira(terms.minimum)} a payment` : "";
  return `Kampmax's service fee is ${formatFeeRate(terms.rate)} of each payment${minimum}. The client always pays the price you agree.`;
}

/**
 * What a settled milestone paid the freelancer once its fee was taken, e.g.
 * "₦45,000 received after the ₦5,000 service fee". Null when it is not paid or
 * no fee was taken. `paid` is the milestone's payment before the fee.
 */
export function describeReceived(paid: number, feeAmount: number | null): string | null {
  if (feeAmount === null || !(feeAmount > 0)) return null;
  const net = Math.round((paid - feeAmount) * 100) / 100;
  return `${formatNaira(net)} received after the ${formatNaira(feeAmount)} service fee`;
}
