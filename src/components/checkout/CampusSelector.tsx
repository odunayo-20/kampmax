"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search, Check, X, Loader2, Building2 } from "lucide-react";
import { useApp } from "@/lib/app-context";
import type { Campus } from "@/types";
import { cn } from "@/lib/utils";

interface CheckoutCampusSelectorProps {
  campus: Campus;
  campusState: "available" | "loading" | "unavailable" | "error";
  onChange: (campus: Campus) => void;
}

export function CheckoutCampusSelector({
  campus,
  campusState,
  onChange,
}: CheckoutCampusSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { campuses } = useApp();

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

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function select(c: Campus) {
    setOpen(false);
    setSearch("");
    onChange(c);
  }

  return (
    <section
      aria-labelledby="checkout-campus-title"
      className="bg-white rounded-xl border border-kampmax-border p-4 sm:p-5"
    >
      <h2
        id="checkout-campus-title"
        className="text-sm font-semibold text-kampmax-text flex items-center gap-2 mb-3"
      >
        <MapPin className="h-4 w-4 text-kampmax-blue" />
        Delivery Campus
      </h2>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-kampmax-border p-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-kampmax-navy/10 flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4 text-kampmax-navy" />
          </div>
          <div className="min-w-0">
            {campusState === "loading" ? (
              <p className="flex items-center gap-2 text-sm text-kampmax-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Validating campus…
              </p>
            ) : (
              <>
                <p className="text-sm font-semibold text-kampmax-text truncate">
                  {campus.name}
                </p>
                <p className="text-xs text-kampmax-text-secondary truncate">
                  {campus.location}
                </p>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => setOpen(true)}
          disabled={campusState === "unavailable" || campusState === "error"}
          className="text-xs font-semibold text-kampmax-blue hover:text-kampmax-blue/80 border border-kampmax-blue/40 rounded-lg px-3 py-1.5 shrink-0 transition-colors disabled:opacity-50"
        >
          Change
        </button>
      </div>

      {(campusState === "unavailable" || campusState === "error") && (
        <p className="text-xs text-kampmax-error mt-2">
          This campus can&apos;t be used for delivery right now. Choose another
          campus or try again.
        </p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-campus-dialog-title"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-kampmax-border">
              <div>
                <h2
                  id="checkout-campus-dialog-title"
                  className="text-base font-bold text-kampmax-text"
                >
                  Choose Campus
                </h2>
                <p className="text-sm text-kampmax-text-secondary">
                  Changing campus re-validates your cart and delivery.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="h-9 w-9 flex items-center justify-center rounded-md text-kampmax-text-secondary hover:bg-neutral-100"
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
              {filtered.length === 0 ? (
                <div className="text-center py-10">
                  <Building2 className="h-8 w-8 mx-auto text-kampmax-text-muted mb-2" />
                  <p className="text-sm text-kampmax-text-secondary">
                    No campuses found.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {filtered.map((c) => {
                    const isSelected = c.id === campus.id;
                    return (
                      <li key={c.id}>
                        <button
                          onClick={() => select(c)}
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
                            <p className="text-sm font-semibold text-kampmax-text">
                              {c.name}
                            </p>
                            <p className="text-xs text-kampmax-text-secondary truncate">
                              {c.location}
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
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
