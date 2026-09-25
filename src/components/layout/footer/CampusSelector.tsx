"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapPin,
  Search,
  Check,
  X,
  Building2,
  Loader2,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { getCampuses, getCampusById } from "@/services/campus";
import type { Campus } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

/**
 * Campus selector for the footer.
 *
 * Reuses the existing campus context (`useApp`) so choosing a campus here
 * updates the whole app. The campus list is loaded via the existing campus
 * service; the component is structured to swap in an async fetcher later
 * (the `loading` / `onLoaded` plumbing is already in place).
 */

interface CampusSelectorProps {
  /** Forced placement state in the footer CTA (used by tests/dev tooling). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CampusSelector({ open, onOpenChange }: CampusSelectorProps) {
  const { selectedCampus, setSelectedCampus, campuses } = useApp();
  const [innerOpen, setInnerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const isOpen = open ?? innerOpen;
  const setIsOpen = (v: boolean) => {
    setInnerOpen(v);
    onOpenChange?.(v);
    if (!v) setSearch("");
  };

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return campuses;
    return campuses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.abbreviation.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
    );
  }, [campuses, search]);

  const popular: Campus[] = useMemo(
    () =>
      ["oau", "unilag", "uniabuja", "ui"]
        .map((id) => getCampusById(id))
        .filter((c): c is Campus => !!c),
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full h-11 justify-between font-normal"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-kampmax-blue" />
          <span className="truncate">
            {selectedCampus.name}
          </span>
        </span>
        <span className="text-xs font-semibold text-kampmax-text-secondary bg-neutral-100 rounded px-1.5 py-0.5 shrink-0">
          {selectedCampus.abbreviation}
        </span>
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="campus-selector-title"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[85vh] sm:max-h-[70vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-kampmax-border">
              <div>
                <h2
                  id="campus-selector-title"
                  className="text-base font-bold text-kampmax-text"
                >
                  Choose Campus
                </h2>
                <p className="text-sm text-kampmax-text-secondary">
                  Shopping around a campus?
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close campus selector"
                className="h-9 w-9 flex items-center justify-center rounded-md text-kampmax-text-secondary hover:bg-neutral-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kampmax-blue"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 pt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-kampmax-text-secondary" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your campus..."
                  className="w-full h-10 pl-9 pr-3 text-sm bg-kampmax-bg border border-kampmax-border rounded-lg focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-kampmax-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading campuses…
                </div>
              ) : (
                <>
                  {filtered.length === 0 ? (
                    <div className="text-center py-10">
                      <Building2 className="h-8 w-8 mx-auto text-kampmax-text-muted mb-2" />
                      <p className="text-sm text-kampmax-text-secondary">
                        No campuses found
                      </p>
                      <p className="text-xs text-kampmax-text-muted">
                        Try a different search.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {filtered.map((campus) => {
                        const isSelected = campus.id === selectedCampus.id;
                        const isPopular = popular.some(
                          (p) => p.id === campus.id
                        );
                        return (
                          <li key={campus.id}>
                            <button
                              onClick={() => {
                                setSelectedCampus(campus);
                                setIsOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                                isSelected
                                  ? "border-kampmax-blue bg-kampmax-blue/10"
                                  : "border-transparent hover:bg-neutral-50"
                              )}
                            >
                              <div className="w-9 h-9 rounded-lg bg-kampmax-navy flex items-center justify-center flex-shrink-0">
                                <MapPin className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-semibold text-kampmax-text truncate">
                                    {campus.name}
                                  </span>
                                  {isSelected && (
                                    <span className="text-[10px] font-semibold text-kampmax-blue bg-kampmax-blue/10 px-1.5 py-0.5 rounded">
                                      Selected
                                    </span>
                                  )}
                                  {isPopular && !isSelected && (
                                    <span className="text-[10px] font-medium text-kampmax-text-muted">
                                      Popular
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-kampmax-text-secondary truncate">
                                  {campus.location}
                                </p>
                              </div>
                              {isSelected && (
                                <span className="h-5 w-5 rounded-full bg-kampmax-blue flex items-center justify-center flex-shrink-0">
                                  <Check className="h-3 w-3 text-white" />
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>

            <div className="px-5 py-3 border-t border-kampmax-border">
              <p className="text-xs text-kampmax-text-secondary">
                Showing products, vendors and services near{" "}
                <span className="font-semibold text-kampmax-text">
                  {selectedCampus.name}
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
