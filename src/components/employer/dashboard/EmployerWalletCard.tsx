"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import {
  devCreditWallet,
  fetchMyWalletBalance,
  startWalletTopup,
  verifyWalletTopup,
} from "@/services/wallet";
import { formatNaira } from "@/lib/utils";
import { getFriendlyErrorMessage } from "@/lib/error-messages";

const MIN_TOPUP = 100;
const QUICK_AMOUNTS = [5000, 10000, 50000];
const SHOW_DEV_CREDIT = process.env.NODE_ENV !== "production";

/**
 * The employer's real wallet. Funding a contract debits this balance, so it
 * needs a way to be topped up: a Paystack charge (verified server-side) and,
 * in development only, an instant test credit.
 */
export function EmployerWalletCard() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const handledReturn = useRef(false);

  const balance = useQuery({ queryKey: ["wallet", "balance"], queryFn: fetchMyWalletBalance });
  const refreshBalance = () => queryClient.invalidateQueries({ queryKey: ["wallet"] });

  const topup = useMutation({
    mutationFn: (value: number) =>
      startWalletTopup(value, `${window.location.origin}${window.location.pathname}`),
    onSuccess: (result) => {
      if (result.authorizationUrl) window.location.assign(result.authorizationUrl);
      else setNotice({ tone: "error", text: "The payment page could not be opened." });
    },
    onError: (error) => setNotice({ tone: "error", text: getFriendlyErrorMessage(error) }),
  });

  const devCredit = useMutation({
    mutationFn: (value: number) => devCreditWallet(value),
    onSuccess: () => {
      setNotice({ tone: "ok", text: "Test funds added." });
      void refreshBalance();
    },
    onError: () =>
      setNotice({ tone: "error", text: "Test credit is turned off on this server." }),
  });

  // Paystack sends the user back with ?reference=…; confirm it once, then tidy the URL.
  useEffect(() => {
    if (handledReturn.current) return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") ?? params.get("trxref");
    if (!reference?.startsWith("KMPX-TOP-")) return;
    handledReturn.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    verifyWalletTopup(reference)
      .then((result) => {
        if (result.status === "SUCCESS") {
          setNotice({ tone: "ok", text: `${formatNaira(result.amount)} added to your wallet.` });
        } else {
          setNotice({ tone: "error", text: "That payment was not completed, so nothing was charged." });
        }
        void refreshBalance();
      })
      .catch((error) => setNotice({ tone: "error", text: getFriendlyErrorMessage(error) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = Number(amount);
  const valid = Number.isFinite(value) && value >= MIN_TOPUP;
  const busy = topup.isPending || devCredit.isPending;

  return (
    <section
      aria-label="Wallet"
      className="rounded-xl border border-kampmax-border bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-kampmax-bg text-kampmax-text-secondary">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-medium text-kampmax-text-secondary">Wallet balance</p>
            <p className="text-lg font-bold text-kampmax-text">
              {balance.isPending ? "…" : balance.isError ? "Unavailable" : formatNaira(balance.data.balance)}
            </p>
          </div>
        </div>
        {balance.isError && (
          <button
            type="button"
            onClick={() => void balance.refetch()}
            className="text-xs font-semibold text-kampmax-primary hover:underline"
          >
            Retry
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-kampmax-text-secondary">
        Contracts are funded from this balance and held safely until you approve the work.
      </p>

      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setNotice(null);
          if (valid) topup.mutate(value);
        }}
      >
        <label className="min-w-[10rem] flex-1 text-xs font-medium text-kampmax-text-secondary">
          Amount to add (₦)
          <input
            type="number"
            inputMode="decimal"
            min={MIN_TOPUP}
            step="any"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={`At least ${MIN_TOPUP}`}
            className="mt-1 w-full rounded-lg border border-kampmax-border px-3 py-2 text-sm text-kampmax-text"
          />
        </label>
        <button
          type="submit"
          disabled={!valid || busy}
          className="rounded-lg bg-kampmax-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {topup.isPending ? "Opening payment…" : "Add funds"}
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount(String(preset))}
            className="rounded-full border border-kampmax-border px-3 py-1 text-xs text-kampmax-text-secondary hover:bg-kampmax-bg"
          >
            {formatNaira(preset)}
          </button>
        ))}
        {SHOW_DEV_CREDIT && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setNotice(null);
              devCredit.mutate(20000);
            }}
            className="rounded-full border border-dashed border-kampmax-border px-3 py-1 text-xs text-kampmax-text-secondary hover:bg-kampmax-bg disabled:opacity-50"
          >
            Dev: add ₦20,000 test funds
          </button>
        )}
      </div>

      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-3 text-xs font-medium ${notice.tone === "error" ? "text-error-700" : "text-success-700"}`}
        >
          {notice.text}
        </p>
      )}
    </section>
  );
}
