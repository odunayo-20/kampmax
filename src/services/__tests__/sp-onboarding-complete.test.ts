import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const addService = vi.fn();
const saveAvailability = vi.fn();

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    patch: (...a: unknown[]) => patch(...a),
  },
}));
vi.mock("@/services/service-provider-dashboard.api", () => ({
  addSpDashboardServiceLive: (...a: unknown[]) => addService(...a),
  updateSpAvailabilityLive: (...a: unknown[]) => saveAvailability(...a),
}));

import { completeSpOnboarding, validateSpDraft } from "../service-provider";
import type { ServiceProviderOnboardingDraft } from "@/types/service-provider";

const service = (name: string) => ({
  name,
  description: `${name} description`,
  categoryId: "cat-1",
  pricingModel: "fixed",
  price: 5000,
  durationMinutes: 60,
  locationType: "both",
  status: "active",
});

const draft = (over: Record<string, unknown> = {}) =>
  ({
    provider: { displayName: "Chi Styles" },
    profile: { displayName: "Chi Styles", description: "Braids" },
    category: { primaryCategoryId: "cat-1" },
    services: [service("Braiding"), service("Wig install")],
    availability: { days: [{ dayIndex: 0, isAvailable: true, openTime: "09:00", closeTime: "17:00" }] },
    ...over,
  }) as unknown as ServiceProviderOnboardingDraft;

const ok = <T>(data: T) => Promise.resolve({ data, error: null });
const failure = (message: string, status = 400) => Promise.resolve({ data: null, error: { message, status } });

beforeEach(() => {
  vi.clearAllMocks();
  post.mockImplementation(() => ok({ id: "profile-1" }));
  get.mockImplementation(() => ok([]));
  patch.mockImplementation(() => ok({}));
  addService.mockResolvedValue({ ok: true });
  saveAvailability.mockResolvedValue({ ok: true });
});

describe("validateSpDraft", () => {
  it("asks for what is missing", () => {
    expect(validateSpDraft(draft({ profile: {}, provider: {} }))).toBe("Add a display name.");
    expect(validateSpDraft(draft({ category: {} }))).toMatch(/category/);
    expect(validateSpDraft(draft({ services: [] }))).toMatch(/service/);
    expect(validateSpDraft(draft())).toBeNull();
  });
});

describe("completeSpOnboarding", () => {
  it("saves the profile, every service and the weekly schedule", async () => {
    const result = await completeSpOnboarding(draft());

    expect(result).toEqual({ ok: true, problems: [] });
    expect(post).toHaveBeenCalledWith(
      "/service-provider/profile",
      expect.objectContaining({ displayName: "Chi Styles" })
    );
    expect(addService.mock.calls.map(([input]) => (input as { name: string }).name)).toEqual([
      "Braiding",
      "Wig install",
    ]);
    expect(saveAvailability).toHaveBeenCalledTimes(1);
  });

  it("does not start when the draft is incomplete", async () => {
    const result = await completeSpOnboarding(draft({ services: [] }));
    expect(result.ok).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });

  it("stops and says so when the profile can't be created", async () => {
    post.mockImplementation(() => failure("Not allowed", 403));
    const result = await completeSpOnboarding(draft());
    expect(result).toEqual({ ok: false, problems: ["Not allowed"] });
    expect(addService).not.toHaveBeenCalled();
  });

  it("carries on when the profile already exists, and skips services already saved", async () => {
    post.mockImplementation(() => failure("You already have a service provider profile", 409));
    get.mockImplementation(() => ok([{ title: "braiding" }]));

    const result = await completeSpOnboarding(draft());

    expect(result.ok).toBe(true);
    expect(addService.mock.calls.map(([input]) => (input as { name: string }).name)).toEqual(["Wig install"]);
  });

  it("sends each service's uploaded picture with it", async () => {
    await completeSpOnboarding(
      draft({
        services: [
          { ...service("Braiding"), images: ["https://cdn.example.com/b.jpg"], coverMediaId: "media-9" },
          service("Wig install"),
        ],
      })
    );

    const inputs = addService.mock.calls.map(([input]) => input as { coverMediaId?: string });
    expect(inputs[0].coverMediaId).toBe("media-9");
    expect(inputs[1].coverMediaId).toBeUndefined();
  });

  it("sends each service's extra pictures and the status chosen for it", async () => {
    await completeSpOnboarding(
      draft({
        services: [
          {
            ...service("Braiding"),
            status: "active",
            gallery: [
              { mediaId: "g1", url: "https://cdn.example.com/g1.jpg" },
              { mediaId: "g2", url: "https://cdn.example.com/g2.jpg" },
            ],
          },
          { ...service("Wig install"), status: "draft" },
        ],
      })
    );

    const inputs = addService.mock.calls.map(
      ([input]) => input as { galleryMediaIds?: string[]; status?: string }
    );
    expect(inputs[0]).toMatchObject({ galleryMediaIds: ["g1", "g2"], status: "active" });
    expect(inputs[1]).toMatchObject({ galleryMediaIds: undefined, status: "draft" });
  });

  describe("campuses", () => {
    const RUGIPO = "6a332447-af9a-46df-b18e-943cd3e56b9c";
    const UNILAG = "8239e3fd-a71a-4dba-9e3f-bfe65de33bcc";
    const location = { primaryCampusId: RUGIPO, additionalCampusIds: [UNILAG, "oau"] };

    it("saves the campuses chosen with the profile, leaving out old non-id values", async () => {
      await completeSpOnboarding(draft({ location }));

      expect(post).toHaveBeenCalledWith(
        "/service-provider/profile",
        expect.objectContaining({ primaryCampusId: RUGIPO, additionalCampusIds: [UNILAG] })
      );
    });

    it("sends no campus when the draft only has an old short name like 'rugipo'", async () => {
      await completeSpOnboarding(draft({ location: { primaryCampusId: "rugipo", additionalCampusIds: [] } }));

      const body = post.mock.calls[0][1] as { primaryCampusId?: string };
      expect(body.primaryCampusId).toBeUndefined();
    });

    it("saves them on the existing profile when it was already created", async () => {
      post.mockImplementation(() => failure("You already have a service provider profile", 409));

      const result = await completeSpOnboarding(draft({ location }));

      expect(result.ok).toBe(true);
      expect(patch).toHaveBeenCalledWith("/service-provider/profile/me", {
        primaryCampusId: RUGIPO,
        additionalCampusIds: [UNILAG],
      });
    });

    it("says so when the campus could not be saved on the existing profile", async () => {
      post.mockImplementation(() => failure("You already have a service provider profile", 409));
      patch.mockImplementation(() => failure("down", 500));

      const result = await completeSpOnboarding(draft({ location }));

      expect(result.ok).toBe(false);
      expect(result.problems[0]).toMatch(/campus wasn't saved/);
    });
  });

  it("names each service and the schedule that did not save, so a retry can finish the job", async () => {
    addService
      .mockResolvedValueOnce({ ok: false, error: "Choose a category." })
      .mockResolvedValueOnce({ ok: true });
    saveAvailability.mockResolvedValue({ ok: false, error: "Failed to save weekly schedule" });

    const result = await completeSpOnboarding(draft());

    expect(result.ok).toBe(false);
    expect(result.problems).toEqual([
      '"Braiding" wasn\'t saved: Choose a category.',
      "Your weekly schedule wasn't saved: Failed to save weekly schedule",
    ]);
  });

  it("adds no services when it can't tell which already exist, rather than risk duplicates", async () => {
    get.mockImplementation(() => failure("down", 500));

    const result = await completeSpOnboarding(draft());

    expect(result.ok).toBe(false);
    expect(result.problems[0]).toMatch(/none were added/);
    expect(addService).not.toHaveBeenCalled();
  });
});
