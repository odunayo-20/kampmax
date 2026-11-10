"use client";

import Link from "next/link";
import {
  Building2,
  ClipboardList,
  MessageSquareText,
  Wallet,
  Plus,
  ArrowRight,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import {
  useAccommodationAgentProfile,
  useAccommodationAgentStatus,
  useAccommodationProperties,
  useAgentAccommodationListings,
  useAccommodationEnquiries,
  useAccommodationSubscriptions,
} from "@/hooks/use-accommodation";
import { AgentMetricCard } from "@/components/agent/AgentMetricCard";
import { AgentStatusBadge } from "@/components/agent/AgentStatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AgentDashboardPage() {
  const statusQuery = useAccommodationAgentStatus();
  const profileQuery = useAccommodationAgentProfile(Boolean(statusQuery.data?.applied));
  const isApproved = statusQuery.data?.status === "APPROVED";

  const propertiesQuery = useAccommodationProperties(1, Boolean(statusQuery.data?.applied));
  const listingsQuery = useAgentAccommodationListings(1, isApproved);
  const enquiriesQuery = useAccommodationEnquiries("AGENT", 1);
  const subscriptionsQuery = useAccommodationSubscriptions(1, isApproved);

  const agent = profileQuery.data;
  const status = statusQuery.data?.status ?? "PENDING";

  const totalProperties = propertiesQuery.data?.meta.total ?? propertiesQuery.data?.items.length ?? 0;
  const totalListings = listingsQuery.data?.meta.total ?? listingsQuery.data?.items.length ?? 0;
  const totalEnquiries = enquiriesQuery.data?.meta.total ?? enquiriesQuery.data?.items.length ?? 0;
  const activeSubs = subscriptionsQuery.data?.items.filter((s) => s.status === "ACTIVE").length ?? 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-kampmax-text sm:text-3xl">
              Agent Workspace
            </h1>
            <AgentStatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            Manage your properties, student listings, inspection leads, and subscriptions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/agent/properties"
            className="inline-flex items-center gap-1.5 rounded-xl bg-kampmax-blue px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-kampmax-blue/90"
          >
            <Plus className="h-4 w-4" />
            <span>Add Property</span>
          </Link>
          <Link
            href="/agent/listings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-kampmax-border bg-white px-4 py-2 text-xs font-semibold text-kampmax-text hover:bg-neutral-50"
          >
            <ClipboardList className="h-4 w-4 text-kampmax-blue" />
            <span>Manage Listings</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AgentMetricCard
          title="Properties"
          value={propertiesQuery.isPending ? "…" : totalProperties}
          subtitle="Buildings & compounds"
          icon={Building2}
          tone="blue"
        />
        <AgentMetricCard
          title="Listings"
          value={listingsQuery.isPending ? "…" : totalListings}
          subtitle="Advertised rooms & flats"
          icon={ClipboardList}
          tone="emerald"
        />
        <AgentMetricCard
          title="Student Inquiries"
          value={enquiriesQuery.isPending ? "…" : totalEnquiries}
          subtitle="Inspection & chat leads"
          icon={MessageSquareText}
          tone="amber"
        />
        <AgentMetricCard
          title="Active Subscriptions"
          value={subscriptionsQuery.isPending ? "…" : activeSubs}
          subtitle="Promoted packages"
          icon={Wallet}
          tone="purple"
        />
      </div>

      {/* Main Grid: Recent Enquiries & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols): Recent Inquiries */}
        <section className="rounded-2xl border border-kampmax-border bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-kampmax-border pb-4">
            <div>
              <h2 className="text-base font-bold text-kampmax-text">Recent Student Inquiries</h2>
              <p className="text-xs text-kampmax-text-secondary">
                Students requesting inspections or information about your listings
              </p>
            </div>
            <Link
              href="/agent/enquiries"
              className="inline-flex items-center gap-1 text-xs font-semibold text-kampmax-blue hover:underline"
            >
              <span>View all</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4">
            {enquiriesQuery.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : enquiriesQuery.isError ? (
              <p className="text-xs text-red-600">Could not load inquiries.</p>
            ) : enquiriesQuery.data.items.length === 0 ? (
              <div className="py-10 text-center">
                <MessageSquareText className="mx-auto h-8 w-8 text-neutral-300" />
                <p className="mt-2 text-sm font-medium text-kampmax-text">No inquiries yet</p>
                <p className="mt-1 text-xs text-kampmax-text-secondary">
                  When students reach out about your rooms, their messages and inspection requests will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-kampmax-border">
                {enquiriesQuery.data.items.slice(0, 5).map((enquiry) => (
                  <div key={enquiry.id} className="flex items-center justify-between py-3.5 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-kampmax-text">{enquiry.counterpart}</p>
                      <p className="truncate text-kampmax-text-secondary">
                        Listing: {enquiry.listingTitle || "Accommodation"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-neutral-400">
                        {new Date(enquiry.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      href="/agent/enquiries"
                      className="rounded-lg border border-kampmax-border px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
                    >
                      Respond
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Agent Profile & Quick Access */}
        <div className="space-y-6">
          {/* Agent Info Card */}
          <section className="rounded-2xl border border-kampmax-border bg-white p-5">
            <h2 className="text-base font-bold text-kampmax-text">Agent Profile</h2>
            <div className="mt-3 space-y-2 text-xs">
              <div>
                <p className="text-kampmax-text-secondary">Full Name</p>
                <p className="font-semibold text-kampmax-text">{agent?.fullName ?? "—"}</p>
              </div>
              <div>
                <p className="text-kampmax-text-secondary">Agency / Brand</p>
                <p className="font-semibold text-kampmax-text">{agent?.agencyName || "Independent Agent"}</p>
              </div>
              <div>
                <p className="text-kampmax-text-secondary">Operating Location</p>
                <p className="inline-flex items-center gap-1 font-semibold text-kampmax-text">
                  <MapPin className="h-3 w-3 text-kampmax-blue" />
                  {agent?.operatingLocation ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-kampmax-text-secondary">Contact</p>
                <p className="font-semibold text-kampmax-text">{agent?.phone} · {agent?.email}</p>
              </div>
            </div>

            <div className="mt-4 border-t border-kampmax-border pt-3">
              <Link
                href="/agent/settings"
                className="inline-flex items-center gap-1 text-xs font-semibold text-kampmax-blue hover:underline"
              >
                <span>Edit Profile Information</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>

          {/* Verification Status Card */}
          <section className="rounded-2xl border border-kampmax-border bg-white p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-kampmax-blue" />
              <h2 className="text-base font-bold text-kampmax-text">KYC Verification</h2>
            </div>
            <p className="mt-1 text-xs text-kampmax-text-secondary">
              Verified agents receive an official trust badge on all campus listings.
            </p>
            <div className="mt-3">
              <AgentStatusBadge status={status} />
            </div>
            <div className="mt-4">
              <Link
                href="/agent/verification"
                className="inline-flex w-full items-center justify-center rounded-xl border border-kampmax-border bg-neutral-50 px-4 py-2 text-xs font-semibold text-kampmax-text hover:bg-neutral-100"
              >
                Manage Verification Documents
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

