"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Wrench, Briefcase, Users, Shield, Star, ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  getServiceProviderDashboardAccessApi,
  SERVICE_PROVIDER_DASHBOARD_GATE,
} from "@/services/service-provider-dashboard";

const features = [
  {
    icon: Wrench,
    title: "Offer Services, Not Products",
    description: "List your skills and services — from phone repair to tutoring, photography to plumbing.",
    color: "text-kampmax-blue",
  },
  {
    icon: Briefcase,
    title: "Flexible Provider Types",
    description: "Operate as an individual, registered business, or team/agency. Each with tailored requirements.",
    color: "text-kampmax-gold",
  },
  {
    icon: Users,
    title: "Multi-Campus Reach",
    description: "Serve students across RUGIPO, OAU, UI, UNILAG, and more. Or offer online services nationwide.",
    color: "text-kampmax-blue",
  },
  {
    icon: Shield,
    title: "Verified & Trusted",
    description: "Verify your identity from your dashboard whenever you are ready. Verified providers earn a trust badge.",
    color: "text-kampmax-gold",
  },
  {
    icon: Star,
    title: "Your Schedule, Your Rules",
    description: "Set your availability, pricing, travel fees, and booking preferences. Full control over your business.",
    color: "text-kampmax-blue",
  },
];

const steps = [
  { number: 1, title: "Choose Provider Type", description: "Individual, Business, or Team/Agency" },
  { number: 2, title: "Build Your Profile", description: "Display name, bio, description, logo" },
  { number: 3, title: "Select Categories", description: "Primary + additional service categories" },
  { number: 4, title: "Add Services", description: "Name, description, price, duration, location" },
  { number: 5, title: "Set Location", description: "Campus, cities, service radius, address" },
  { number: 6, title: "Configure Availability", description: "Weekly schedule, booking preferences, buffers" },
  { number: 7, title: "Set Pricing Rules", description: "Travel fee, emergency fee, weekend fee" },
  { number: 8, title: "Add Portfolio", description: "Showcase your work with photos" },
  { number: 9, title: "Review & Submit", description: "Final review and submit for approval" },
];

export default function ServiceProviderIntroPage() {
  const router = useRouter();
  const { status } = useAuth();
  const [checking, setChecking] = useState(true);

  // Someone can land here already having an active Service Provider
  // profile — e.g. an existing customer sent straight here from /register
  // instead of re-signing-up. Don't show the marketing/start page again;
  // take them straight to the dashboard they already have.
  useEffect(() => {
    if (status !== "authenticated") {
      setChecking(false);
      return;
    }
    let cancelled = false;
    getServiceProviderDashboardAccessApi()
      .then((access) => {
        if (cancelled) return;
        if (access.kind === SERVICE_PROVIDER_DASHBOARD_GATE.APPROVED) {
          router.replace("/service-provider");
          return;
        }
        setChecking(false);
      })
      .catch(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [status, router]);

  if (status === "loading" || (status === "authenticated" && checking)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
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
            <Wrench className="h-10 w-10 text-kampmax-blue" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-kampmax-text mb-4">
            Become a Service Provider
          </h1>
          <p className="text-lg text-kampmax-text-secondary max-w-2xl mx-auto">
            Turn your skills into income. Join thousands of verified service providers on Kampmax
            and connect with students who need your expertise.
          </p>
        </div>

        {/* What you can offer */}
        <section className="mb-12 lg:mb-16">
          <h2 className="text-2xl font-bold text-kampmax-text text-center mb-8">
            What Services Can You Offer?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Beauty & Personal Care",
              "Education & Tutoring",
              "Technology & IT",
              "Repairs & Maintenance",
              "Creative & Design",
              "Home Services",
              "Transportation",
              "Food & Catering",
              "Events & Entertainment",
              "Fitness & Wellness",
              "Professional Services",
              "Printing & Stationery",
            ].map((category) => (
              <div
                key={category}
                className="rounded-xl border border-kampmax-border bg-white p-5 hover:border-primary-300 hover:shadow-md transition-all"
              >
                <p className="font-medium text-kampmax-text">{category}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-12 lg:mb-16">
          <h2 className="text-2xl font-bold text-kampmax-text text-center mb-8">
            How It Works
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

        {/* Onboarding steps overview */}
        <section className="mb-12 lg:mb-16">
          <h2 className="text-2xl font-bold text-kampmax-text text-center mb-8">
            {steps.length}-Step Onboarding
          </h2>
          <p className="text-center text-kampmax-text-secondary mb-8 max-w-2xl mx-auto">
            Complete at your own pace. Save drafts and resume anytime.
          </p>
          <div className="space-y-3">
            {steps.map((step, index) => (
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

        {/* Provider types */}
        <section className="mb-12 lg:mb-16">
          <h2 className="text-2xl font-bold text-kampmax-text text-center mb-8">
            Choose How You Operate
          </h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { label: "Individual", desc: "One person provides the service. Perfect for freelancers and solo professionals.", icon: Store },
              { label: "Business", desc: "A registered/local business provides the service. May require CAC registration.", icon: Briefcase },
              { label: "Team / Agency", desc: "Multiple people provide services under one provider profile. Good for agencies.", icon: Users },
            ].map((type, index) => (
              <div
                key={index}
                className="rounded-xl border-2 border-neutral-200 bg-white p-6 hover:border-primary-300 hover:bg-primary-50 transition-all"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 mb-4">
                  <type.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-kampmax-text mb-2">{type.label}</h3>
                <p className="text-sm text-kampmax-text-secondary">{type.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pt-8">
          <Button
            size="lg"
            className="w-full sm:w-auto px-12 py-4 text-lg"
            onClick={() => router.push("/onboarding/service-provider/1")}
          >
            Start Your Application
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          <p className="mt-4 text-sm text-kampmax-text-secondary">
            Free to apply • No commitment • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}