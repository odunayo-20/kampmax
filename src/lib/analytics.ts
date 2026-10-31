import type { PostHog } from "posthog-js";

/**
 * Product analytics (PostHog), kept deliberately small and private:
 *  - Off unless NEXT_PUBLIC_POSTHOG_KEY is set, so local development and tests send nothing.
 *  - Only the events named in `AnalyticsEvents` are sent. No autocapture and no session
 *    recording, so nothing a user types or sees is collected by accident.
 *  - No names, emails or phone numbers. A signed-in user is identified by their opaque
 *    user id only, so the funnel can follow someone from sign-up to submit.
 *  - Do Not Track is respected.
 *
 * posthog-js is loaded on first use, so it isn't part of the initial page weight.
 */

/** Every event the app sends, with its properties. Add new events here. */
export interface AnalyticsEvents {
  // Service provider application funnel
  sp_intro_viewed: undefined;
  sp_intro_cta_clicked: { placement: "hero" | "bottom" | "sticky"; audience: "guest" | "member" };
  sp_application_step_viewed: { step: number; step_name: string; optional: boolean };
  sp_application_step_completed: { step: number; step_name: string };
  sp_application_submitted: {
    provider_type: string | null;
    services_count: number;
    portfolio_count: number;
  };
  sp_application_submit_failed: { stage: "incomplete" | "request" };
  sp_application_received_viewed: { state: "pending" | "approved" | "missing" };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let client: PostHog | null = null;
let loading: Promise<void> | null = null;
/** Work asked for before posthog-js finished loading; run once it has. */
const pending: Array<(posthog: PostHog) => void> = [];

function load(): Promise<void> {
  if (!loading) {
    loading = import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.init(KEY as string, {
          api_host: HOST,
          autocapture: false,
          capture_pageview: false, // sent by AnalyticsBridge on route changes
          capture_pageleave: false,
          disable_session_recording: true,
          person_profiles: "identified_only",
          respect_dnt: true,
        });
        client = posthog;
        for (const job of pending.splice(0)) job(posthog);
      })
      .catch(() => {
        // Analytics must never break the app: drop the queue and carry on.
        pending.length = 0;
      });
  }
  return loading;
}

function run(job: (posthog: PostHog) => void): void {
  if (!KEY || typeof window === "undefined") return;
  if (client) {
    job(client);
    return;
  }
  pending.push(job);
  void load();
}

/** Records one named event. */
export function track<E extends AnalyticsEventName>(
  event: E,
  ...[properties]: AnalyticsEvents[E] extends undefined ? [] : [AnalyticsEvents[E]]
): void {
  run((posthog) => posthog.capture(event, properties as Record<string, unknown> | undefined));
}

/** Records that the current page was viewed (call on every route change). */
export function trackPageview(): void {
  run((posthog) => posthog.capture("$pageview", { $current_url: window.location.href }));
}

/** Ties this browser's events to a signed-in user, by id only. */
export function identifyUser(userId: string): void {
  run((posthog) => posthog.identify(userId));
}

/** Forgets the signed-in user, so the next person on this browser starts fresh. */
export function resetAnalytics(): void {
  // Nothing to forget if analytics never started.
  if (client) client.reset();
}
