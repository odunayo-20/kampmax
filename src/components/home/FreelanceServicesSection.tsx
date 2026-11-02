"use client";

import { Laptop } from "lucide-react";
import { SectionHeader } from "@/components/layout";
import { PublicServiceCard } from "@/components/freelancer/public/PublicServiceCard";
import { useHomeFreelanceServices } from "@/hooks/use-home";

/**
 * "Hire a freelancer": the newest live freelancer services. Phones scroll them sideways
 * (one and a bit cards in view, so it's clear there's more); large screens show all four.
 * Shows nothing until there is something to show, like the home page's other feeds.
 */
export function FreelanceServicesSection() {
  const { data: services = [] } = useHomeFreelanceServices();
  if (services.length === 0) return null;

  return (
    <section aria-label="Hire a freelancer" className="space-y-3">
      <SectionHeader
        title="Hire a freelancer"
        subtitle="Ready-made services from campus freelancers"
        icon={<Laptop className="h-4 w-4 text-indigo-600" aria-hidden />}
        action={{ label: "Browse all", href: "/freelancers/services" }}
        className="mb-0"
      />
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:pb-0">
        {services.map((service) => (
          <li key={service.id} className="w-64 shrink-0 snap-start sm:w-72 lg:w-auto">
            <PublicServiceCard service={service} />
          </li>
        ))}
      </ul>
    </section>
  );
}
