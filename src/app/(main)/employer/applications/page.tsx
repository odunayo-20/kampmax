import { redirect } from "next/navigation";
import { peopleHref, stageForOldStatus } from "@/services/employer-people";

/**
 * The all-jobs applications list moved to People, which shows vacancy and internship applicants and gig proposals
 * together. Old links and bookmarks land on the matching stage. One posting's own list is still at
 * /employer/jobs/[id]/applications, and a single proposal at /employer/applications/[id].
 */
export default async function EmployerApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { status } = await searchParams;
  redirect(peopleHref(stageForOldStatus(Array.isArray(status) ? status[0] : status)));
}
