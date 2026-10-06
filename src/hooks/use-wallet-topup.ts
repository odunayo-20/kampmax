"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { startWalletTopup, verifyWalletTopup } from "@/services/wallet";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { formatNaira } from "@/lib/utils";

export type WalletNotice = { tone: "ok" | "error"; text: string };

/**
 * Real wallet top-up through Paystack, shared by every page that funds the
 * wallet. `startTopup` sends the user to the payment page (rejecting with a
 * user-facing message if it cannot); on the way back, Paystack appends
 * ?reference=…, which this hook confirms with the server exactly once before
 * tidying the URL and refreshing every ["wallet"] query.
 */
export function useWalletTopup() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<WalletNotice | null>(null);
  const handledReturn = useRef(false);

  const startTopup = useCallback(async (amount: number) => {
    try {
      const result = await startWalletTopup(
        amount,
        `${window.location.origin}${window.location.pathname}`
      );
      if (!result.authorizationUrl) throw new Error("The payment page could not be opened.");
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      throw new Error(getFriendlyErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    if (handledReturn.current) return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") ?? params.get("trxref");
    if (!reference?.startsWith("KMPX-TOP-")) return;
    handledReturn.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    verifyWalletTopup(reference)
      .then((result) => {
        setNotice(
          result.status === "SUCCESS"
            ? { tone: "ok", text: `${formatNaira(result.amount)} added to your wallet.` }
            : { tone: "error", text: "That payment was not completed, so nothing was charged." }
        );
      })
      .catch((error) => setNotice({ tone: "error", text: getFriendlyErrorMessage(error) }))
      .finally(() => void queryClient.invalidateQueries({ queryKey: ["wallet"] }));
  }, [queryClient]);

  return { notice, startTopup };
}
