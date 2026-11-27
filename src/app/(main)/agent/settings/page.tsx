import { redirect } from "next/navigation";

/** The agent's details live on one page now: Documents and details. Old links land there. */
export default function AgentSettingsPage() {
  redirect("/agent/profile");
}
