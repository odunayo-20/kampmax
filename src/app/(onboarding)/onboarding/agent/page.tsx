"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ShieldCheck,
  MessageSquareText,
  Wallet,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  FileCheck2,
  Lock,
  Star,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAccommodationAgentStatus, useAccommodationCatalog } from "@/hooks/use-accommodation";

const BENEFITS = [
  {
    icon: Users,
    title: "Direct Verified Student Leads",
    description:
      "Connect directly with students from verified campus domains looking for rooms, self-contains, and hostels.",
    tone: "bg-kampmax-blue/10 text-kampmax-blue",
  },
  {
    icon: ShieldCheck,
    title: "Verified Agent Trust Badge",
    description:
      "All accommodation agents go through credential review. Stand out from unverified campus brokers and build instant trust.",
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Building2,
    title: "Full Inventory Management",
    description:
      "Organize entire multi-unit hostels or individual flats. Track available rooms, booked units, and maintenance status.",
    tone: "bg-kampmax-gold/15 text-kampmax-navy",
  },
  {
    icon: Wallet,
    title: "Affordable, Transparent Listing Packages",
    description:
      "Free to register, set up properties, and save draft listings. Choose affordable 30, 60, or 90-day subscription packages only when you publish.",
    tone: "bg-purple-50 text-purple-600",
  },
];

const PHASES = [
  {
    step: "01",
    title: "Agent Profile & Operating Campus",
    description: "Provide your name, contact details, agency name, and campuses where you operate.",
  },
  {
    step: "02",
    title: "Upload Verification Credentials",
    description: "Upload a government-issued ID and proof of ownership or landlord authorization letter.",
  },
  {
    step: "03",
    title: "Add Properties & Rentable Units",
    description: "Set up hostel or property details with individual room specs, photos, and rent amounts.",
  },
  {
    step: "04",
    title: "Publish with Listing Packages",
    description: "Select a package to publish to the public campus directory and start receiving student inquiries.",
  },
];

const FAQS = [
  {
    q: "How long does agent verification take?",
    a: "Our campus safety and verification team reviews submitted agent documents within 24 to 48 hours. You can set up your property inventory while your verification is pending.",
  },
  {
    q: "What documents are required to become an agent?",
    a: "You need a valid government-issued ID (NIN slip, Driver's License, International Passport, or Voter's Card) and proof of authority to advertise the property (such as a written letter of authorization from the property owner or ownership document). Corporate agencies can also provide CAC documents.",
  },
  {
    q: "Are there any upfront fees to register?",
    a: "No! Registering as an accommodation agent, creating properties, and adding unit drafts is 100% free. You only pay for listing subscription packages when you choose to publish a room to students.",
  },
  {
    q: "Can I manage multiple hostels or properties?",
    a: "Yes! The Kampmax Agent Workspace allows you to add multiple buildings, manage hundreds of individual rooms/units, and track inquiries separately for each property.",
  },
];

function money(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AgentOnboardingPage() {
  const router = useRouter();
  const { status: authStatus } = useAuth();
  const statusQuery = useAccommodationAgentStatus();
  const catalogQuery = useAccommodationCatalog();

  const isApproved = statusQuery.data?.status === "APPROVED";
  const hasApplied = Boolean(statusQuery.data?.applied);

  // Auto-redirect if already approved
  useEffect(() => {
    if (isApproved) {
      router.replace("/agent");
    }
  }, [isApproved, router]);

  const packages = catalogQuery.data?.packages ?? [];

  return (
    <div className="min-h-screen bg-kampmax-bg">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-kampmax-border bg-gradient-to-b from-white to-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-kampmax-blue/20 bg-kampmax-blue/5 px-3 py-1 text-xs font-semibold text-kampmax-blue">
            <Building2 className="h-3.5 w-3.5" />
            <span>Kampmax Accommodation Partner Program</span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-kampmax-text sm:text-5xl">
            List Accommodation & Reach Campus Students
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-kampmax-text-secondary sm:text-lg">
            Turn vacancies into occupancy. Connect directly with verified university students searching
            for hostels, self-contains, and apartments near campus.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={hasApplied ? "/agent" : "/onboarding/agent/apply"}
              className="inline-flex items-center gap-2 rounded-2xl bg-kampmax-blue px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-kampmax-blue/90 hover:shadow-lg"
            >
              <span>{hasApplied ? "Go to Agent Workspace" : "Start Agent Application"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/accommodation"
              className="inline-flex items-center gap-2 rounded-2xl border border-kampmax-border bg-white px-6 py-3.5 text-sm font-semibold text-kampmax-text shadow-2xs hover:bg-neutral-50"
            >
              Browse Student Housing
            </Link>
          </div>

          {hasApplied && (
            <p className="mt-4 text-xs font-medium text-amber-700">
              You already submitted an application. Check status in your workspace.
            </p>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-kampmax-text sm:text-3xl">
            Why Property Managers & Agents Choose Kampmax
          </h2>
          <p className="mt-2 text-sm text-kampmax-text-secondary">
            Built specifically to solve student housing challenges across Nigerian universities.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="rounded-2xl border border-kampmax-border bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${b.tone}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-kampmax-text">{b.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-kampmax-text-secondary">
                  {b.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works (Roadmap) */}
      <section className="border-y border-kampmax-border bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-kampmax-text sm:text-3xl">
              Four Simple Steps to Start Listing
            </h2>
            <p className="mt-2 text-sm text-kampmax-text-secondary">
              A transparent, safe verification process designed to protect both agents and students.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PHASES.map((phase) => (
              <div key={phase.step} className="relative rounded-2xl bg-neutral-50/70 p-6 border border-neutral-200">
                <span className="text-xs font-bold text-kampmax-blue">{phase.step}</span>
                <h3 className="mt-2 text-sm font-bold text-kampmax-text">{phase.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-kampmax-text-secondary">
                  {phase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Listing Packages Preview */}
      {packages.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-kampmax-text sm:text-3xl">
              Transparent Listing Packages
            </h2>
            <p className="mt-2 text-sm text-kampmax-text-secondary">
              No hidden fees or commission cuts. Pick the promotion duration that fits your budget.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex flex-col justify-between rounded-2xl border border-kampmax-border bg-white p-6 shadow-xs hover:border-kampmax-blue/50"
              >
                <div>
                  <h3 className="text-lg font-bold text-kampmax-text">{pkg.name}</h3>
                  <p className="mt-1 text-xs text-kampmax-text-secondary">
                    {pkg.description || `${pkg.durationDays} days active listing promotion`}
                  </p>
                  <p className="mt-4 text-2xl font-extrabold text-kampmax-blue">
                    {money(pkg.price, pkg.currency)}
                  </p>
                  <p className="text-[11px] text-kampmax-text-secondary">
                    Valid for {pkg.durationDays} days
                  </p>
                </div>

                <div className="mt-6 border-t border-kampmax-border pt-4">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                    <CheckCircle className="h-4 w-4" />
                    <span>Featured in student search</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section className="border-t border-kampmax-border bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <HelpCircle className="mx-auto h-8 w-8 text-kampmax-blue" />
            <h2 className="mt-2 text-2xl font-bold text-kampmax-text">Frequently Asked Questions</h2>
          </div>

          <div className="mt-10 space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-kampmax-border p-5">
                <h3 className="font-bold text-sm text-kampmax-text">{faq.q}</h3>
                <p className="mt-2 text-xs leading-relaxed text-kampmax-text-secondary">{faq.a}</p>
              </div>
            ))}
          </div>

          {/* Final CTA */}
          <div className="mt-12 rounded-3xl bg-kampmax-navy p-8 text-center text-white sm:p-12">
            <h3 className="text-2xl font-extrabold sm:text-3xl">Ready to Fill Your Student Housing?</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-300">
              Join trusted landlords and campus agents advertising verified accommodations on Kampmax.
            </p>
            <div className="mt-6">
              <Link
                href="/onboarding/agent/apply"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-kampmax-navy shadow-md hover:bg-neutral-100"
              >
                <span>Apply as an Agent</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

