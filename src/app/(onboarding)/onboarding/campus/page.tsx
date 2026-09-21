"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Check, MapPin, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export default function CampusSelectionPage() {
  const router = useRouter();
  const { campuses, isLoadingCampuses, setSelectedCampus } = useApp();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = campuses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.abbreviation.toLowerCase().includes(search.toLowerCase()) ||
      c.location.toLowerCase().includes(search.toLowerCase())
  );

  function handleContinue() {
    const campus = campuses.find((c) => c.id === selectedId);
    if (campus) {
      setSelectedCampus(campus);
      router.push(`/register?campus=${campus.id}`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 flex flex-col px-6 pt-8">
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-1 text-sm text-kampmax-text-secondary hover:text-kampmax-text transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-kampmax-text mb-1">
            Select Your Campus
          </h1>
          <p className="text-sm text-kampmax-text-secondary">
            Choose your school to see products and vendors near you
          </p>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-kampmax-text-secondary" />
          <input
            type="text"
            placeholder="Search your campus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-9 pr-4 text-sm bg-kampmax-bg border border-kampmax-border rounded-lg focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue"
          />
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {isLoadingCampuses && campuses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-8 w-8 text-kampmax-blue animate-spin mb-3" />
              <p className="text-sm text-kampmax-text-secondary">Loading campuses...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-kampmax-muted flex items-center justify-center mb-3">
                <Search className="h-6 w-6 text-kampmax-text-secondary" />
              </div>
              <p className="text-sm font-semibold text-kampmax-text">No campuses found</p>
              <p className="text-xs text-kampmax-text-secondary mt-1">
                We couldn&apos;t find any campus matching &ldquo;{search}&rdquo;. Try another search keyword.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filtered.map((campus) => (
                <button
                  key={campus.id}
                  onClick={() => setSelectedId(campus.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-all duration-200",
                    selectedId === campus.id
                      ? "border-kampmax-blue bg-kampmax-blue/10 ring-1 ring-kampmax-blue"
                      : "border-kampmax-border bg-white hover:border-kampmax-blue/50"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-kampmax-navy flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-kampmax-text">
                      {campus.name}
                    </h3>
                    <p className="text-xs text-kampmax-text-secondary">
                      {campus.location}
                    </p>
                  </div>
                  {selectedId === campus.id && (
                    <div className="w-6 h-6 rounded-full bg-kampmax-blue flex items-center justify-center flex-shrink-0">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 pb-6 border-t border-kampmax-border space-y-2">
          <Button
            onClick={handleContinue}
            disabled={!selectedId}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Continue
          </Button>
          <Link
            href="/login"
            className="block text-center text-sm text-kampmax-text-secondary hover:text-kampmax-text transition-colors py-2"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
