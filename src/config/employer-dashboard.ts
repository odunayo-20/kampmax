// ============================================================
// EMPLOYER DASHBOARD CONFIG  (Module 27)
// ============================================================
// Presentation constants for the employer dashboard shell. The full
// employer dashboard is Module 29 — this module only scaffolds the
// section set and the path helper used by the main layout so the global
// chrome is hidden inside /employer/*.

export const EMPLOYER_DASHBOARD_SECTIONS = [
  "/employer",
  "/employer/dashboard",
  "/employer/jobs",
  "/employer/applications",
  "/employer/contracts",
  "/employer/billing",
  "/employer/profile",
  "/employer/settings",
] as const;

// Paths inside the employer shell that must stay reachable regardless of
// onboarding/approval state (the profile page shows an onboarding CTA instead
// of being hard-gated; settings must remain available in every state so an
// employer can change passwords, manage preferences and log out). The
// employer layout renders these fully rather than wrapping them in the gate.
export const EMPLOYER_GATE_EXEMPT_PATHS = [
  "/employer/profile",
  "/employer/settings",
] as const;