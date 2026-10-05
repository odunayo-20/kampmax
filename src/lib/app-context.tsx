"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Campus } from "@/types";
import { EMPTY_CAMPUS, fetchCampuses, getCampuses } from "@/services/campus";

const SELECTED_CAMPUS_KEY = "kampmax_selected_campus";
const ONBOARDING_COMPLETED_KEY = "kampmax_onboarding_completed";

interface AppState {
  hasCompletedOnboarding: boolean;
  selectedCampus: Campus;
  campuses: Campus[];
  isLoadingCampuses: boolean;
  setHasCompletedOnboarding: (v: boolean) => void;
  setSelectedCampus: (c: Campus) => void;
  reloadCampuses: () => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState(false);
  const [campuses, setCampuses] = useState<Campus[]>(() => getCampuses());
  const [selectedCampus, setSelectedCampusState] = useState<Campus>(EMPTY_CAMPUS);
  const [isLoadingCampuses, setIsLoadingCampuses] = useState(false);

  // Restore onboarding state and selected campus from localStorage on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedOnboarding = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
      if (storedOnboarding === "true") {
        setHasCompletedOnboardingState(true);
      }

      const storedCampusJson = localStorage.getItem(SELECTED_CAMPUS_KEY);
      if (storedCampusJson) {
        const parsed = JSON.parse(storedCampusJson) as Campus;
        if (parsed && parsed.id) {
          setSelectedCampusState(parsed);
        }
      }
    } catch {
      // Ignore local storage parse errors
    }
  }, []);

  // Fetch live campuses from backend on mount
  const reloadCampuses = useCallback(async () => {
    setIsLoadingCampuses(true);
    try {
      const res = await fetchCampuses({ limit: 50 });
      // On failure fetchCampuses hands back its cached/mock list: never let
      // that replace the user's selection or the list we already have.
      if (!res.error && res.data && res.data.length > 0) {
        setCampuses(res.data);

        setSelectedCampusState((prev) => {
          const matched =
            res.data.find((c) => c.id === prev.id) ??
            (prev.abbreviation
              ? res.data.find((c) => c.abbreviation === prev.abbreviation)
              : undefined);
          // A stale/mock selection (e.g. a seed id) falls back to a real campus.
          const next = matched ?? res.data[0];
          // Persist the resolution so a stale stored campus does not reappear
          // (and flicker) on every load.
          if (next.id !== prev.id || next.name !== prev.name) {
            try {
              localStorage.setItem(SELECTED_CAMPUS_KEY, JSON.stringify(next));
            } catch {
              // quota/private browsing
            }
          }
          return next;
        });
      }
    } catch {
      // Fallback silently to cached/seed campuses
    } finally {
      setIsLoadingCampuses(false);
    }
  }, []);

  useEffect(() => {
    reloadCampuses();
  }, [reloadCampuses]);

  const setSelectedCampus = useCallback((c: Campus) => {
    setSelectedCampusState(c);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(SELECTED_CAMPUS_KEY, JSON.stringify(c));
      } catch {
        // quota/private browsing
      }
    }
  }, []);

  const setHasCompletedOnboarding = useCallback((v: boolean) => {
    setHasCompletedOnboardingState(v);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ONBOARDING_COMPLETED_KEY, String(v));
      } catch {
        // quota/private browsing
      }
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        hasCompletedOnboarding,
        selectedCampus,
        campuses,
        isLoadingCampuses,
        setHasCompletedOnboarding,
        setSelectedCampus,
        reloadCampuses,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
