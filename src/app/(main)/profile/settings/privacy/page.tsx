import { redirect } from "next/navigation";

// There are no privacy controls to configure yet.
export default function Page() {
  redirect("/profile");
}
