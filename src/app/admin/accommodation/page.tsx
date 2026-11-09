import { redirect } from "next/navigation";

/** The accommodation area opens on the agent applications, which gate everything else. */
export default function AdminAccommodationIndexPage() {
  redirect("/admin/accommodation/agents");
}
