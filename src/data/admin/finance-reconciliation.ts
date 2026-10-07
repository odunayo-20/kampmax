// ============================================================
// ADMIN FINANCE RECONCILIATION & REPORTS DATA (Module 46)
// ============================================================
//
// Read-only reconciliation + reporting layer. NOT a source of truth: it only
// READS the real stores that own money records and compares them:
//
//   - orders (src/data/orders.ts)              → order payments + stored fees
//   - wallet (src/data/wallet.ts)              → customer funding, purchases,
//                                                 refunds, withdrawals, balances
//   - vendor-financials (INITIAL_PAYOUTS)      → vendor bank payouts
//   - freelancer-financials (INITIAL_FL_PAYOUTS) → freelancer bank payouts
//   - service-provider-financials             → service-provider payouts
//   - payout-management (Module 45 ledger)     → normalized recipient rows
//
// There is NO seeded/PRNG generation. Every value below is computed at runtime
// from the record sets above. Payout account numbers are never touched here.
//
// DOMAIN SEPARATION:
//   - customer transactions/funding    > /admin/transactions  (Module 44)
//   - recipient payouts                > /admin/payouts       (Module 45)
//   - reconciliation + financial reports > /admin/finance     (THIS module)
//   - fabricated PRNG finance surfaces (commerce.ts / finance.ts / wallet /
//     withdrawals services) are NEVER consumed.
//
// KNOWN SEED-STATE FACTS surfaced honestly by the checks (not papered over):
//   - w1 ledger credits − debits (159,500) ≠ stored balance + pending (163,000)
//     → a −₦3,500 variance in the wallet store's own bookkeeping.
//   - the orders store marks refunded orders paymentStatus = "refunded"
//     (never "paid"), so "GMV (paid)" is 5 orders (176,776) and refunded
//     orders (200,813) are tracked separately — money collected then refunded.
//   - wallet purchase debits wt3/wt4/wt5 reference orders KMP-3847/KMP-4102
//     that were paid via Paystack in the orders store; wallet-paid order
//     KMP-4180 has no wallet refund leg; wt6 refund references KMP-3901 which
//     does not exist in the orders store.
//   - stored per-order platform fees are not a single rate (~2.3% on paid
//     orders) while the commission_rate setting advertises 8%.
// ============================================================

import type { ManagedFinanceReportId } from "@/types/admin";
import { MANAGED_FINANCE_REPORT_IDS } from "@/types/admin";

/** Local recipient taxonomy: Module 45 is vendor/freelancer; SP payouts add a third vertical. */
export type FinancePayoutKind = "vendor" | "freelancer" | "service_provider";

export interface FinancePayoutRow {
  id: string;
  reference: string | null;
  kind: FinancePayoutKind;
  recipientName: string;
  recipientHref: string | null;
  status: string;
  amount: number;
  fee: number;
  createdAt: string;
  source: string;
}

export const FINANCE_REPORT_OPTIONS: {
  id: ManagedFinanceReportId;
  label: string;
}[] = [...MANAGED_FINANCE_REPORT_IDS].map((id) => ({
  id,
  label:
    id === "revenue_fees"
      ? "Revenue & fees"
      : id === "refunds"
        ? "Refunds"
        : id === "payouts"
          ? "Payouts"
          : "Wallet movements",
}));

