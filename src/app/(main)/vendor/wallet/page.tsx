import { redirect } from "next/navigation";

// The vendor wallet lives in Financials (balance, escrow, payouts, ledger).
export default function WalletPage() {
  redirect("/vendor/financials");
}
