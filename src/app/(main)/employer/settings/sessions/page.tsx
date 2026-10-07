import { redirect } from "next/navigation";

// There is nothing to configure here yet; the real settings live on the other tabs.
export default function Page() {
  redirect("/employer/settings");
}
