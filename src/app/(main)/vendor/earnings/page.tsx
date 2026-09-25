import { redirect } from "next/navigation";

// Earnings are reported in Financials → Statements.
export default function EarningsPage() {
  redirect("/vendor/financials/statements");
}
