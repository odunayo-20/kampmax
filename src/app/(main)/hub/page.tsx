import { redirect } from "next/navigation";

export default function HubPage() {
  redirect("/hub/verify-pin");
}
