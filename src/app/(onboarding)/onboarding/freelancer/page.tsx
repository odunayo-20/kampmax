"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Code, Palette, BookOpen, Star, ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { FREELANCER_DASHBOARD_GATE, getFreelancerDashboardAccessApi } from "@/services/freelancer-dashboard";
import { computeFlCompletion } from "@/services/freelancer";
import { flDraftFromSaved } from "@/services/freelancer-onboarding";
import type { FlSavedData } from "@/services/freelancer-onboarding";
import { loadOnboardingDraft } from "@/services/onboarding-draft";

const features = [
  {
    icon: Code,
    title: "Showcase Your Skills",
    description: "From web development to design, writing to tutoring — display your expertise to thousands of students.",
    color: "text-kampmax-blue",
  },
  {
    icon: Users,
    title: "Work Your Way",
    description: "Set your own rates, choose your schedule, and work remotely or on-campus. Full flexibility.",
    color: "text-kampmax-gold",
  },
  {
    icon: Palette,
    title: "Build Your Portfolio",
    description: "Showcase your best work with portfolio items, certifications, and client reviews.",
    color: "text-kampmax-blue",
  },
  {
    icon: Star,
    title: "Get Verified & Trusted",
    description: "Verified profiles get priority visibility. Build trust with clients across campuses.",
    color: "text-kampmax-gold",
  },
  {
    icon: BookOpen,
    title: "10-Step Onboarding",
    description: "Complete at your own pace. Save drafts and resume anytime. Takes just 15-20 minutes.",
    color: "text-kampmax-blue",
  },
];

const steps = [
  { number: 1, title: "Your Profile", description: "Headline, bio, and professional photo" },
  { number: 2, title: "Skills & Categories", description: "What you do and your key skills" },
  { number: 3, title: "Experience", description: "Your work history" },
  { number: 4, title: "Education", description: "Your academic background" },
  { number: 5, title: "Certifications", description: "Professional certifications" },
  { number: 6, title: "Portfolio", description: "Showcase your best projects" },
  { number: 7, title: "Rates", description: "Hourly and project pricing" },
  { number: 8, title: "Availability", description: "When you can work" },
  { number: 9, title: "Preferences", description: "How you prefer to work" },
  { number: 10, title: "Review & Submit", description: "Final review and submit" },
];

export default function FreelancerIntroPage() {
  const router = useRouter();
  const { status: authStatus, user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [completion, setCompletion] = useState(0);

  // Gate on the real backend, not a local mock draft: nothing on the
  // backend blocks a Freelancer capability on verification/review status —
  // the only real state is "has a profile" (→ dashboard) vs "doesn't yet"
  // (→ show this page). A stale local draft must never strand someone on
  // a dead-end "under review" screen with no way back to the form.
  useEffect(() => {
    if (authStatus !== "authenticated") {
      setChecking(false);
      return;
    }
    let cancelled = false;
    getFreelancerDashboardAccessApi()
      .then((access) => {
        if (cancelled) return;
        if (access.kind === FREELANCER_DASHBOARD_GATE.APPROVED) {
          router.replace("/freelancer/dashboard");
          return;
        }
        setChecking(false);
      })
      .catch(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [authStatus, router]);

  // Purely a progress nudge ("you're 60% done, continue") from the saved draft —
  // never used to decide whether this page is reachable.
  useEffect(() => {
    if (authStatus !== "authenticated" || !user) return;
    let cancelled = false;
    loadOnboardingDraft<Partial<FlSavedData>>("freelancer")
      .then((saved) => {
        if (!cancelled && saved) setCompletion(computeFlCompletion(flDraftFromSaved(user.id, saved).draft));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authStatus, user]);

  if (authStatus === "loading" || (authStatus === "authenticated" && checking)) {
    return (
      <div className="min-h-screen bg-kampmax-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-20">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-kampmax-blue/10 mb-6">
            <Users className="h-10 w-10 text-kampmax-blue" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-kampmax-text mb-4">
            Become a Freelancer
          </h1>
          <p className="text-lg text-kampmax-text-secondary max-w-2xl mx-auto">
            Turn your skills into income. Join thousands of freelancers on Kampmax and connect
            with clients who need your expertise.
          </p>

          {completion > 0 ? (
            <div className="mt-8 max-w-sm mx-auto">
              <p className="text-sm text-kampmax-text-secondary mb-3">
                You&apos;re {completion}% done. Continue where you left off.
              </p>
              <div className="h-2 w-full rounded-full bg-neutral-100 mb-4">
                <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${completion}%` }} />
              </div>
              <Button size="lg" className="w-full" onClick={() => router.push("/onboarding/freelancer/1")}>
                Continue Your Profile
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="mt-8">
              <Button size="lg" className="w-full sm:w-auto px-12 py-4 text-lg" onClick={() => router.push("/onboarding/freelancer/1")}>
                Start Your Application
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <p className="mt-4 text-sm text-kampmax-text-secondary">
                Free to apply · No commitment · Cancel anytime
              </p>
            </div>
          )}
        </div>

        {/* Features */}
        <section className="mb-12 lg:mb-16">
          <h2 className="text-2xl font-bold text-kampmax-text text-center mb-8">
            Why Freelance on Kampmax?
          </h2>
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex gap-6 p-6 rounded-xl border border-kampmax-border bg-white hover:border-primary-200 hover:shadow-md transition-all"
              >
                <div className="flex-shrink-0">
                  <div className={cn("flex h-14 w-14 items-center justify-center rounded-xl", feature.color + "/10")}>
                    <feature.icon className="h-7 w-7" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-kampmax-text">{feature.title}</h3>
                  <p className="mt-1 text-kampmax-text-secondary">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Onboarding steps */}
        <section className="mb-12 lg:mb-16">
          <h2 className="text-2xl font-bold text-kampmax-text text-center mb-8">
            10-Step Onboarding
          </h2>
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex items-center gap-4 p-4 rounded-xl border border-kampmax-border bg-white"
              >
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold">
                  {step.number}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-kampmax-text">{step.title}</p>
                  <p className="text-sm text-kampmax-text-secondary">{step.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-kampmax-text-secondary" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
