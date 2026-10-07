import { redirect } from "next/navigation";

// A contract is an engagement, and its actions live on the contracts list.
export default function ContractDetailPage() {
  redirect("/freelancer/contracts");
}
