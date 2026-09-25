"use client";

import Link from "next/link";
import { Globe, Mail, MapPin, Pencil, Phone } from "lucide-react";
import { cn, isValidEmail } from "@/lib/utils";
import type { EmployerOnboardingDraft } from "@/types/employer";
import { EMPLOYER_CONTACT_METHODS } from "@/config/employer";
import { LEGACY_HIRING_CATEGORY_NAMES } from "@/config/employer";
import { useCategories } from "@/hooks/use-taxonomy";

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-2 first:pt-0 last:pb-0">
      {icon && <span className="mt-0.5 shrink-0 text-kampmax-text-secondary">{icon}</span>}
      <div className="min-w-0">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-kampmax-text-secondary">
          {label}
        </span>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block break-words text-sm text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded"
          >
            {value}
          </a>
        ) : (
          <span className="mt-0.5 block break-words text-sm text-kampmax-text">{value}</span>
        )}
      </div>
    </div>
  );
}

const contactLabel = (value?: string) =>
  EMPLOYER_CONTACT_METHODS.find((c) => c.value === value)?.label ?? value;

/**
 * Read-only employer profile view. Editable fields are empty-stated; private
 * contact info is only shown to the owner (this page is owner-gated). All
 * text is rendered as plain React text — never HTML.
 */
export function EmployerProfileView({
  draft,
  editHref,
  editLabel,
}: {
  draft: EmployerOnboardingDraft;
  editHref: string;
  editLabel: string;
}) {
  const { nameById } = useCategories("JOB");
  const categoryName = (id: string) => nameById.get(id) ?? LEGACY_HIRING_CATEGORY_NAMES[id] ?? id;

  const isOrgLike =
    draft.clientType === "business" ||
    draft.clientType === "organization" ||
    draft.clientType === "campus_group";

  const displayName =
    (isOrgLike && draft.organization.name?.trim()) || draft.profile.displayName?.trim() || "";
  const headline = isOrgLike
    ? draft.profile.headline?.trim()
    : draft.profile.headline?.trim();

  const about = draft.organization.description?.trim() || draft.profile.about?.trim() || "";
  const aboutLabel = isOrgLike ? "Organization description" : "About";

  const contactEmail = draft.contact.email?.trim();
  const contactPhone = draft.contact.phone?.trim();

  const locationParts = [draft.location.city?.trim(), draft.location.state?.trim()].filter(Boolean);
  const location = locationParts.length ? locationParts.join(", ") : undefined;

  const categories = draft.preferences.categories ?? [];
  const hasPrefs =
    categories.length > 0 ||
    draft.preferences.experience ||
    draft.preferences.workType ||
    draft.preferences.projectDuration ||
    typeof draft.preferences.budgetMin === "number" ||
    typeof draft.preferences.budgetMax === "number";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* About */}
      <section aria-labelledby="about-heading" className="rounded-xl border border-kampmax-border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 id="about-heading" className="text-sm font-bold text-kampmax-text">{aboutLabel}</h2>
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden /> {editLabel}
          </Link>
        </div>
        {about ? (
          <p className="mt-3 whitespace-pre-line text-sm text-kampmax-text">{about}</p>
        ) : (
          <p className="mt-3 text-sm text-kampmax-text-secondary">No bio added yet.</p>
        )}
      </section>

      {/* Organization */}
      <section aria-labelledby="org-heading" className="rounded-xl border border-kampmax-border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 id="org-heading" className="text-sm font-bold text-kampmax-text">Organization</h2>
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden /> {editLabel}
          </Link>
        </div>
        {isOrgLike ? (
          <div className="mt-3 space-y-0 divide-y divide-kampmax-border/60">
            <InfoRow label="Organization name" value={draft.organization.name?.trim()} />
            <InfoRow label="Industry" value={draft.organization.industry?.trim()} />
            <InfoRow label="Website" value={draft.organization.website?.trim()} href={draft.organization.website?.trim()} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-kampmax-text-secondary">
            You're hiring as an individual — no organization attached.
          </p>
        )}
      </section>

      {/* Contact (owner-only) */}
      <section aria-labelledby="contact-heading" className="rounded-xl border border-kampmax-border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 id="contact-heading" className="text-sm font-bold text-kampmax-text">Contact</h2>
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden /> {editLabel}
          </Link>
        </div>
        <div className="mt-3 space-y-0 divide-y divide-kampmax-border/60">
          <InfoRow label="Email" value={contactEmail} icon={<Mail className="h-4 w-4" aria-hidden />} href={contactEmail && isValidEmail(contactEmail) ? `mailto:${contactEmail}` : undefined} />
          <InfoRow label="Phone" value={contactPhone} icon={<Phone className="h-4 w-4" aria-hidden />} href={contactPhone ? `tel:${contactPhone}` : undefined} />
          <InfoRow label="Preferred contact" value={contactLabel(draft.contact.preferredContact)} icon={<Phone className="h-4 w-4" aria-hidden />} />
          <InfoRow label="Location" value={location} icon={<MapPin className="h-4 w-4" aria-hidden />} />
        </div>
        {!contactEmail && !contactPhone && !location && (
          <p className="mt-3 text-sm text-kampmax-text-secondary">No contact information added yet.</p>
        )}
      </section>

      {/* Hiring preferences */}
      <section aria-labelledby="prefs-heading" className="rounded-xl border border-kampmax-border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 id="prefs-heading" className="text-sm font-bold text-kampmax-text">Hiring preferences</h2>
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden /> {editLabel}
          </Link>
        </div>
        {hasPrefs ? (
          <div className="mt-3 space-y-4">
            {categories.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-kampmax-text-secondary">
                  Categories
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <span
                      key={c}
                      className={cn(
                        "rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700"
                      )}
                    >
                      {categoryName(c)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <dl className="grid gap-2 text-sm">
              {draft.preferences.experience && (
                <div className="flex justify-between gap-2">
                  <dt className="text-kampmax-text-secondary">Experience level</dt>
                  <dd className="text-right text-kampmax-text">{draft.preferences.experience}</dd>
                </div>
              )}
              {draft.preferences.workType && (
                <div className="flex justify-between gap-2">
                  <dt className="text-kampmax-text-secondary">Work type</dt>
                  <dd className="text-right text-kampmax-text">{draft.preferences.workType}</dd>
                </div>
              )}
              {draft.preferences.projectDuration && (
                <div className="flex justify-between gap-2">
                  <dt className="text-kampmax-text-secondary">Project duration</dt>
                  <dd className="text-right text-kampmax-text">
                    {draft.preferences.projectDuration.replace(/_/g, " ")}
                  </dd>
                </div>
              )}
              {(typeof draft.preferences.budgetMin === "number" ||
                typeof draft.preferences.budgetMax === "number") && (
                <div className="flex justify-between gap-2">
                  <dt className="text-kampmax-text-secondary">Budget range</dt>
                  <dd className="text-right text-kampmax-text">
                    ₦{(draft.preferences.budgetMin ?? 0).toLocaleString()} – ₦
                    {(draft.preferences.budgetMax ?? 0).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        ) : (
          <p className="mt-3 text-sm text-kampmax-text-secondary">
            No hiring preferences set yet.
          </p>
        )}
      </section>

      {/* Website */}
      {draft.profile.website?.trim() && (
        <section className="rounded-xl border border-kampmax-border bg-white p-5 lg:col-span-2">
          <InfoRow
            label="Website"
            value={draft.profile.website.trim()}
            icon={<Globe className="h-4 w-4" aria-hidden />}
            href={draft.profile.website.trim()}
          />
        </section>
      )}
    </div>
  );
}
