import Link from "next/link";
import { BadgeCheck, Building2, Clock, Globe, MapPin, Users } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { DURATION_LABEL } from "@/config/opportunity";
import { Badge } from "@/components/ui";
import { FactChips } from "@/components/ui/FactChips";
import { reputationChips } from "@/services/employer-insights";
import type { EmployerPublicProfile } from "@/types/employer";
import { EmployerProfileActions } from "@/components/employer/public/EmployerProfileActions";

function jobLocation(
  location: { city?: string; state?: string; campusId?: string }
): string {
  return [location.city, location.state].filter(Boolean).join(", ");
}

function budgetLabel(budget: EmployerPublicProfile["openJobs"][number]["budget"]): string {
  if (typeof budget.min === "number" && typeof budget.max === "number") {
    return `${formatNaira(budget.min)} – ${formatNaira(budget.max)}`;
  }
  if (typeof budget.min === "number") {
    return `${formatNaira(budget.min)}+`;
  }
  if (typeof budget.max === "number") {
    return `Up to ${formatNaira(budget.max)}`;
  }
  return "Budget TBD";
}

/** Only http(s) websites are ever rendered as links (defense in depth). */
function safeExternalUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? value : null;
  } catch {
    return null;
  }
}

function hostname(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

/**
 * Public employer profile — rendered from the store-lookup preview only.
 * Any field that is not explicitly public (email, phone, notes, docs) is
 * intentionally absent from this component.
 */
export function EmployerPublicProfileContent({
  profile,
}: {
  profile: EmployerPublicProfile;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded"
      >
        <Building2 className="h-3.5 w-3.5" aria-hidden />
        Back to jobs
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {profile.logoUrl && (
          <img
            src={profile.logoUrl}
            alt={`${profile.name} logo`}
            className="h-12 w-12 rounded-lg border border-kampmax-border bg-white object-contain p-1"
          />
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-kampmax-text">{profile.name}</h1>
            {profile.verified && (
              <Badge variant="success">
                <BadgeCheck className="mr-1 h-3.5 w-3.5" aria-hidden />
                Verified
              </Badge>
            )}
          </div>

          {profile.descriptor && (
            <p className="mt-1 text-sm text-kampmax-text-secondary">{profile.descriptor}</p>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-kampmax-text-secondary">
            {profile.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {profile.location}
              </span>
            )}
            {profile.organizationSize && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {profile.organizationSize}
              </span>
            )}
            {safeExternalUrl(profile.website) && (
              <Link
                href={profile.website!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded"
              >
                <Globe className="h-3.5 w-3.5" aria-hidden />
                {hostname(profile.website!)}
              </Link>
            )}
          </div>
        </div>
      </div>

      <FactChips facts={reputationChips(profile.reputation)} className="mt-4" />

      <div className="mt-4 flex justify-end">
        <EmployerProfileActions employerUserId={profile.userId} />
      </div>

      {profile.about && (
        <section className="mt-6 rounded-xl border border-kampmax-border bg-white p-5">
          <h2 className="text-sm font-bold text-kampmax-text">About</h2>
          <p className="mt-3 whitespace-pre-line text-sm text-kampmax-text">{profile.about}</p>
        </section>
      )}

      <section className="mt-6" aria-labelledby="open-jobs">
        <h2 id="open-jobs" className="text-sm font-bold text-kampmax-text">
          Open jobs ({profile.openJobs.length})
        </h2>

        {profile.openJobs.length === 0 ? (
          <p className="mt-3 rounded-xl border border-kampmax-border bg-white p-5 text-sm text-kampmax-text-secondary">
            No open jobs right now. Check back soon.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {profile.openJobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="block rounded-xl border border-kampmax-border bg-white p-4 transition-colors hover:border-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-kampmax-text">{job.title}</h3>
                    <span className="text-sm font-semibold text-primary-700">
                      {budgetLabel(job.budget)}
                    </span>
                  </div>
                  {job.summary && (
                    <p className="mt-1 line-clamp-2 text-sm text-kampmax-text-secondary">{job.summary}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-kampmax-text-secondary">
                    {job.duration && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        {DURATION_LABEL[job.duration] ?? job.duration}
                      </span>
                    )}
                    {job.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                        {jobLocation(job.location)}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}