import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { listPublicFreelancers } from "@/services/freelancer";
import { cn, formatNaira } from "@/lib/utils";
import { BrowseTabs } from "@/components/freelancer/public/BrowseTabs";
import { SearchBox } from "@/components/freelancer/public/SearchBox";

export const metadata: Metadata = {
  title: "Find freelancers | Kampmax",
  description: "Browse campus freelancers and hire the right talent for your project.",
};

const AVAILABILITY_FILTERS = [
  { value: "", label: "Anyone" },
  { value: "AVAILABLE", label: "Available" },
  { value: "BUSY", label: "Busy" },
];

const AVAILABILITY_BADGE: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
  AVAILABLE: { label: "Available", variant: "success" },
  BUSY: { label: "Busy", variant: "warning" },
  UNAVAILABLE: { label: "Not available", variant: "default" },
};

const PAGE_SIZE = 12;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function pageHref(q: string, availability: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (availability) params.set("availability", availability);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/freelancers${qs ? `?${qs}` : ""}`;
}

export default async function FreelancersDirectoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const availability = AVAILABILITY_FILTERS.some((f) => f.value === first(sp.availability))
    ? first(sp.availability)
    : "";
  const page = Math.max(1, Number.parseInt(first(sp.page), 10) || 1);

  const { profiles, total, totalPages, error } = await listPublicFreelancers({
    q: q || undefined,
    availability: availability || undefined,
    page,
    limit: PAGE_SIZE,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <BrowseTabs active="freelancers" />
      <h1 className="mt-5 text-2xl font-bold text-kampmax-text">Find freelancers</h1>
      <p className="mt-1 text-sm text-kampmax-text-secondary">
        {error ? "" : `${total} freelancer${total === 1 ? "" : "s"} on Kampmax`}
      </p>

      <div className="mt-5">
        <SearchBox
          action="/freelancers"
          value={q}
          params={{ availability }}
          placeholder="Search by name, title, bio or location"
          label="Search freelancers"
        />
      </div>

      <nav aria-label="Availability" className="mt-3 flex flex-wrap items-center gap-2">
        {AVAILABILITY_FILTERS.map((f) => {
          const active = availability === f.value;
          return (
            <Link
              key={f.value || "any"}
              href={pageHref(q, f.value, 1)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
                active
                  ? "border-primary-600 bg-primary-600 text-white"
                  : "border-kampmax-border bg-white text-kampmax-text hover:border-primary-300 hover:bg-primary-50"
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {error ? (
        <div role="alert" className="mt-8 rounded-xl border border-kampmax-border bg-white p-8 text-center text-sm text-kampmax-text-secondary">
          We couldn&apos;t load freelancers right now. Please try again shortly.
        </div>
      ) : profiles.length === 0 ? (
        <div className="mt-8 rounded-xl border border-kampmax-border bg-white p-8 text-center text-sm text-kampmax-text-secondary">
          {q || availability ? "No freelancers match your search." : "No freelancers have joined yet."}
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => {
            const badge = AVAILABILITY_BADGE[p.availabilityStatus];
            const place = p.city ?? p.location;
            const rate = p.hourlyRate != null ? Number(p.hourlyRate) : null;
            return (
              <li key={p.id}>
                <Link
                  href={`/freelancers/${p.id}`}
                  className="flex h-full flex-col rounded-xl border border-kampmax-border bg-white p-4 transition-colors hover:border-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={p.fullName} src={p.avatar ?? undefined} size="lg" />
                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-kampmax-text">{p.fullName}</h2>
                      <p className="truncate text-sm text-primary-700">
                        {p.professionalTitle ?? "Freelancer"}
                      </p>
                    </div>
                  </div>
                  {p.bio && (
                    <p className="mt-3 line-clamp-3 text-sm text-kampmax-text-secondary">{p.bio}</p>
                  )}
                  {p.skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.skills.slice(0, 4).map((s) => (
                        <span
                          key={s.skillId}
                          className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-kampmax-text-secondary"
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-xs text-kampmax-text-muted">
                    <span className="inline-flex items-center gap-1">
                      {place && (
                        <>
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          {place}
                        </>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      {rate != null && <span className="font-semibold text-kampmax-text">{formatNaira(rate)}/hr</span>}
                      {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={pageHref(q, availability, page - 1)} className="rounded-md border border-kampmax-border px-3 py-1.5 hover:bg-neutral-50">
              Previous
            </Link>
          )}
          <span className="text-kampmax-text-secondary">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={pageHref(q, availability, page + 1)} className="rounded-md border border-kampmax-border px-3 py-1.5 hover:bg-neutral-50">
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
