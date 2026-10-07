"use client";

import Link from "next/link";
import {
  Award,
  Briefcase,
  Clock,
  FolderOpen,
  Globe,
  GraduationCap,
  MapPin,
  Wrench,
  type LucideIcon,
  User,
} from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { formatNaira, pluralize } from "@/lib/utils";
import {
  FREELANCER_CATEGORIES,
  FREELANCER_EMPLOYMENT_TYPES,
  FREELANCER_QUALIFICATIONS,
} from "@/config/freelancer";
import { FREELANCER_SERVICE_PRICING_LABEL } from "@/config/freelancer-services";
import { cachedTaxonomyName } from "@/services/taxonomy";
import { useCategories } from "@/hooks/use-taxonomy";
import type { PublicFreelancerProfile } from "@/services/freelancer-dashboard";
import type { FreelancerService } from "@/types/freelancer-services";
import { FreelancerProfileActions } from "@/components/freelancer/public/FreelancerProfileActions";

// ── Display helpers (presentation only, no business logic) ──

function formatMonthYear(value?: string): string {
  if (!value) return "";
  if (value === "current") return "Present";
  const [year, month] = value.split("-");
  if (!month) return year;
  const date = new Date(`${year}-${month}-01T00:00:00Z`);
  return date.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function periodLabel(
  start?: string,
  end?: string,
  currentlyWorking?: boolean
): string {
  if (!start && !end) return "";
  const startLabel = formatMonthYear(start);
  const endLabel = currentlyWorking ? "Present" : formatMonthYear(end);
  return endLabel ? `${startLabel} – ${endLabel}` : startLabel;
}

function employmentLabel(value: string): string {
  return (
    FREELANCER_EMPLOYMENT_TYPES.find((e) => e.value === value)?.label ?? value
  );
}

function qualificationLabel(value: string): string {
  return (
    FREELANCER_QUALIFICATIONS.find((q) => q.value === value)?.label ?? value
  );
}

function serviceCategoryName(categoryId: string): string {
  return (
    cachedTaxonomyName(categoryId) ??
    FREELANCER_CATEGORIES.find((c) => c.id === categoryId)?.name ??
    categoryId
  );
}

function servicePriceLabel(service: FreelancerService): string {
  const { pricing, price, priceMax } = service;
  if (pricing === "hourly" && typeof price === "number") {
    return `${formatNaira(price)}/hr`;
  }
  if (pricing === "fixed" && typeof price === "number") {
    return formatNaira(price);
  }
  if (pricing === "project" && typeof price === "number") {
    return `${formatNaira(price)}/project`;
  }
  if (pricing === "starting_at" && typeof price === "number") {
    return typeof priceMax === "number"
      ? `From ${formatNaira(price)} – ${formatNaira(priceMax)}`
      : `From ${formatNaira(price)}`;
  }
  return "Price on request";
}

function serviceDeliveryLabel(service: FreelancerService): string {
  if (!service.deliveryValue) return "";
  const unit =
    service.deliveryUnit === "hours"
      ? "hour"
      : service.deliveryUnit === "days"
      ? "day"
      : "week";
  return `${service.deliveryValue} ${pluralize(service.deliveryValue, unit)}`;
}

const availabilityTone: Record<string, "default" | "success" | "warning" | "info"> = {
  available: "success",
  available_later: "warning",
  unavailable: "default",
};

// ── Section wrapper ─────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  right,
  children,
}: {
  icon: LucideIcon;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-xl border border-kampmax-border bg-white p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-kampmax-text">
          <Icon className="h-4 w-4 text-primary-600" aria-hidden />
          {title}
        </h2>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// ── Public profile content ──────────────────────────────────
// Renders ONLY fields the store-declared public projection exposes. Contact
// details, email, phone, internal notes and hidden portfolio items are never
// part of this component.

export function PublicFreelancerProfileContent({
  profile,
  services,
}: {
  profile: PublicFreelancerProfile;
  services: FreelancerService[];
}) {
  useCategories("SERVICE"); // warms id -> name for serviceCategoryName()
  const tone =
    profile.availability.status != null
      ? availabilityTone[profile.availability.status]
      : "default";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded"
        >
          <Briefcase className="h-3.5 w-3.5" aria-hidden />
          Back to jobs
        </Link>
        <Link
          href="/freelancers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded"
        >
          Browse freelancers
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-4 rounded-xl border border-kampmax-border bg-white p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar name={profile.name} src={profile.avatar} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-kampmax-text">
                {profile.name}
              </h1>
              {profile.availability.status != null && (
                <Badge variant={tone}>{profile.availability.label}</Badge>
              )}
            </div>
            {profile.headline && (
              <p className="mt-1 text-sm text-kampmax-text-secondary">
                {profile.headline}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-kampmax-text-secondary">
              {profile.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {profile.city}
                </span>
              )}
              {profile.remoteAvailable && (
                <span className="inline-flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" aria-hidden />
                  Open to remote work
                </span>
              )}
            </div>
          </div>
        </div>
        <FreelancerProfileActions profileId={profile.id} />
      </div>

      <div className="mt-6 space-y-4">
        {profile.bio && (
          <Section icon={User} title="About">
            <p className="whitespace-pre-line text-sm text-kampmax-text">
              {profile.bio}
            </p>
          </Section>
        )}

        {profile.skills.length > 0 && (
          <Section icon={Wrench} title="Skills">
            <ul className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <li
                  key={skill}
                  className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-kampmax-text"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {(profile.rates.hourlyRate != null ||
          profile.rates.projectRate != null ||
          profile.rates.negotiable) && (
          <Section icon={Briefcase} title="Rates">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {typeof profile.rates.hourlyRate === "number" && (
                <div className="rounded-lg bg-neutral-50 px-3 py-2.5">
                  <dt className="text-xs text-kampmax-text-secondary">
                    Hourly rate
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold text-kampmax-text">
                    {formatNaira(profile.rates.hourlyRate)}
                  </dd>
                </div>
              )}
              {typeof profile.rates.projectRate === "number" && (
                <div className="rounded-lg bg-neutral-50 px-3 py-2.5">
                  <dt className="text-xs text-kampmax-text-secondary">
                    Project rate
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold text-kampmax-text">
                    {formatNaira(profile.rates.projectRate)}
                  </dd>
                </div>
              )}
              {profile.rates.negotiable && (
                <div className="rounded-lg bg-neutral-50 px-3 py-2.5">
                  <dt className="text-xs text-kampmax-text-secondary">
                    Pricing
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold text-kampmax-text">
                    Negotiable
                  </dd>
                </div>
              )}
            </dl>
          </Section>
        )}

        {profile.experience.length > 0 && (
          <Section icon={Briefcase} title="Experience">
            <ol className="space-y-4">
              {profile.experience.map((exp) => (
                <li key={exp.id} className="border-l-2 border-neutral-200 pl-4">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-kampmax-text">
                      {exp.jobTitle}
                    </h3>
                    <span className="text-xs text-kampmax-text-secondary">
                      {periodLabel(exp.startDate, exp.endDate, exp.currentlyWorking)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-primary-700">
                    {[exp.company, employmentLabel(exp.employmentType)]
                      .filter(Boolean)
                      .join(" · ")}
                    {exp.location ? ` · ${exp.location}` : ""}
                  </p>
                  {exp.description && (
                    <p className="mt-1 text-sm text-kampmax-text-secondary">
                      {exp.description}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {profile.education.length > 0 && (
          <Section icon={GraduationCap} title="Education">
            <ol className="space-y-4">
              {profile.education.map((edu) => (
                <li key={edu.id} className="border-l-2 border-neutral-200 pl-4">
                  <h3 className="text-sm font-bold text-kampmax-text">
                    {edu.institution}
                  </h3>
                  <p className="mt-0.5 text-xs text-kampmax-text-secondary">
                    {qualificationLabel(edu.qualification)}
                    {edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-kampmax-text-secondary">
                    {periodLabel(edu.startYear, edu.endYear)}
                  </p>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {profile.certifications.length > 0 && (
          <Section icon={Award} title="Certifications">
            <ul className="space-y-3">
              {profile.certifications.map((cert) => (
                <li key={cert.id} className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-kampmax-text">
                      {cert.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-kampmax-text-secondary">
                      {cert.issuingOrganization}
                    </p>
                  </div>
                  <span className="text-xs text-kampmax-text-secondary">
                    {formatMonthYear(cert.issueDate)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {profile.portfolio.length > 0 && (
          <Section
            icon={FolderOpen}
            title={`Portfolio (${profile.portfolio.length})`}
          >
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {profile.portfolio.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-kampmax-border p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-50">
                    <FolderOpen
                      className="h-5 w-5 text-primary-600"
                      aria-hidden
                    />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-kampmax-text">
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-3 text-xs text-kampmax-text-secondary">
                    {item.description}
                  </p>
                  {item.skills.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {item.skills.map((skill) => (
                        <li
                          key={skill}
                          className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-kampmax-text-secondary"
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  )}
                  {item.completionDate && (
                    <p className="mt-2 text-[11px] text-kampmax-text-secondary">
                      Completed {formatMonthYear(item.completionDate)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {services.length > 0 && (
          <Section icon={Wrench} title={`Services (${services.length})`}>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <li
                  key={service.id}
                  className="flex flex-col rounded-lg border border-kampmax-border p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-kampmax-text">
                      {service.title}
                    </h3>
                    <span className="text-xs font-semibold text-primary-700">
                      {servicePriceLabel(service)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-kampmax-text-secondary">
                    {serviceCategoryName(service.categoryId)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs text-kampmax-text-secondary">
                    {service.shortDescription}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-kampmax-text-secondary">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden />
                      {serviceDeliveryLabel(service)}
                    </span>
                    <span>
                      {FREELANCER_SERVICE_PRICING_LABEL[service.pricing]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}