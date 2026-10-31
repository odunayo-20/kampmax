// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthog = {
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
};
vi.mock("posthog-js", () => ({ default: posthog }));

/** A fresh copy of the module, so it re-reads the environment and starts unloaded. */
async function loadAnalytics(key?: string) {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", key ?? "");
  return import("../analytics");
}

beforeEach(() => {
  for (const fn of Object.values(posthog)) fn.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("analytics without a project key", () => {
  it("sends nothing, and never even loads PostHog", async () => {
    const { track, trackPageview, identifyUser, resetAnalytics } = await loadAnalytics();

    track("sp_intro_viewed");
    trackPageview();
    identifyUser("u1");
    resetAnalytics();
    await Promise.resolve();

    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
    expect(posthog.identify).not.toHaveBeenCalled();
  });
});

describe("analytics with a project key", () => {
  it("starts PostHog privately: no autocapture, no recordings, Do Not Track respected", async () => {
    const { track } = await loadAnalytics("phc_test");
    track("sp_intro_viewed");

    await vi.waitFor(() => expect(posthog.init).toHaveBeenCalledTimes(1));
    expect(posthog.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        person_profiles: "identified_only",
        respect_dnt: true,
      })
    );
  });

  it("sends an event with its properties", async () => {
    const { track } = await loadAnalytics("phc_test");
    track("sp_intro_cta_clicked", { placement: "hero", audience: "guest" });

    await vi.waitFor(() =>
      expect(posthog.capture).toHaveBeenCalledWith("sp_intro_cta_clicked", {
        placement: "hero",
        audience: "guest",
      })
    );
  });

  it("holds events asked for while loading, and sends them all, in order", async () => {
    const { track } = await loadAnalytics("phc_test");
    track("sp_intro_viewed");
    track("sp_application_step_viewed", { step: 1, step_name: "Provider Type", optional: false });
    track("sp_application_step_completed", { step: 1, step_name: "Provider Type" });

    await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalledTimes(3));
    expect(posthog.capture.mock.calls.map((c) => c[0])).toEqual([
      "sp_intro_viewed",
      "sp_application_step_viewed",
      "sp_application_step_completed",
    ]);
    expect(posthog.init).toHaveBeenCalledTimes(1);
  });

  it("identifies a signed-in user by id only", async () => {
    const { identifyUser } = await loadAnalytics("phc_test");
    identifyUser("user-123");

    await vi.waitFor(() => expect(posthog.identify).toHaveBeenCalledWith("user-123"));
    expect(posthog.identify.mock.calls[0]).toHaveLength(1);
  });

  it("forgets the user on reset, once analytics has started", async () => {
    const { track, resetAnalytics } = await loadAnalytics("phc_test");
    resetAnalytics();
    expect(posthog.reset).not.toHaveBeenCalled(); // nothing started yet, nothing to forget

    track("sp_intro_viewed");
    await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalled());
    resetAnalytics();
    expect(posthog.reset).toHaveBeenCalledTimes(1);
  });

  it("records page views with the current address", async () => {
    const { trackPageview } = await loadAnalytics("phc_test");
    trackPageview();

    await vi.waitFor(() =>
      expect(posthog.capture).toHaveBeenCalledWith("$pageview", {
        $current_url: window.location.href,
      })
    );
  });
});
