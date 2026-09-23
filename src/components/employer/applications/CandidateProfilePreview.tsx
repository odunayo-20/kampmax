"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Briefcase,
  ExternalLink,
  GraduationCap,
  MapPin,
  Wallet,
} from "lucide-react";
import {
  getPublicFreelancerFromBackend,
  getPublicFreelancerProfile,
  type PublicFreelancerProfile,
} from "@/services/freelancer-dashboard";
import { isBackendId } from "@/lib/job-api-mapping";
import { formatNaira } from "@/lib/utils";
import { isSafeExternalUrl, sanitizeExternalUrl } from "@/lib/contract-utils";
import { Avatar } from "@/components/ui";

/**
 * Read-only public candidate profile shown to an employer reviewing an
 * application. Surfaces ONLY what getPublicFreelancerProfile exposes — the
 * public slice the backend publishes for approved freelancers. Contact
 * details, internal notes and documents are never rendered.
 */
export function CandidateProfilePreview({ candidateId }: { candidateId: string }) {
  // Real candidates are addressed by freelancer profile id and loaded from the
  // backend; legacy demo candidates (short ids) come from the local store.
  const backend = isBackendId(candidateId);
  const local = useMemo(
    () => (backend ? null : getPublicFreelancerProfile(candidateId)),
    [backend, candidateId]
  );
  const [remote, setRemote] = useState<PublicFreelancerProfile | null>(null);
  const [loading, setLoading] = useState(backend);

  useEffect(() => {
    if (!backend) return;
    let cancelled = false;
    setLoading(true);
    void getPublicFreelancerFromBackend(candidateId).then((p) => {
      if (cancelled) return;
      setRemote(p);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [backend, candidateId]);

  const profile = backend ? remote : local;

  if (loading) {
    return <div className="p-5 text-sm text-neutral-500">Loading candidate…</div>;
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <p className="text-sm text-neutral-500">
          This candidate&apos;s public profile isn&apos;t available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar name={profile.name} src={profile.avatar} size="lg" />
        <div className="min-w-0">
          <h3 className="text-base font-bold text-neutral-900">{profile.name}</h3>
          {profile.headline && (
            <p className="text-sm text-neutral-500">{profile.headline}</p>
          )}
          <p className="mt-0.5 text-xs font-medium text-primary-700">
            {profile.availability.label}
          </p>
        </div>
      </div>

      {profile.bio && (
        <p className="text-sm leading-relaxed text-neutral-600">{profile.bio}</p>
      )}

      {(profile.city || profile.remoteAvailable) && (
        <p className="flex items-center gap-1.5 text-xs text-neutral-500">
          <MapPin className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          {[profile.city, profile.remoteAvailable && "Remote-friendly"]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      {profile.categories.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Categories
          </h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.categories.map((c) => (
              <span
                key={c.id}
                className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700"
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.skills.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Skills
          </h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Rates
        </p>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-1.5 text-neutral-500">
              <Wallet className="h-3.5 w-3.5 text-neutral-400" aria-hidden /> Hourly
            </dt>
            <dd className="font-medium text-neutral-800">
              {profile.rates.hourlyRate !== undefined
                ? formatNaira(profile.rates.hourlyRate) + "/hr"
                : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-1.5 text-neutral-500">
              <Briefcase className="h-3.5 w-3.5 text-neutral-400" aria-hidden /> Project
            </dt>
            <dd className="font-medium text-neutral-800">
              {profile.rates.projectRate !== undefined
                ? formatNaira(profile.rates.projectRate)
                : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-neutral-500">Negotiable</dt>
            <dd className="font-medium text-neutral-800">
              {profile.rates.negotiable ? "Yes" : "No"}
            </dd>
          </div>
        </dl>
      </div>

      {profile.experience.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Experience
          </h4>
          <ul className="mt-2 space-y-3">
            {profile.experience.map((exp) => (
              <li key={exp.id} className="text-sm">
                <p className="font-medium text-neutral-800">{exp.jobTitle}</p>
                <p className="text-xs text-neutral-500">
                  {exp.company}
                  {exp.location ? ` · ${exp.location}` : ""}
                </p>
                <p className="text-xs text-neutral-400">
                  {exp.startDate}
                  {exp.currentlyWorking ? " — Present" : exp.endDate ? ` — ${exp.endDate}` : ""}
                </p>
                {exp.description && (
                  <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                    {exp.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {profile.education.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden /> Education
          </h4>
          <ul className="mt-2 space-y-2 text-sm">
            {profile.education.map((edu) => (
              <li key={edu.id}>
                <p className="font-medium text-neutral-800">
                  {edu.qualification} — {edu.fieldOfStudy}
                </p>
                <p className="text-xs text-neutral-500">
                  {edu.institution}
                  {edu.startYear ? ` · ${edu.startYear}${edu.endYear ? `–${edu.endYear}` : ""}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {profile.certifications.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            <Award className="h-3.5 w-3.5" aria-hidden /> Certifications
          </h4>
          <ul className="mt-2 space-y-2 text-sm">
            {profile.certifications.map((cert) => (
              <li key={cert.id}>
                <p className="font-medium text-neutral-800">{cert.name}</p>
                <p className="text-xs text-neutral-500">
                  {cert.issuingOrganization}
                  {cert.issueDate ? ` · ${cert.issueDate}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {profile.portfolio.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Portfolio
          </h4>
          <ul className="mt-2 space-y-3">
            {profile.portfolio.map((item) => {
              const safeUrl = item.externalUrl && isSafeExternalUrl(item.externalUrl)
                ? sanitizeExternalUrl(item.externalUrl)
                : undefined;
              return (
                <li key={item.id} className="rounded-lg border border-neutral-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-neutral-800">{item.title}</p>
                    {safeUrl && (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
                      >
                        View <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                      {item.description}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}