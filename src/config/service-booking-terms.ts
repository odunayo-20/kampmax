/**
 * The service-booking rules that providers are told about before they apply.
 *
 * These mirror constants in the backend (kampmax-backend:
 * src/modules/service-bookings/booking-view.ts). The backend is what actually
 * enforces them; this file only lets the pages describe them. If one changes there,
 * change it here too — and ideally the backend would publish these so the pages
 * could read them instead of repeating them.
 */

/** Kampmax's share of each completed booking (backend: PLATFORM_FEE_RATE). */
export const SERVICE_FEE_RATE = 0.08;

/** A finished booking the customer never confirms is confirmed for them after this long (AUTO_CONFIRM_HOURS). */
export const AUTO_CONFIRM_HOURS = 72;

/** A request a provider hasn't answered within this long expires and is refunded (REQUEST_RESPONSE_HOURS). */
export const REQUEST_RESPONSE_HOURS = 24;

/** Customers can cancel for free up to this long before a booking starts (FREE_CANCELLATION_HOURS). */
export const FREE_CANCELLATION_HOURS = 2;

/** What a provider keeps from a booking of `price`, and what Kampmax's fee is. */
export function splitBookingPrice(price: number): { fee: number; earnings: number } {
  const fee = Math.round(price * SERVICE_FEE_RATE * 100) / 100;
  return { fee, earnings: Math.round((price - fee) * 100) / 100 };
}

/** The fee as a whole-number percentage, for display ("8"). */
export const SERVICE_FEE_PERCENT = Math.round(SERVICE_FEE_RATE * 100);
