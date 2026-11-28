/**
 * The employer dashboard's own rules, the same as the mobile app's hiring hub: the one posting worth a look today
 * and the one profile step to do next (mobile lib/employer-hub, employer-portal buildCompletion). Escrow is
 * contract-groups heldInEscrow, shared with the freelancer dashboard. Pure.
 */

// ---- the posting worth a look today -----------------------------------------------------

export interface WatchedPosting {
  jobId: string;
  title: string;
  opportunityType: string;
  /** ISO time, or null when the posting has no end date. */
  expiresAt: string | null;
  /** People waiting for the employer on this posting. */
  newCount: number;
}

/** The postings the server picked out (GET /employers/me/dashboard `watch`), skipping broken rows. */
export function watchFrom(raw: unknown): WatchedPosting[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r): WatchedPosting[] => {
    const w = (r && typeof r === "object" ? r : null) as Partial<WatchedPosting> | null;
    if (!w || typeof w.jobId !== "string" || !w.jobId) return [];
    const n = Number(w.newCount);
    return [
      {
        jobId: w.jobId,
        title: typeof w.title === "string" ? w.title : "",
        opportunityType: typeof w.opportunityType === "string" ? w.opportunityType : "GIG",
        expiresAt: typeof w.expiresAt === "string" ? w.expiresAt : null,
        newCount: Number.isFinite(n) && n > 0 ? Math.floor(n) : 0,
      },
    ];
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "closes today", "closes tomorrow", "closes in 3 days": only when it is close enough to matter. */
export function closesSoonText(expiresAt: string | null, now: Date = new Date(), withinDays = 7): string | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return null;
  const days = Math.ceil((end - now.getTime()) / DAY_MS);
  if (days > withinDays) return null;
  if (days <= 0) return "closes today";
  return days === 1 ? "closes tomorrow" : `closes in ${days} days`;
}

export interface TodayLine {
  text: string;
  jobId: string;
  opportunityType: string;
}

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

/**
 * The one posting worth a look today: the one with people waiting, or failing that the one about to close. Null when
 * nothing is waiting and nothing is closing, so the dashboard says nothing rather than something empty. (The next
 * interview has its own line in the hiring snapshot.)
 */
export function todayLine(watch: WatchedPosting[], now: Date = new Date()): TodayLine | null {
  const waiting = watch.find((w) => w.newCount > 0);
  if (waiting) {
    const who = waiting.opportunityType === "GIG" ? "proposal" : "applicant";
    const closes = closesSoonText(waiting.expiresAt, now);
    const title = waiting.title.trim() || "your posting";
    return { text: `${plural(waiting.newCount, `new ${who}`)} on ${title}${closes ? `, ${closes}` : ""}`, jobId: waiting.jobId, opportunityType: waiting.opportunityType };
  }
  const closing = watch.find((w) => closesSoonText(w.expiresAt, now, 3));
  if (!closing) return null;
  return { text: `${closing.title.trim() || "Your posting"} ${closesSoonText(closing.expiresAt, now, 3)}`, jobId: closing.jobId, opportunityType: closing.opportunityType };
}

// ---- the one profile step to do next ----------------------------------------------------

export interface ProfileFacts {
  displayName?: string;
  headline?: string;
  about?: string;
  industry?: string;
  city?: string;
  campusId?: string;
  email?: string;
  phone?: string;
  categories?: number;
  /** Only for a business, organization or campus group. */
  organization?: { name?: string; businessType?: string } | null;
}

export interface NextStep {
  title: string;
  detail: string;
  /** "3 of 8 done". */
  progress: string;
}

const has = (v?: string) => !!v?.trim();

/** The first thing missing from the profile, in the mobile app's order and words; null once it is all there. */
export function nextProfileStep(f: ProfileFacts): NextStep | null {
  const items = [
    { title: "Your name", detail: "The name freelancers will see.", done: has(f.displayName) },
    { title: "A one-line headline", detail: 'For example "Founder of a campus snack brand".', done: has(f.headline) },
    { title: "About you", detail: "A few lines on who you are and what you hire for.", done: has(f.about) },
    { title: "Your industry", detail: "What field you work in.", done: has(f.industry) },
    { title: "Where you are", detail: "Your campus or city.", done: has(f.city) || has(f.campusId) },
    { title: "Contact details", detail: "An email and a phone number.", done: has(f.email) && has(f.phone) },
    { title: "What you hire for", detail: "Pick the kinds of work you need.", done: (f.categories ?? 0) > 0 },
    ...(f.organization ? [{ title: "Your organization", detail: "Its name and what kind it is.", done: has(f.organization.name) && has(f.organization.businessType) }] : []),
  ];
  const next = items.find((i) => !i.done);
  if (!next) return null;
  return { title: next.title, detail: next.detail, progress: `${items.filter((i) => i.done).length} of ${items.length} done` };
}
