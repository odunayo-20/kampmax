import { redirect } from "next/navigation";

// The pickup hub is the scanner.
export default function HubPage() {
  redirect("/scan");
}
