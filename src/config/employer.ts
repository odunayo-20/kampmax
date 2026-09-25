// ============================================================
// EMPLOYER / CLIENT ONBOARDING CONFIG  (Module 26)
// ============================================================
// Presentation constants for the employer onboarding module:
// client types, hiring categories, experience levels, work
// preference, work types, project durations and organization
// fields. All backend-authoritative — the UI never defines
// platform role/verification behavior here.

import type { EmployerClientType } from "@/types/employer";

// ── Client type options ─────────────────────────────────────

export interface EmployerClientTypeOption {
  value: EmployerClientType;
  label: string;
  description: string;
}

export const EMPLOYER_CLIENT_TYPES: EmployerClientTypeOption[] = [
  {
    value: "individual",
    label: "Individual",
    description: "Hiring as yourself. No organization attached.",
  },
  {
    value: "business",
    label: "Business",
    description: "A registered or unregistered small business or startup.",
  },
  {
    value: "organization",
    label: "Organization",
    description: "A company, NGO, association or larger organization.",
  },
  {
    value: "campus_group",
    label: "Campus Group",
    description: "A student association, club or campus organization.",
  },
];

export function isOrganizationLikeClientType(type: EmployerClientType | ""): boolean {
  return (
    type === "business" || type === "organization" || type === "campus_group"
  );
}

// ── Hiring categories ───────────────────────────────────────
// Selectable hiring categories come from the JOB taxonomy (API). This map only
// labels ids saved by pre-taxonomy drafts / demo records; never use it to build
// a picker or to validate input.

export const LEGACY_HIRING_CATEGORY_NAMES: Readonly<Record<string, string>> = {
  ec1: "Web Development",
  ec2: "Mobile Development",
  ec3: "Graphic Design",
  ec4: "UI/UX Design",
  ec5: "Writing",
  ec6: "Marketing",
  ec7: "Video Editing",
  ec8: "Photography",
  ec9: "Data",
  ec10: "Tutoring",
  ec11: "Virtual Assistance",
  ec12: "Other",
};

// ── Experience preference ───────────────────────────────────

export const EMPLOYER_EXPERIENCE_LEVELS = [
  { value: "any_level", label: "Any Level" },
  { value: "entry_level", label: "Entry Level" },
  { value: "intermediate", label: "Intermediate" },
  { value: "experienced", label: "Experienced" },
  { value: "expert", label: "Expert" },
] as const;

// ── Work preference ─────────────────────────────────────────

export const EMPLOYER_WORK_PREFERENCES = [
  { value: "remote", label: "Remote" },
  { value: "on_site", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
] as const;

// ── Work type ───────────────────────────────────────────────

export const EMPLOYER_WORK_TYPES = [
  { value: "hourly", label: "Hourly" },
  { value: "project", label: "Fixed project" },
  { value: "contract", label: "Contract" },
] as const;

// ── Project duration ────────────────────────────────────────

export const EMPLOYER_PROJECT_DURATIONS = [
  { value: "short_term", label: "Short-term (days)" },
  { value: "few_weeks", label: "A few weeks" },
  { value: "one_to_three_months", label: "1–3 months" },
  { value: "long_term", label: "3+ months / ongoing" },
] as const;

// ── Organization business types ─────────────────────────────

export const EMPLOYER_BUSINESS_TYPES = [
  { value: "startup", label: "Startup" },
  { value: "small_business", label: "Small Business" },
  { value: "registered_business", label: "Registered Business" },
  { value: "student_association", label: "Student Association" },
  { value: "campus_organization", label: "Campus Organization" },
  { value: "ngo", label: "NGO / Non-profit" },
  { value: "enterprise", label: "Enterprise" },
  { value: "other", label: "Other" },
] as const;

// ── Organization size ───────────────────────────────────────

export const EMPLOYER_ORG_SIZES = [
  { value: "just_me", label: "Just me" },
  { value: "2_10", label: "2–10 people" },
  { value: "11_50", label: "11–50 people" },
  { value: "51_200", label: "51–200 people" },
  { value: "200_plus", label: "200+ people" },
] as const;

// ── Preferred contact method ────────────────────────────────

export const EMPLOYER_CONTACT_METHODS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "in_app", label: "Kampmax in-app chat" },
] as const;
