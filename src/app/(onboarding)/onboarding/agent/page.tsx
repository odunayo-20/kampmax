"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccommodationAgentStatus, useAccommodationCatalog } from "@/hooks/use-accommodation";
import { choosablePackages, durationText } from "@/lib/agent-billing";
import { formatNaira } from "@/lib/utils";

/** The same four points as the mobile app's agent-setup intro. */
const POINTS = [
  { title: "Student enquiries", text: "Enquiries come from students looking for a place near campus." },
  { title: "A trust badge", text: "Verified agents are shown first and earn students' trust." },
  { title: "Manage your listings", text: "Properties, rooms, photos and rent in one place." },
  { title: "Simple packages", text: "Pick a listing package when you are ready to publish." },
];

const FAQS = [
  {
    q: "How long does the review take?",
    a: "The Kampmax review team checks applications within 24 to 48 hours. You can add properties and rooms once you are approved.",
  },
  {
    q: "Which documents do I need?",
    a: "A government ID (NIN slip, driver's licence, international passport or voter's card) and proof you may rent the property out: a letter from the owner, a title deed or a C of O. An agency can add its CAC certificate.",
  },
  {
    q: "Does it cost anything to apply?",
    a: "No. Applying, adding properties and saving draft listings are free. You pay for a listing package only when you publish a room.",
  },
];

/** Becoming an accommodation agent: what it is, what you need, and the packages. */
export default function AgentOnboardingPage() {
  const router = useRouter();
  const statusQuery = useAccommodationAgentStatus();
  const catalogQuery = useAccommodationCatalog();
  const isApproved = statusQuery.data?.status === "APPROVED";
  const hasApplied = Boolean(statusQuery.data?.applied);
  const packages = choosablePackages(catalogQuery.data?.packages ?? []);

  useEffect(() => {
    if (isApproved) router.replace("/agent");
  }, [isApproved, router]);

  return (
    <div className="min-h-screen bg-kampmax-bg px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-10">
        <section>
          <h1 className="text-3xl font-bold tracking-tight text-kampmax-text">List student housing on Kampmax</h1>
          <p className="mt-3 text-base text-kampmax-text-secondary">
            Apply to become a verified accommodation agent. Once approved, you can list hostels, rooms and apartments to students on your campus.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={hasApplied ? "/agent" : "/onboarding/agent/apply"} className="rounded-xl bg-kampmax-blue px-5 py-3 text-sm font-semibold text-white hover:bg-kampmax-blue/90">
              {hasApplied ? "See where my application stands" : "Start my application"}
            </Link>
            <Link href="/accommodation" className="rounded-xl border border-kampmax-border bg-white px-5 py-3 text-sm font-semibold text-kampmax-text hover:bg-kampmax-bg">
              See student housing
            </Link>
          </div>
          <p className="mt-3 text-xs text-kampmax-text-secondary">
            You will need a government ID and proof you may rent the property out. Files stay private to the Kampmax review team.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {POINTS.map((p) => (
            <div key={p.title} className="rounded-xl border border-kampmax-border bg-white p-4">
              <h2 className="text-sm font-semibold text-kampmax-text">{p.title}</h2>
              <p className="mt-1 text-sm text-kampmax-text-secondary">{p.text}</p>
            </div>
          ))}
        </section>

        {packages.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-kampmax-text">Listing packages</h2>
            <p className="mt-1 text-sm text-kampmax-text-secondary">You choose one when you publish a room. Your paid time starts when the team approves the listing.</p>
            <ul className="mt-3 divide-y divide-kampmax-border rounded-xl border border-kampmax-border bg-white">
              {packages.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 p-4">
                  <span>
                    <span className="block text-sm font-semibold text-kampmax-text">{p.name}</span>
                    <span className="block text-xs text-kampmax-text-secondary">{p.description || `Shown to students for ${durationText(p.durationDays)}.`}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-bold text-kampmax-blue">{p.price > 0 ? formatNaira(p.price) : "Free"}</span>
                    <span className="block text-xs text-kampmax-text-secondary">for {durationText(p.durationDays)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-lg font-bold text-kampmax-text">Questions</h2>
          <dl className="mt-3 space-y-3">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-xl border border-kampmax-border bg-white p-4">
                <dt className="text-sm font-semibold text-kampmax-text">{f.q}</dt>
                <dd className="mt-1 text-sm text-kampmax-text-secondary">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
