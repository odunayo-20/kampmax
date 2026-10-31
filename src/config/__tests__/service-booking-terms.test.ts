import { describe, expect, it } from "vitest";
import {
  AUTO_CONFIRM_HOURS,
  FREE_CANCELLATION_HOURS,
  REQUEST_RESPONSE_HOURS,
  SERVICE_FEE_PERCENT,
  SERVICE_FEE_RATE,
  splitBookingPrice,
} from "../service-booking-terms";

describe("service booking terms", () => {
  it("states the fee as 8%", () => {
    expect(SERVICE_FEE_RATE).toBe(0.08);
    expect(SERVICE_FEE_PERCENT).toBe(8);
  });

  it("splits a booking into Kampmax's fee and the provider's earnings", () => {
    // The same split the backend records: a 5,000 booking keeps 4,600 for the provider.
    expect(splitBookingPrice(5000)).toEqual({ fee: 400, earnings: 4600 });
  });

  it("rounds to kobo, and the two parts always add up to the price", () => {
    const { fee, earnings } = splitBookingPrice(1234.56);
    expect(fee).toBe(98.76);
    expect(earnings).toBe(1135.8);
    expect(Math.round((fee + earnings) * 100) / 100).toBe(1234.56);
  });

  it("matches the rules the backend enforces", () => {
    expect(AUTO_CONFIRM_HOURS).toBe(72);
    expect(REQUEST_RESPONSE_HOURS).toBe(24);
    expect(FREE_CANCELLATION_HOURS).toBe(2);
  });
});
