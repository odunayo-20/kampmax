import { describe, expect, it } from "vitest";
import { freelancerDraftToCreateDto } from "../freelancer";
import {
  flDraftFromSaved,
  flDraftToSaved,
  freshId,
  mergeFreelancerProfile,
  newFlDraft,
} from "../freelancer-onboarding";

const profile = {
  professionalTitle: "Product designer",
  bio: "I design things.",
  city: "Owo",
  campusId: "campus-1",
  hourlyRate: 5000,
  skills: [{ name: "Figma" }],
} as never;

describe("freelancer wizard draft", () => {
  it("starts blank and editable with a working week", () => {
    const { draft, completedSteps } = flDraftFromSaved("u1", null);
    expect(draft).toMatchObject({ userId: "u1", currentStep: 1, status: "IN_PROGRESS", skills: [] });
    expect(draft.availability.workingDays).toHaveLength(5);
    expect(completedSteps).toEqual([]);
  });

  it("restores the saved values, step and finished steps", () => {
    const original = newFlDraft("u1");
    original.currentStep = 6;
    original.skills = ["Figma"];
    original.profile = { headline: "Designer", bio: "Hi", remoteAvailable: true };
    const sent = flDraftToSaved(original, [1, 2, 3, 3]);
    expect(sent.data.completedSteps).toEqual([1, 2, 3]);

    const back = flDraftFromSaved("u1", { ...sent, updatedAt: "2026-10-07T10:00:00Z" });
    expect(back.draft).toMatchObject({ currentStep: 6, skills: ["Figma"], profile: { headline: "Designer" } });
    expect(back.completedSteps).toEqual([1, 2, 3]);
  });

  it("never saves a picture held as inline data, nor status or verification", () => {
    const original = newFlDraft("u1");
    original.profile = { photoUrl: "data:image/png;base64,AAAA", headline: "Designer" };
    original.portfolio = [
      { id: "p1", title: "Brand", description: "", imageUrl: "data:image/png;base64,BBBB", skills: [], visible: true },
    ];
    const sent = flDraftToSaved(original, []);
    expect(JSON.stringify(sent)).not.toContain("data:image");
    expect(sent.data.profile.headline).toBe("Designer");
    expect(Object.keys(sent.data)).not.toEqual(expect.arrayContaining(["status", "userId"]));
  });

  it("gives out different ids for rows added in the wizard", () => {
    expect(freshId()).not.toBe(freshId());
  });
});

describe("opening the wizard with a profile that already exists", () => {
  it("fills what is empty from the profile and keeps what the person typed", () => {
    const base = newFlDraft("u1");
    base.profile = { headline: "Typed headline", remoteAvailable: true };
    const merged = mergeFreelancerProfile(base, profile, null);
    expect(merged.profile).toMatchObject({ headline: "Typed headline", bio: "I design things.", city: "Owo", campusId: "campus-1" });
    expect(merged.skills).toEqual(["Figma"]);
    expect(merged.rates.hourlyRate).toBe(5000);
  });

  it("prefers the rows already saved on the server", () => {
    const base = newFlDraft("u1");
    base.experience = [{ id: "local" } as never];
    const server = { experience: [{ id: "server" } as never], education: [], certifications: [] };
    const merged = mergeFreelancerProfile(base, profile, server);
    expect(merged.experience.map((e) => e.id)).toEqual(["server"]);
    expect(merged.education).toEqual([]);
  });
});

describe("freelancer profile photo", () => {
  const withPhoto = { ...(profile as object), avatar: "https://cdn.example.com/me.jpg", profileMediaId: "m1" } as never;

  it("keeps the address of an uploaded photo in the draft, but never the picture itself", () => {
    const d = newFlDraft("u1");
    d.profile = { photoUrl: "https://cdn.example.com/me.jpg", photoMediaId: "m1" };
    expect(flDraftToSaved(d, []).data.profile).toMatchObject({ photoUrl: "https://cdn.example.com/me.jpg", photoMediaId: "m1" });
    d.profile = { photoUrl: "data:image/png;base64,AAAA", photoMediaId: "m1" };
    expect(flDraftToSaved(d, []).data.profile.photoUrl).toBe("");
  });

  it("shows the photo of a profile that already exists, without overriding a newly chosen one", () => {
    const merged = mergeFreelancerProfile(newFlDraft("u1"), withPhoto, null);
    expect(merged.profile).toMatchObject({ photoUrl: "https://cdn.example.com/me.jpg", photoMediaId: "m1" });

    const chosen = newFlDraft("u1");
    chosen.profile = { photoUrl: "https://cdn.example.com/new.jpg", photoMediaId: "m2" };
    expect(mergeFreelancerProfile(chosen, withPhoto, null).profile).toMatchObject({ photoMediaId: "m2" });

    const removed = newFlDraft("u1");
    removed.profile = { photoUrl: null, photoMediaId: null };
    expect(mergeFreelancerProfile(removed, withPhoto, null).profile.photoMediaId).toBeNull();
  });
});

describe("sending the photo to the server", () => {
  it("sends the uploaded photo's media id, and null when it was removed", () => {
    const d = newFlDraft("u1");
    d.profile = { photoMediaId: "m1" };
    expect(freelancerDraftToCreateDto(d).profileMediaId).toBe("m1");
    d.profile = { photoMediaId: null };
    expect(freelancerDraftToCreateDto(d).profileMediaId).toBeNull();
    d.profile = {};
    expect(freelancerDraftToCreateDto(d).profileMediaId).toBeUndefined();
  });
});
