"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { getFreelancerDashboardApi } from "@/services/freelancer-dashboard";
import { getCurrentUser } from "@/services/users";
import { FreelancerProfileStatusCard } from "@/components/freelancer/dashboard/FreelancerProfileStatusCard";
import { FreelancerProfilePreview } from "@/components/freelancer/dashboard/FreelancerProfilePreview";

export default function FreelancerProfilePage() {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getFreelancerDashboardApi>>>(null);
  const user = getCurrentUser();

  useEffect(() => {
    void getFreelancerDashboardApi().then(setDashboard);
  }, []);

  if (!dashboard) {
    return (
      <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center text-sm text-kampmax-text-secondary">
        Profile isn&apos;t available right now.
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
        <h2 className="text-sm font-bold text-kampmax-text">Edit your profile</h2>
        <p className="mt-1 text-xs text-kampmax-text-secondary">
          Update the details below using the onboarding steps. Each section maps to a part of
          your public profile.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/onboarding/freelancer/1"
            className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Edit profile details <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/freelancer/dashboard"
            className="inline-flex items-center gap-1 rounded-lg border border-kampmax-border px-3.5 py-2 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
