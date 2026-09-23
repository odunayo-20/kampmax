"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Users, ShieldCheck, Coins, TrendingUp, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { EMPLOYER_DASHBOARD_GATE, getEmployerDashboardAccessApi } from "@/services/employer";

const features = [
  {
    icon: Users,
    title: "Hire Talented Freelancers",
    description: "Find skilled students and freelancers for your projects, from web development to design.",
    color: "text-kampmax-blue",
  },
  {
    icon: Briefcase,
    title: "Post Jobs & Manage Applications",
    description: "Create jobs, review applications and manage your hiring pipeline in one place.",
    color: "text-kampmax-gold",
  },
  {
    icon: ShieldCheck,
    title: "Reviewed Profiles",
    description: "Hire with confidence. Kampmax reviews profiles and verifies where needed.",
    color: "text-kampmax-blue",
  },
  {
    icon: Coins,
    title: "Flexible Budgets",
    description: "Set preferences from short gigs to long-term projects that fit your budget.",
    color: "text-kampmax-gold",
  },
  {
    icon: TrendingUp,
    title: "Manage Projects End-to-End",
    description: "Contracts, project workspaces and reviews — all in one trusted campus ecosystem.",
    color: "text-kampmax-blue",
  },
];

const introSteps = [
  { number: 1, title: "Identity", description: "Who are you hiring as?" },
  { number: 2, title: "Organization", description: "Your business or organization" },
  { number: 3, title: "Contact & Location", description: "How freelancers reach you" },
  { number: 4, title: "Hiring Preferences", description: "What you're looking for" },
  { number: 5, title: "Review & Submit", description: "Submit for review" },
];

export default function EmployerIntroPage() {
  const router = useRouter();
  const { status: authStatus } = useAuth();
  const [checking, setChecking] = useState(true);

  // Gate on the real backend, not a local mock draft: nothing on the
  // backend blocks an Employer capability on verification/review status —
  // the only real state is "has a profile" (→ dashboard) vs "doesn't yet"
  // (→ show this page). A stale local draft must never strand someone on
  // a dead-end "under review" screen with no way back to the form.
  useEffect(() => {
    if (authStatus !== "authenticated") {
      setChecking(false);
      return;
    }
    let cancelled = false;
    getEmployerDashboardAccessApi()
      .then((access) => {
        if (cancelled) return;
        if (access.kind === EMPLOYER_DASHBOARD_GATE.APPROVED) {
          router.replace("/employer/dashboard");
          return;
        }
        setChecking(false);
      })
      .catch(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [authStatus, router]);

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
            <Briefcase className="h-10 w-10 text-kampmax-blue" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-kampmax-text mb-4">
            Start Hiring with Kampmax
          </h1>
          <p className="text-lg text-kampmax-text-secondary max-w-2xl mx-auto">
            Create an employer profile to hire freelancers, manage applications and build your
            projects — all within the campus community.
          </p>
          <div className="mt-8">
            <Button
              size="lg"
              className="w-full sm:w-auto px-12 py-4 text-lg"
              onClick={() => router.push("/onboarding/employer/1")}
            >
              Become an Employer
            </Button>
            <p className="mt-4 text-sm text-kampmax-text-secondary">
              Free to set up · Cancel anytime · Your other profiles stay active
            </p>
          </div>
        </div>

        {/* Features */}
        <section className="mb-12 lg:mb-16">
          <h2 className="text-2xl font-bold text-kampmax-text text-center mb-8">
            Why Hire on Kampmax?
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
            5-Step Onboarding
          </h2>
          <div className="space-y-3">
            {introSteps.map((step) => (
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

        <div className="text-center">
          <Button
            size="lg"
            className="px-12 py-4 text-lg"
            onClick={() => router.push("/onboarding/employer/1")}
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}