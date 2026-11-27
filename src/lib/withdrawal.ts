/**
 * Taking money out of the wallet to a bank account. The mobile app's lib/withdrawal.ts and lib/payouts.ts say the
 * same things.
 *
 * HOW IT WORKS ON THE SERVER
 *  - A withdrawal needs a one-time identity check (BVN + a bank account in the person's own name).
 *  - Asking for one takes the money out of the wallet straight away and records it as pending. The Kampmax team
 *    reviews each one and pays it by hand, so nothing here promises a time.
 *  - A repeated idempotency key is answered with 409, so a retry after a bad connection can never take the money twice.
 *
 * Pure functions: no screens, no network.
 */

/** The server's smallest withdrawal (MIN_WITHDRAWAL_AMOUNT). */
export const MIN_WITHDRAWAL = 100;
export const MAX_WITHDRAWAL = 5_000_000;

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

export type AmountCheck = { ok: true; amount: number } | { ok: false; error: string };

/** Naira with at most two decimals, within the limits and the balance. */
export function checkWithdrawal(input: string, available: number): AmountCheck {
  const cleaned = input.trim().replace(/[₦,\s]/g, "");
  if (cleaned === "") return { ok: false, error: "Enter how much you want to withdraw." };
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return { ok: false, error: "Enter a valid amount, like 15000." };
  const amount = Math.round(Number(cleaned) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter an amount above zero." };
  if (amount < MIN_WITHDRAWAL) return { ok: false, error: `The minimum payout is ${naira(MIN_WITHDRAWAL)}.` };
  if (amount > MAX_WITHDRAWAL) return { ok: false, error: `The most you can withdraw at once is ${naira(MAX_WITHDRAWAL)}.` };
  if (amount > available) return { ok: false, error: `You only have ${naira(available)} available.` };
  return { ok: true, amount };
}

/** A key the server accepts (8 to 64 of A-Z a-z 0-9 _ -). Not a secret, only a duplicate guard. */
export function newIdempotencyKey(random: () => number = Math.random, now: () => number = Date.now): string {
  const part = () => Math.floor(random() * 36 ** 6).toString(36).padStart(6, "0");
  return `w-${now().toString(36)}-${part()}${part()}`;
}

/** What to show for the identity check. */
export type IdentityPhase = "start" | "checking" | "failed" | "verified";

export function identityPhase(kyc: string | undefined): IdentityPhase {
  switch (kyc) {
    case "KYC_VERIFIED":
      return "verified";
    case "KYC_PENDING":
      return "checking";
    case "KYC_FAILED":
      return "failed";
    default:
      return "start";
  }
}

/** Why the first step cannot start yet, or null when it can. */
export function identityBlock(phase: IdentityPhase, failureReason?: string | null): string | null {
  switch (phase) {
    case "verified":
      return null;
    case "checking":
      return "We are checking your identity. This page updates by itself.";
    case "failed":
      return failureReason || "Your identity check did not pass. Check your details and try again.";
    default:
      return "Verify your identity once, then you can withdraw.";
  }
}

/** Why the Withdraw button is off, or null when it is on. */
export function withdrawDisabledReason(available: number | undefined): string | null {
  if (available === undefined) return null;
  return available < MIN_WITHDRAWAL ? `You need at least ${naira(MIN_WITHDRAWAL)} available to withdraw.` : null;
}

/** "••••6789": enough to recognise the account, never the whole number. */
export const maskAccount = (accountNumber: string): string => `••••${accountNumber.slice(-4)}`;

export type WithdrawFailureKind = "duplicate" | "unclear" | "needs-identity" | "rate" | "signed-out" | "refused";

interface WriteError {
  status?: number;
  code?: string | number;
  message?: string;
}

/** What went wrong with a withdrawal, in words a person can act on. A duplicate means the first request got through. */
export function describeWithdrawError(error: WriteError | null | undefined): { kind: WithdrawFailureKind; message: string } {
  const status = error?.status;
  const text = error?.message?.trim();
  const short = text && text.length <= 160 ? text : undefined;
  if (status === 409) return { kind: "duplicate", message: "This withdrawal was already received." };
  // The server could not reach the bank to check the account: nothing was taken, so this is not an unclear result.
  if (status === 503 && /check this account/i.test(text ?? "")) {
    return { kind: "refused", message: short ?? "We could not check this account right now. Try again shortly." };
  }
  if (status === undefined || error?.code === "NETWORK_ERROR" || status >= 500) {
    return {
      kind: "unclear",
      message:
        "We couldn't confirm whether your withdrawal went through. Check your wallet before trying again; trying again with the same amount is safe.",
    };
  }
  if (status === 401) return { kind: "signed-out", message: "Your session has ended. Sign in again." };
  if (status === 429) return { kind: "rate", message: "Too many requests. Wait a minute and try again." };
  if (status === 403 && /verif/i.test(text ?? "")) return { kind: "needs-identity", message: "Verify your identity before you withdraw." };
  return { kind: "refused", message: short ?? "The withdrawal wasn't accepted. Check the amount and the account, then try again." };
}

/** Why the account lookup failed. */
export function describeLookupError(error: WriteError | null | undefined): string {
  const status = error?.status;
  if (status === 429) return "Too many tries. Wait a while and try again.";
  if (status === 404) return "We couldn't find that bank account. Check the number and the bank.";
  if (status === undefined || error?.code === "NETWORK_ERROR" || status >= 500) {
    return "We couldn't reach the bank just now. Check your connection and try again.";
  }
  return "We couldn't check that account. Look over the bank and number and try again.";
}
