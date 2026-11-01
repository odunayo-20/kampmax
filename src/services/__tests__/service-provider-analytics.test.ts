import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ apiClient: { get: getMock } }));

import {
  earningsAmount,
  earningsSummary,
  getSpAnalyticsBookingsLive,
  getSpAnalyticsEarningsLive,
  getSpAnalyticsOverviewLive,
} from "../service-provider-analytics";

const period = { key: "30d" } as never;

/** Answers each analytics endpoint the way the backend does. */
function backend(earnings: unknown) {
  getMock.mockImplementation(async (url: string) => {
    const ok = (data: unknown) => ({ data, error: null });
    if (url.startsWith("/analytics/service-provider/earnings")) return ok(earnings);
    if (url === "/analytics/service-provider") {
      return ok({ overview: { totalServices: 2, totalBookings: 4, completedBookings: 2, cancelledBookings: 1, rejectedBookings: 0, acceptanceRate: 80 } });
    }
    if (url === "/analytics/service-provider/bookings/status") return ok([{ status: "COMPLETED", count: 2 }]);
    if (url === "/analytics/service-provider/services") return ok({ total: 2, active: 2, services: [] });
    if (url.startsWith("/analytics/service-provider/bookings/by-date")) return ok({ total: 0, bookings: [] });
    return { data: null, error: new Error(`unexpected ${url}`) };
  });
}

const kpi = (rows: { key: string; value: string }[], key: string) => rows.find((k) => k.key === key)?.value;

beforeEach(() => {
  getMock.mockReset();
});

describe("earningsAmount", () => {
  it("reads the backend's { earnings } answer as a plain amount", () => {
    expect(earningsAmount({ earnings: 12500 })).toBe(12500);
    expect(earningsAmount({ earnings: 0 })).toBe(0);
  });

  it("also accepts a bare number or numeric string", () => {
    expect(earningsAmount(7500)).toBe(7500);
    expect(earningsAmount("7500.5")).toBe(7500.5);
  });

  it.each([[null], [undefined], [{}], [{ earnings: "abc" }], ["abc"], [{ earnings: null }], [NaN]])(
    "counts anything unusable (%j) as 0, never NaN or an object",
    (body) => {
      expect(earningsAmount(body)).toBe(0);
    }
  );
});

describe("earningsSummary", () => {
  it("takes the fee and net the backend charged, not a rate worked out here", () => {
    expect(earningsSummary({ earnings: 10000, platformFees: 800, netEarnings: 9200 })).toEqual({
      gross: 10000,
      fees: 800,
      net: 9200,
    });
  });

  it("works the net out as gross less fees when the backend doesn't send it", () => {
    expect(earningsSummary({ earnings: 10000, platformFees: 800 })).toEqual({ gross: 10000, fees: 800, net: 9200 });
    expect(earningsSummary({ earnings: 10000, platformFees: 800, netEarnings: null })).toMatchObject({ net: 9200 });
  });

  it("treats a bare number as gross with no fee, and unusable input as all zero", () => {
    expect(earningsSummary(7500)).toEqual({ gross: 7500, fees: 0, net: 7500 });
    expect(earningsSummary(null)).toEqual({ gross: 0, fees: 0, net: 0 });
    expect(earningsSummary({ earnings: "abc", platformFees: {} })).toEqual({ gross: 0, fees: 0, net: 0 });
  });
});

describe("provider analytics money", () => {
  it("shows gross revenue as naira, not ₦[object Object]", async () => {
    backend({ earnings: 12500 });

    const overview = await getSpAnalyticsOverviewLive(period);

    expect(kpi(overview.kpis, "revenue")).toBe("₦12,500");
    expect(JSON.stringify(overview)).not.toContain("object Object");
  });

  it("shows ₦0 when there are no earnings yet", async () => {
    backend({ earnings: 0 });

    const overview = await getSpAnalyticsOverviewLive(period);

    expect(kpi(overview.kpis, "revenue")).toBe("₦0");
  });

  it("still shows ₦0, not an error, when the earnings request fails", async () => {
    getMock.mockImplementation(async (url: string) =>
      url.startsWith("/analytics/service-provider/earnings")
        ? Promise.reject(new Error("down"))
        : url === "/analytics/service-provider"
          ? { data: { overview: { totalServices: 1, totalBookings: 1, completedBookings: 1, cancelledBookings: 0, rejectedBookings: 0, acceptanceRate: 100 } }, error: null }
          : { data: null, error: null }
    );

    const overview = await getSpAnalyticsOverviewLive(period);

    expect(kpi(overview.kpis, "revenue")).toBe("₦0");
  });

  it("works the same on the earnings page, including the average per booking", async () => {
    backend({ earnings: 10000 });

    const earnings = await getSpAnalyticsEarningsLive(period);

    expect(JSON.stringify(earnings)).not.toContain("object Object");
    expect(kpi(earnings.kpis, "gross_revenue")).toBe("₦10,000");
    // 2 completed bookings in the overview fixture.
    expect(kpi(earnings.kpis, "avg_booking_value")).toBe("₦5,000");
  });

  it("shows the fee that was actually charged and what the provider keeps, not a flat 10%", async () => {
    backend({ earnings: 10000, platformFees: 800, netEarnings: 9200 });

    const earnings = await getSpAnalyticsEarningsLive(period);

    expect(kpi(earnings.kpis, "gross_revenue")).toBe("₦10,000");
    expect(kpi(earnings.kpis, "platform_fees")).toBe("₦800");
    expect(kpi(earnings.kpis, "net_earnings")).toBe("₦9,200");
    expect(JSON.stringify(earnings)).not.toContain("10%");
  });

  it("follows a different fee if the backend charged one", async () => {
    backend({ earnings: 20000, platformFees: 1000, netEarnings: 19000 });

    const earnings = await getSpAnalyticsEarningsLive(period);

    expect(kpi(earnings.kpis, "platform_fees")).toBe("₦1,000");
    expect(kpi(earnings.kpis, "net_earnings")).toBe("₦19,000");
  });

  it("works the same on the bookings page", async () => {
    backend({ earnings: 3000 });

    const page = await getSpAnalyticsBookingsLive(period);

    expect(JSON.stringify(page)).not.toContain("object Object");
    expect(JSON.stringify(page)).toContain("₦3,000");
  });
});
