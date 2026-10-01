"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  MapPin,
  Search,
  Check,
  X,
  Building2,
  ChevronDown,
  School,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { Campus } from "@/types";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

interface RegistrationCampusSelectorProps {
  selectedCampus: Campus | null;
  onSelectCampus: (campus: Campus) => void;
  error?: string;
  className?: string;
}

export function RegistrationCampusSelector({
  selectedCampus,
  onSelectCampus,
  error,
  className,
}: RegistrationCampusSelectorProps) {
  const { campuses, isLoadingCampuses } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredCampuses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return campuses;
    return campuses.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.abbreviation.toLowerCase().includes(query) ||
        c.location.toLowerCase().includes(query)
    );
  }, [campuses, search]);

  useEffect(() => {
    if (isOpen) {
      const timeout = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  function handleSelect(campus: Campus) {
    onSelectCampus(campus);
    setIsOpen(false);
    setSearch("");
  }

  const hasSelection = Boolean(selectedCampus && selectedCampus.id);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-kampmax-text flex items-center gap-1">
          Campus / Institution
          <span className="text-kampmax-error" title="Required">
            *
          </span>
        </label>
        <span className="text-xs text-kampmax-text-secondary">
          Required for campus services
        </span>
      </div>

      {/* Selector Trigger Button */}
      {hasSelection && selectedCampus ? (
        <div
          onClick={() => setIsOpen(true)}
          className={cn(
            "w-full flex items-center justify-between gap-3 p-3.5 rounded-lg border text-left cursor-pointer transition-all",
            error
              ? "border-kampmax-error bg-kampmax-error/5 ring-1 ring-kampmax-error"
              : "border-kampmax-border bg-white hover:border-kampmax-blue/60 hover:bg-neutral-50/60"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-kampmax-navy flex items-center justify-center flex-shrink-0 text-white shadow-sm">
              <School className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-kampmax-text truncate">
                  {selectedCampus.name}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-kampmax-blue/10 text-kampmax-blue px-2 py-0.5 rounded-full shrink-0">
                  {selectedCampus.abbreviation}
                </span>
              </div>
              <p className="text-xs text-kampmax-text-secondary flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="h-3 w-3 shrink-0 text-kampmax-text-muted" />
                {selectedCampus.location}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Change campus"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }}
            className="text-xs font-semibold text-kampmax-blue hover:text-kampmax-blue-dark border border-kampmax-blue/30 bg-kampmax-blue/5 hover:bg-kampmax-blue/10 px-3 py-1.5 rounded-md shrink-0 transition-colors"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            "w-full flex items-center justify-between gap-3 p-3.5 rounded-lg border text-left transition-all",
            error
              ? "border-kampmax-error bg-kampmax-error/5 ring-1 ring-kampmax-error"
              : "border-dashed border-kampmax-border bg-white hover:border-kampmax-blue hover:bg-kampmax-blue/5"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-kampmax-muted flex items-center justify-center flex-shrink-0 text-kampmax-text-secondary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-kampmax-text">
                Choose your university or polytechnic
              </p>
              <p className="text-xs text-kampmax-text-secondary">
                Tap to search and select your campus
              </p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-kampmax-text-secondary shrink-0" />
        </button>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-xs text-kampmax-error flex items-center gap-1 mt-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {/* Modal Dialog for Campus Search & Selection */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="registration-campus-dialog-title"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-kampmax-border bg-neutral-50/50">
              <div>
                <h2
                  id="registration-campus-dialog-title"
                  className="text-base font-bold text-kampmax-text flex items-center gap-2"
                >
                  <School className="h-5 w-5 text-kampmax-blue" />
                  Select Your Campus
                </h2>
                <p className="text-xs text-kampmax-text-secondary mt-0.5">
                  Pick your school to personalize listings, feeds, and local pickups
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close campus selector"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-kampmax-text-secondary hover:text-kampmax-text hover:bg-neutral-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-kampmax-border bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-kampmax-text-secondary" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, acronym (e.g. UNILAG, FUTA), or state..."
                  className="w-full h-11 pl-9 pr-9 text-sm bg-kampmax-bg border border-kampmax-border rounded-lg focus:outline-none focus:border-kampmax-blue focus:ring-2 focus:ring-kampmax-blue/20 transition-all placeholder:text-kampmax-text-muted"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center text-kampmax-text-muted hover:text-kampmax-text"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-kampmax-text-secondary mt-2 px-0.5">
                <span>
                  {isLoadingCampuses
                    ? "Updating campus list..."
                    : `${filteredCampuses.length} ${
                        filteredCampuses.length === 1 ? "campus" : "campuses"
                      } found`}
                </span>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-kampmax-blue hover:underline"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </div>

            {/* Campus List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
              {isLoadingCampuses && campuses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="h-7 w-7 text-kampmax-blue animate-spin mb-2" />
                  <p className="text-sm text-kampmax-text-secondary">
                    Loading campuses...
                  </p>
                </div>
              ) : filteredCampuses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-kampmax-muted flex items-center justify-center mb-3">
                    <Building2 className="h-6 w-6 text-kampmax-text-secondary" />
                  </div>
                  <p className="text-sm font-semibold text-kampmax-text">
                    No campuses found
                  </p>
                  <p className="text-xs text-kampmax-text-secondary mt-1 max-w-xs">
                    We couldn&apos;t find any campus matching &ldquo;{search}&rdquo;. Try another name, acronym, or location.
                  </p>
                </div>
              ) : (
                filteredCampuses.map((campus) => {
                  const isSelected = selectedCampus?.id === campus.id;
                  return (
                    <button
                      key={campus.id}
                      type="button"
                      onClick={() => handleSelect(campus)}
                      className={cn(
                        "w-full flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all",
                        isSelected
                          ? "border-kampmax-blue bg-kampmax-blue/10 ring-1 ring-kampmax-blue"
                          : "border-kampmax-border bg-white hover:border-kampmax-blue/50 hover:bg-neutral-50/70"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                          isSelected
                            ? "bg-kampmax-blue text-white"
                            : "bg-kampmax-navy text-white"
                        )}
                      >
                        <School className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-kampmax-text truncate">
                            {campus.name}
                          </h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded shrink-0">
                            {campus.abbreviation}
                          </span>
                        </div>
                        <p className="text-xs text-kampmax-text-secondary flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="h-3 w-3 shrink-0 text-kampmax-text-muted" />
                          {campus.location}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-kampmax-blue flex items-center justify-center flex-shrink-0 text-white shadow-xs">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Notice */}
            <div className="p-3 bg-neutral-50 border-t border-kampmax-border text-center">
              <p className="text-[11px] text-kampmax-text-secondary">
                Don&apos;t see your campus? More Nigerian universities & colleges are added regularly.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
