import { redirect } from "next/navigation";

// Individual withdrawals open from the list; there is no separate detail record.
export default function Page() {
  redirect("/service-provider/financials/payouts");
}
