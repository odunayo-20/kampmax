"use client";

import { ExternalLink, Plus, SearchX, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Skeleton } from "@/components/home/Skeleton";

export function ServicesGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <Skeleton className="aspect-[16/9] rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ServicesEmptyState({
  hasFilters,
  onCreate,
}: {
  hasFilters: boolean;
  onCreate?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
        {hasFilters ? <SearchX className="h-7 w-7" aria-hidden /> : <Plus className="h-7 w-7" aria-hidden />}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-neutral-900">
        {hasFilters ? "No services match your filters" : "You haven't created any services yet"}
      </h3>
      <p className="mt-1 max-w-xs text-xs text-neutral-500">
        {hasFilters
          ? "Try a different status or search term."
          : "Create your first service and start showcasing what you offer."}
      </p>
      {!hasFilters && (
        <div className="mt-4">
          <Button onClick={onCreate}>Create Service</Button>
        </div>
      )}
    </div>
  );
}

export function ServicesErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-50 text-error-600">
        <AlertCircle className="h-7 w-7" aria-hidden />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-neutral-900">Something went wrong</h3>
      <p className="mt-1 max-w-xs text-xs text-neutral-500">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

export function ServiceFormSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ServiceHeader({
  count,
  publicProfileId,
}: {
  count: number;
  /** When set, offers a way to see the page clients see. */
  publicProfileId?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">My Services</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {count > 0
            ? `You have ${count} service${count === 1 ? "" : "s"}.`
            : "Showcase the services you offer and let clients discover what you can help them with."}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {publicProfileId && (
          <Link href={`/freelancers/${publicProfileId}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full sm:w-auto">
              <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden />
              View public profile
            </Button>
          </Link>
        )}
        <Link href="/freelancer/services/create">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Create Service
          </Button>
        </Link>
      </div>
    </div>
  );
}
