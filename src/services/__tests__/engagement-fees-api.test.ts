import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiClient: mocks }));

import { fetchContractFeeReport, fetchFeeTerms } from "../engagement-fees-api";

beforeEach(() => mocks.get.mockReset());

describe("service fee API", () => {
  it("reads what a new contract would charge", async () => {
    const terms = { rate: 10, minimum: 100 };
    mocks.get.mockResolvedValue({ data: terms, error: null });

    await expect(fetchFeeTerms()).resolves.toBe(terms);
    expect(mocks.get).toHaveBeenCalledWith("/engagements/fee-terms");
  });

  it("reads the fees collected, for admins", async () => {
    const report = { current: { rate: 0, minimum: 0 }, totalCollected: 0, payments: 0, thisMonth: 0, recent: [] };
    mocks.get.mockResolvedValue({ data: report, error: null });

    await expect(fetchContractFeeReport()).resolves.toBe(report);
    expect(mocks.get).toHaveBeenCalledWith("/admin/engagements/fees");
  });

  it("throws the backend's error rather than inventing a fee", async () => {
    const refusal = Object.assign(new Error("Forbidden"), { status: 403 });
    mocks.get.mockResolvedValue({ data: null, error: refusal });
    await expect(fetchContractFeeReport()).rejects.toBe(refusal);
  });

  it("does not treat an empty response as success", async () => {
    mocks.get.mockResolvedValue({ data: null, error: null });
    await expect(fetchFeeTerms()).rejects.toThrow(/Empty response/);
  });
});
