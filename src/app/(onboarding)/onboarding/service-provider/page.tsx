import type { Metadata } from "next";
import { Wrench, Briefcase, Users, Shield, Star, ChevronDown } from "lucide-react";
import { RedirectApprovedProvider } from "@/components/service-provider/intro/RedirectApprovedProvider";
import { ServiceCategoryChips } from "@/components/service-provider/intro/ServiceCategoryChips";
import {
  StartApplicationCta,
  StickyStartApplicationBar,
} from "@/components/service-provider/intro/StartApplicationCta";
import { PROVIDER_TYPES } from "@/components/service-provider/provider-types";
import {
  SERVICE_PROVIDER_ONBOARDING_STEPS,
  SP_ONBOARDING_STEP_DESCRIPTIONS,
  SP_ONBOARDING_STEP_LABELS,
  SP_OPTIONAL_ONBOARDING_STEPS,
  type ServiceProviderOnboardingStepId,
} from "@/types/service-provider";

// A server component, so the title, description and share preview are in the HTML
// that search engines and link previews (WhatsApp, X, ...) read.
export const metadata: Metadata = {
  title: "Become a Service Provider | Kampmax",
  description:
    "Turn your skills into income on Kampmax. List your services, set your own schedule and prices, and reach students on campus.",
  openGraph: {
    title: "Become a Service Provider on Kampmax",
    description:
      "List your services, set your own schedule and prices, and reach students on campus.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Become a Service Provider on Kampmax",
    description:
      "List your services, set your own schedule and prices, and reach students on campus.",
  },
};

const BENEFITS = [
  {
    icon: Wrench,
    title: "Offer services, not products",
    description: "List your skills and services — from phone repair to tutoring, photography to plumbing.",
    tone: "bg-kampmax-blue/10 text-kampmax-blue",
  },
  {
    icon: Briefcase,
    title: "Work your way",
    description: "Operate as an individual, a registered business, or a team or agency.",
    tone: "bg-kampmax-gold/10 text-kampmax-gold",
  },
  {
    icon: Users,
    title: "Reach more students",
    description: "Serve one campus or several, or offer your services online.",
    tone: "bg-kampmax-blue/10 text-kampmax-blue",
  },
  {
    icon: Shield,
    title: "Earn trust with a badge",
    description:
      "Verify your identity from your dashboard whenever you are ready. Verified providers earn a trust badge.",
    tone: "bg-kampmax-gold/10 text-kampmax-gold",
  },
  {
    icon: Star,
    title: "Your schedule, your rules",
    description:
      "Set your availability, pricing, travel fees, and booking preferences. Full control over your business.",
    tone: "bg-kampmax-blue/10 text-kampmax-blue",
  },
];

// The nine onboarding steps, grouped the way someone thinks about them. Names and
// descriptions come from the steps themselves, so this can't drift from the flow.
const PHASES: { title: string; blurb: string; steps: ServiceProviderOnboardingStepId[] }[] = [
  { title: "About you", blurb: "Who you are and what you do.", steps: [1, 2, 3] },
  { title: "What you offer", blurb: "Your services, where, and when.", steps: [4, 5, 6] },
  { title: "Finishing touches", blurb: "Stand out, then send it in.", steps: [7, 8, 9] },
];

const OPTIONAL_COUNT = SP_OPTIONAL_ONBOARDING_STEPS.length;
const REQUIRED_COUNT = SERVICE_PROVIDER_ONBOARDING_STEPS - OPTIONAL_COUNT;

const FAQ = [
  {
    question: "Do I need to upload any documents?",
    answer:
      "No. You can set up your profile and start taking bookings first. Verification is handled later from your dashboard.",
  },
  {
    question: "Can I finish my application later?",
    answer:
      "Yes. Your progress saves automatically, so you can leave at any point and pick up where you left off.",
  },
  {
    question: "Can I change how I operate later?",
    answer: "Yes. You can update your provider type after you start.",
  },
  {
    question: "What does verification do?",
    answer:
      "Verified providers earn a trust badge on their profile. You can verify your identity from your dashboard whenever you are ready.",
  },
];

export default function ServiceProviderIntroPage() {
  return (
    // Bottom padding keeps the sticky mobile button from covering the last section.
    <div className="min-h-screen bg-white pb-24 sm:pb-0">
      <RedirectApprovedProvider />
      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-20">
        {/* Hero */}
        <div className="text-center mb-12 lg:mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-kampmax-blue/10 mb-6">
            <Wrench className="h-10 w-10 text-kampmax-blue" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-kampmax-text mb-4">
            Become a Service Provider
          </h1>
          <p className="text-lg text-kampmax-text-secondary max-w-2xl mx-auto">
            Turn your skills into income. List your services, set your own schedule and prices, and
            connect with students who need your expertise.
          </p>
          <div className="mt-8">
            <StartApplicationCta />
            <p className="mt-3 text-sm text-kampmax-text-secondary">
              Free to apply • No documents needed to get started
            </p>
          </div>
        </div>

        {/* Why */}
        <section className="mb-12 lg:mb-16" aria-labelledby="why-heading">
          <h2 id="why-heading" className="text-2xl font-bold text-kampmax-text text-center mb-8">
            Why list your services on Kampmax
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-xl border border-kampmax-border bg-white p-5 hover:border-primary-200 hover:shadow-md transition-all"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${benefit.tone}`}>
                  <benefit.icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="mt-4 text-base font-semibold text-kampmax-text">{benefit.title}</h3>
                <p className="mt-1 text-sm text-kampmax-text-secondary">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-12 lg:mb-16" aria-labelledby="how-heading">
          <h2 id="how-heading" className="text-2xl font-bold text-kampmax-text text-center mb-2">
            How it works
          </h2>
          <p className="text-center text-kampmax-text-secondary mb-8 max-w-2xl mx-auto">
            {REQUIRED_COUNT} short steps and {OPTIONAL_COUNT} optional ones. Your progress saves
            automatically, so you can finish whenever suits you.
          </p>
          <ol className="grid gap-4 lg:grid-cols-3">
            {PHASES.map((phase, index) => (
              <li key={phase.title} className="rounded-xl border border-kampmax-border bg-white p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-600">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-kampmax-text">{phase.title}</h3>
                    <p className="text-sm text-kampmax-text-secondary">{phase.blurb}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {phase.steps.map((step) => (
                    <li key={step} className="text-sm">
                      <span className="font-medium text-kampmax-text">
                        {SP_ONBOARDING_STEP_LABELS[step]}
                      </span>
                      {SP_OPTIONAL_ONBOARDING_STEPS.includes(step) && (
                        <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                          Optional
                        </span>
                      )}
                      <span className="block text-kampmax-text-secondary">
                        {SP_ONBOARDING_STEP_DESCRIPTIONS[step]}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        {/* What can you offer — the live service categories */}
        <ServiceCategoryChips />

        {/* How you operate */}
        <section className="mb-12 lg:mb-16" aria-labelledby="operate-heading">
          <h2 id="operate-heading" className="text-2xl font-bold text-kampmax-text text-center mb-2">
            Choose how you operate
          </h2>
          <p className="text-center text-kampmax-text-secondary mb-8 max-w-2xl mx-auto">
            Not sure? Start as an individual — you can update this later.
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            {PROVIDER_TYPES.map((type) => (
              <div key={type.value} className="rounded-xl border border-kampmax-border bg-white p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                  <type.icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="mt-4 text-base font-semibold text-kampmax-text">{type.label}</h3>
                <p className="mt-1 text-sm text-kampmax-text-secondary">{type.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Questions */}
        <section className="mb-12 lg:mb-16" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-bold text-kampmax-text text-center mb-8">
            Common questions
          </h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-kampmax-border bg-white px-5 py-4"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-kampmax-text [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-kampmax-text-secondary transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="mt-3 text-sm text-kampmax-text-secondary">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final call to action */}
        <div className="text-center pt-4">
          <StartApplicationCta />
          <p className="mt-4 text-sm text-kampmax-text-secondary">
            Free to apply • No documents needed to get started
          </p>
        </div>
      </div>

      <StickyStartApplicationBar />
    </div>
  );
}
