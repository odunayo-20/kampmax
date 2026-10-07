"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getFreelancerDashboardApi } from "@/services/freelancer-dashboard";
import { getMyFreelancerProfile } from "@/services/freelancer";
import type { FreelancerPrivateProfile } from "@/services/freelancer";
import { getCurrentUser } from "@/services/users";
import { FreelancerProfileStatusCard } from "@/components/freelancer/dashboard/FreelancerProfileStatusCard";
import { FreelancerProfilePreview } from "@/components/freelancer/dashboard/FreelancerProfilePreview";
import { FreelancerProfileEditForm } from "@/components/freelancer/dashboard/FreelancerProfileEditForm";
import {
  ProfileSectionEditor,
  type SectionField,
} from "@/components/freelancer/dashboard/ProfileSectionEditor";

const EXPERIENCE_FIELDS: SectionField[] = [
  { key: "jobTitle", label: "Job title", type: "text", required: true },
  { key: "company", label: "Company", type: "text", required: true },
  {
    key: "employmentType",
    label: "Employment type",
    type: "select",
    options: [
      { value: "full_time", label: "Full-time" },
      { value: "part_time", label: "Part-time" },
      { value: "contract", label: "Contract" },
      { value: "freelance", label: "Freelance" },
      { value: "internship", label: "Internship" },
    ],
  },
  { key: "location", label: "Location", type: "text" },
  { key: "startDate", label: "Start date", type: "month", required: true },
  { key: "endDate", label: "End date", type: "month", hideWhenChecked: "currentlyWorking" },
  { key: "currentlyWorking", label: "I currently work here", type: "checkbox" },
  { key: "description", label: "Description", type: "textarea" },
];

const EDUCATION_FIELDS: SectionField[] = [
  { key: "institution", label: "Institution", type: "text", required: true },
  { key: "qualification", label: "Qualification", type: "text", required: true, placeholder: "e.g. HND, BSc" },
  { key: "fieldOfStudy", label: "Field of study", type: "text", required: true },
  { key: "startYear", label: "Start year", type: "year", required: true, placeholder: "2019" },
  { key: "endYear", label: "End year", type: "year", placeholder: "2024" },
  { key: "description", label: "Description", type: "textarea" },
];

const CERTIFICATION_FIELDS: SectionField[] = [
  { key: "name", label: "Certification name", type: "text", required: true },
  { key: "issuingOrganization", label: "Issuing organization", type: "text", required: true },
  { key: "issueDate", label: "Issue date", type: "month", required: true },
  { key: "expirationDate", label: "Expiration date", type: "month" },
  { key: "credentialId", label: "Credential ID", type: "text" },
  { key: "credentialUrl", label: "Credential URL", type: "url", placeholder: "https://" },
];

type Dashboard = Awaited<ReturnType<typeof getFreelancerDashboardApi>>;

export default function FreelancerProfilePage() {
  const [dashboard, setDashboard] = useState<Dashboard>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editSource, setEditSource] = useState<FreelancerPrivateProfile | null>(null);
  const user = getCurrentUser();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const result = await getFreelancerDashboardApi();
      setDashboard(result);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startEditing() {
    const { profile } = await getMyFreelancerProfile();
    setEditSource(profile);
    setEditing(true);
  }

  if (loading) {
    return (
      <div className="flex justify-center rounded-xl border border-kampmax-border bg-white p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-kampmax-blue/20 border-t-kampmax-blue" />
      </div>
    );
  }

  if (loadError || !dashboard) {
    return (
      <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center">
        <p className="text-sm text-kampmax-text-secondary">
          {loadError
            ? "We couldn't load your profile. Please try again."
            : "Profile isn't available right now."}
        </p>
        <button
          onClick={() => void load()}
          className="mt-3 text-sm font-semibold text-primary-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const { profile, profileStatus } = dashboard;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-kampmax-text">Your freelancer profile</h1>
        <p className="mt-0.5 text-sm text-kampmax-text-secondary">
          This is how clients see you on Kampmax.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FreelancerProfilePreview profile={profile} displayName={user.name} />
        </div>
        <FreelancerProfileStatusCard profileStatus={profileStatus} />
      </div>

      <div className="rounded-xl border border-kampmax-border bg-white p-5">
        {editing ? (
          <>
            <h2 className="mb-4 text-sm font-bold text-kampmax-text">Edit your profile</h2>
            <FreelancerProfileEditForm
              initial={
                editSource
                  ? {
                      headline: editSource.professionalTitle,
                      bio: editSource.bio,
                      city: editSource.city,
                      hourlyRate: editSource.hourlyRate,
                      skills: editSource.skills?.map((s) => s.name),
                      photoUrl: editSource.avatar,
                    }
                  : profile
              }
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                void load();
              }}
            />
          </>
        ) : (
          <>
            <h2 className="text-sm font-bold text-kampmax-text">Edit your profile</h2>
            <p className="mt-1 text-xs text-kampmax-text-secondary">
              Update your title, bio, rate, availability and skills right here.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => void startEditing()}
                className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Edit profile details
              </button>
              <Link
                href="/freelancer/dashboard"
                className="inline-flex items-center gap-1 rounded-lg border border-kampmax-border px-3.5 py-2 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
              >
                Back to dashboard
              </Link>
            </div>
          </>
        )}
      </div>

      <ProfileSectionEditor
        title="Work experience"
        addLabel="Add experience"
        path="/freelancers/me/experience"
        fields={EXPERIENCE_FIELDS}
        summarize={(r) => ({
          primary: `${r.jobTitle} · ${r.company}`,
          secondary: `${r.startDate} – ${r.currentlyWorking ? "Present" : r.endDate ?? "—"}`,
        })}
      />
      <ProfileSectionEditor
        title="Education"
        addLabel="Add education"
        path="/freelancers/me/education"
        fields={EDUCATION_FIELDS}
        summarize={(r) => ({
          primary: `${r.qualification} in ${r.fieldOfStudy}`,
          secondary: `${r.institution} · ${r.startYear} – ${r.endYear ?? "—"}`,
        })}
      />
      <ProfileSectionEditor
        title="Certifications"
        addLabel="Add certification"
        path="/freelancers/me/certifications"
        fields={CERTIFICATION_FIELDS}
        summarize={(r) => ({
          primary: String(r.name),
          secondary: `${r.issuingOrganization} · ${r.issueDate}`,
        })}
      />
    </div>
  );
}
