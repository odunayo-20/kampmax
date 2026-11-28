"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useEmployerProfile } from "@/hooks/use-employer-profile";
import { EMPLOYER_CLIENT_TYPES } from "@/config/employer";
import { isOrganizationLikeClientType } from "@/config/employer";
import { getCampusById } from "@/services/campus";
import { EmployerProfileSkeleton } from "./EmployerProfileSkeleton";
import { EmployerProfileHeader } from "./EmployerProfileHeader";
import { EmployerVerificationNotice } from "./EmployerVerificationNotice";
import { EmployerNextStepCard } from "./EmployerNextStepCard";
import { EmployerProfileView } from "./EmployerProfileView";

export function EmployerProfilePage() {
  const profileQuery = useEmployerProfile();

  if (profileQuery.isPending || !profileQuery.data) {
    return <EmployerProfileSkeleton />;
  }

  const { draft, nextStep } = profileQuery.data;
  const clientType = draft.clientType
    ? (EMPLOYER_CLIENT_TYPES.find((t) => t.value === draft.clientType)?.label ?? draft.clientType)
    : "—";
  const isOrgLike = isOrganizationLikeClientType(draft.clientType);

  const displayName =
    (isOrgLike && draft.organization.name?.trim()) || draft.profile.displayName?.trim() || "Your profile";
  const campus = draft.location.campusId
    ? getCampusById(draft.location.campusId)
    : undefined;
  const descriptor = draft.profile.industry?.trim() || draft.organization.industry?.trim() || undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-kampmax-text">Employer profile</h1>
        <Link
          href="/employer/profile/edit"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Edit profile
        </Link>
      </div>

      <EmployerVerificationNotice status={draft.verification.status} />

      <EmployerProfileHeader
        avatarUrl={draft.profile.logoUrl}
        name={displayName}
        headline={draft.profile.headline}
        clientTypeLabel={clientType}
        descriptor={descriptor}
        location={[draft.location.city, draft.location.state].filter(Boolean).join(", ") || campus?.name}
        verified={draft.verification.status === "verified"}
        publicSlug={draft.approvedSlug}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EmployerProfileView draft={draft} editHref="/employer/profile/edit" editLabel="Edit" />
        </div>
        <aside className="space-y-6">
          <EmployerNextStepCard step={nextStep} />
        </aside>
      </div>
    </div>
  );
}