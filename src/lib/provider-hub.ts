/**
 * What the service provider's home says at a glance: the money cards, requests waiting, today's line, the one next
 * step. The mobile app's lib/provider-hub.ts says the same things. No React in here.
 */

import { formatNaira } from "@/lib/utils";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const firstName = (fullName: string | null | undefined): string => (fullName ?? "").trim().split(/\s+/)[0] ?? "";

export interface ProviderMoney {
  /** Held for accepted jobs the customer has not confirmed yet. */
  onTheWay: number;
  onTheWayCount: number;
  /** Held for requests not answered yet; comes back to the customer if declined. */
  awaitingAnswer: number;
  earnedTotal: number;
  earnedThisMonth: number;
}

export interface ProviderStats {
  pending: number;
  upcomingToday: number;
  upcoming: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  money?: ProviderMoney;
}

/** Under "Available": what is still clearing, else what the month has brought in. */
export function availableFooter(clearing: number | undefined, money: ProviderMoney | undefined): string {
  if (clearing && clearing > 0) return `${formatNaira(clearing)} still clearing`;
  if (money && money.earnedThisMonth > 0) return `${formatNaira(money.earnedThisMonth)} earned this month`;
  if (money && money.earnedTotal > 0) return `${formatNaira(money.earnedTotal)} earned so far`;
  return "Your earnings land here";
}

/** Under "On the way": the jobs whose money is held until the customer confirms. */
export function onTheWayFooter(money: ProviderMoney | undefined): string {
  if (!money || money.onTheWayCount === 0) return "Paid out after each job";
  return `${plural(money.onTheWayCount, "job")} to be confirmed`;
}

/** A money figure; a missing one is a dash, never a fake zero. */
export const moneyText = (amount: number | undefined): string => (amount === undefined ? "–" : formatNaira(amount));

export interface NextJob {
  serviceName: string;
  startAt: string;
  customer: { name: string };
}

export interface TodayLine {
  title: string;
  detail: string;
}

const clockTime = (iso: string) =>
  new Date(iso)
    .toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" })
    .replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" });

/** The one line about the day: how many jobs today, and the nearest job with its time and customer. */
export function todayLine(stats: ProviderStats | undefined, next: NextJob | null | undefined): TodayLine | null {
  if (!stats) return null;
  const today = stats.upcomingToday;
  const title =
    stats.inProgress > 0
      ? `${plural(stats.inProgress, "job")} in progress`
      : today > 0
        ? `${plural(today, "job")} today`
        : stats.upcoming > 0
          ? "Nothing more today"
          : "No jobs coming up";
  if (!next) return { title, detail: "Customers book you from your page" };
  const who = firstName(next.customer.name);
  const when = today > 0 ? clockTime(next.startAt) : `${dayLabel(next.startAt)}, ${clockTime(next.startAt)}`;
  return { title, detail: `Next: ${when} · ${next.serviceName}${who ? `, ${who}` : ""}` };
}

/** The call-out for requests waiting on an answer, with what is at stake. */
export function requestsCallout(pending: number, awaitingAnswer: number | undefined): { title: string; text: string } | null {
  if (pending < 1) return null;
  return {
    title: `${plural(pending, "request")} waiting for you`,
    text:
      awaitingAnswer && awaitingAnswer > 0
        ? `${formatNaira(awaitingAnswer)} is held for you. Answer to lock it in.`
        : "Customers are waiting for an answer.",
  };
}

// ── Getting set up ───────────────────────────────────────────

export interface SetupInput {
  hasPicture: boolean;
  services: number;
  liveServices: number;
  hours: number;
  portfolio: number;
}

export interface SetupStep {
  id: string;
  title: string;
  hint: string;
  done: boolean;
  href: string;
}

export function setupSteps(i: SetupInput): SetupStep[] {
  const paused = i.services > 0 && i.liveServices === 0;
  return [
    {
      id: "service",
      title: paused ? "Make a service live" : "Add your first service",
      hint: paused ? "Your services are paused, so customers cannot see them." : "Say what you offer and what it costs.",
      done: i.liveServices > 0,
      href: paused ? "/service-provider/services" : "/service-provider/services/new",
    },
    { id: "hours", title: "Set your working hours", hint: "Customers can only book you inside these hours.", done: i.hours > 0, href: "/service-provider/availability" },
    { id: "photo", title: "Add a profile picture", hint: "A face or logo builds trust.", done: i.hasPicture, href: "/service-provider/profile" },
    { id: "portfolio", title: "Show your work", hint: "Pictures of past jobs help people choose you.", done: i.portfolio > 0, href: "/service-provider/portfolio" },
  ];
}

export interface NextStep {
  /** "2 of 4 done" */
  progress: string;
  title: string;
  hint: string;
  href: string;
}

/** The first unfinished setup step, with how far along the provider is. Null once everything is done. */
export function providerNextStep(steps: SetupStep[]): NextStep | null {
  const next = steps.find((s) => !s.done);
  if (!next) return null;
  const done = steps.filter((s) => s.done).length;
  return { progress: `${done} of ${steps.length} done`, title: next.title, hint: next.hint, href: next.href };
}

// ── Verification ─────────────────────────────────────────────

export interface VerificationNotice {
  title: string;
  body: string;
  /** Suspended or switched off: the provider needs support, not patience. */
  blocked: boolean;
}

/** Shown only while verification matters: null once the profile is verified. */
export function verificationNotice(status: string | null | undefined): VerificationNotice | null {
  switch (String(status ?? "").toUpperCase()) {
    case "VERIFIED":
      return null;
    case "SUSPENDED":
      return { title: "Suspended", body: "Your profile is suspended. Contact support to find out why.", blocked: true };
    case "DEACTIVATED":
      return { title: "Deactivated", body: "Your profile is switched off.", blocked: true };
    default:
      return {
        title: "Awaiting verification",
        body: "Kampmax is reviewing your profile. You can add services and hours now; customers see them once you are verified.",
        blocked: false,
      };
  }
}
