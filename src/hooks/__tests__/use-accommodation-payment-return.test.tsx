// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const verifyPayment = vi.hoisted(() => vi.fn());
vi.mock("@/services/accommodation", () => ({ accommodationApi: { verifyPayment } }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ status: "authenticated", user: { id: "u1" } }) }));

import { paymentReturnNotice, useAccommodationPaymentReturn } from "../use-accommodation";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

beforeEach(() => {
  verifyPayment.mockReset();
});

function setup(search: string) {
  window.history.replaceState(null, "", `/agent/billing${search}`);
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useAccommodationPaymentReturn(), { wrapper }), invalidate };
}

describe("paymentReturnNotice", () => {
  it("tells the agent a first payment now waits for approval", () => {
    const n = paymentReturnNotice({ status: "SUCCESS", paymentType: "INITIAL" });
    expect(n.tone).toBe("ok");
    expect(n.text).toContain("waiting for our team to approve");
  });

  it("tells the agent a renewal went through", () => {
    for (const paymentType of ["RENEWAL", "RECOVERY"]) {
      const n = paymentReturnNotice({ status: "SUCCESS", paymentType });
      expect(n.tone).toBe("ok");
      expect(n.text).toContain("renewed");
    }
  });

  it("asks the agent to wait when the bank has not answered", () => {
    expect(paymentReturnNotice({ status: "PENDING", paymentType: "INITIAL" }).tone).toBe("wait");
  });

  it("says nothing was charged when it failed", () => {
    const n = paymentReturnNotice({ status: "FAILED", paymentType: "INITIAL" });
    expect(n.tone).toBe("error");
    expect(n.text).toContain("nothing was charged");
  });
});

describe("coming back from the payment page", () => {
  it("confirms the payment with the server, tidies the address, and refreshes the data", async () => {
    verifyPayment.mockResolvedValue({ status: "SUCCESS", paymentType: "INITIAL" });
    const { result, invalidate } = setup("?reference=ACC-ABC123&trxref=ACC-ABC123");
    await waitFor(() => expect(result.current.notice?.tone).toBe("ok"));
    expect(verifyPayment).toHaveBeenCalledTimes(1);
    expect(verifyPayment).toHaveBeenCalledWith("ACC-ABC123");
    expect(window.location.search).toBe("");
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
  });

  it("uses trxref when there is no reference", async () => {
    verifyPayment.mockResolvedValue({ status: "SUCCESS", paymentType: "RENEWAL" });
    setup("?trxref=ACC-ONLY");
    await waitFor(() => expect(verifyPayment).toHaveBeenCalledWith("ACC-ONLY"));
  });

  it("does nothing on an ordinary visit", () => {
    const { result } = setup("");
    expect(verifyPayment).not.toHaveBeenCalled();
    expect(result.current.notice).toBeNull();
  });

  it("leaves another feature's payment alone", () => {
    setup("?reference=KMPX-TOP-1");
    expect(verifyPayment).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?reference=KMPX-TOP-1");
  });

  it("asks only once, even when the page renders again", async () => {
    verifyPayment.mockResolvedValue({ status: "PENDING", paymentType: "INITIAL" });
    const { result, rerender } = setup("?reference=ACC-1");
    await waitFor(() => expect(result.current.notice?.tone).toBe("wait"));
    rerender();
    rerender();
    expect(verifyPayment).toHaveBeenCalledTimes(1);
  });

  it("shows a plain message when the server cannot be reached, and still refreshes", async () => {
    verifyPayment.mockRejectedValue(new Error("network down"));
    const { result, invalidate } = setup("?reference=ACC-1");
    await waitFor(() => expect(result.current.notice?.tone).toBe("error"));
    expect(result.current.notice?.text.length).toBeGreaterThan(0);
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
  });
});
