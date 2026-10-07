import { redirect } from "next/navigation";

// Individual transactions open from the list; there is no separate detail record.
export default function Page() {
  redirect("/service-provider/financials/transactions");
}
