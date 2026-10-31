import type { Metadata } from "next";
import { Wrench, Briefcase, Users, Shield, Star, ChevronDown, Percent, Lock, LifeBuoy } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import {
  AUTO_CONFIRM_HOURS,
  FREE_CANCELLATION_HOURS,
  REQUEST_RESPONSE_HOURS,
  SERVICE_FEE_PERCENT,
  splitBookingPrice,
} from "@/config/service-booking-terms";
import { IntroPageTracker } from "@/components/service-provider/intro/IntroPageTracker";
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
    title: "A marketplace customers trust",
    description:
      "Every new provider is reviewed by our team before their services appear to customers.",
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

// An example the fee line works through, so "8%" becomes a real amount.
const EXAMPLE_BOOKING_PRICE = 5000;
const EXAMPLE_SPLIT = splitBookingPrice(EXAMPLE_BOOKING_PRICE);

const OPTIONAL_COUNT = SP_OPTIONAL_ONBOARDING_STEPS.length;
const REQUIRED_COUNT = SERVICE_PROVIDER_ONBOARDING_STEPS - OPTIONAL_COUNT;

const FAQ = [
  {
    question: "Do I need to upload any documents?",
    answer:
      "You don't upload documents to apply. Once you submit, our team reviews your application, and your services appear to customers after you're approved.",
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
    question: "How do I get my earnings out?",
    answer:
      "Your earnings go to your Kampmax wallet, and you withdraw them to your bank account. Withdrawing needs a bank account and an identity check, which you set up in your wallet.",
  },
  {
    question: "What if a customer cancels, or I don't answer a request?",
    answer: `Customers can cancel for free up to ${FREE_CANCELLATION_HOURS} hours before a booking starts, and they're refunded. If you choose to approve requests yourself, you have ${REQUEST_RESPONSE_HOURS} hours to answer before the request expires and the customer is refunded.`,
  },
  {
    question: "What happens after I submit?",
    answer:
      "Our team reviews new providers. Your services appear to customers once you're approved, and you'll be notified.",
  },
];

export default function ServiceProviderIntroPage() {
  return (
    // Bottom padding keeps the sticky mobile button from covering the last section.
    <div className="min-h-screen bg-white pb-24 sm:pb-0">
      <RedirectApprovedProvider />
      <IntroPageTracker />
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
            <StartApplicationCta placement="hero" />
            <p className="mt-3 text-sm text-kampmax-text-secondary">
              Free to apply • No documents to upload
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

        {/* What it costs and how you get paid */}
        <section className="mb-12 lg:mb-16" aria-labelledby="money-heading">
          <h2 id="money-heading" className="text-2xl font-bold text-kampmax-text text-center mb-2">
            What it costs and how you get paid
          </h2>
          <p className="text-center text-kampmax-text-secondary mb-8 max-w-2xl mx-auto">
            No surprises: here&apos;s how the money works before you apply.
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-kampmax-border bg-white p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <Percent className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-4 text-base font-semibold text-kampmax-text">
                {SERVICE_FEE_PERCENT}% service fee
              </h3>
              <p className="mt-1 text-sm text-kampmax-text-secondary">
                Applying is free. Kampmax takes {SERVICE_FEE_PERCENT}% of each completed booking, and
                you keep the rest. On a {formatNaira(EXAMPLE_BOOKING_PRICE)} booking, you earn{" "}
                <span className="font-semibold text-kampmax-text">
                  {formatNaira(EXAMPLE_SPLIT.earnings)}
                </span>
                .
              </p>
            </div>
            <div className="rounded-xl border border-kampmax-border bg-white p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <Lock className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-4 text-base font-semibold text-kampmax-text">
                Payment held until it&apos;s done
              </h3>
              <p className="mt-1 text-sm text-kampmax-text-secondary">
                Customers pay when they book, and Kampmax holds the money. It&apos;s released to you
                when the customer confirms the service is done, or automatically after{" "}
                {AUTO_CONFIRM_HOURS} hours if they don&apos;t respond.
              </p>
            </div>
            <div className="rounded-xl border border-kampmax-border bg-white p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <LifeBuoy className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-4 text-base font-semibold text-kampmax-text">
                Kampmax steps in if there&apos;s a problem
              </h3>
              <p className="mt-1 text-sm text-kampmax-text-secondary">
                If a customer reports an issue, Kampmax support reviews it and decides whether the
                payment goes to you or back to the customer.
              </p>
            </div>
          </div>
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
          <StartApplicationCta placement="bottom" />
          <p className="mt-4 text-sm text-kampmax-text-secondary">
            Free to apply • No documents to upload
          </p>
        </div>
      </div>

      <StickyStartApplicationBar />
    </div>
  );
}
