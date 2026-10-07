import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    patch: (...a: unknown[]) => patch(...a),
    delete: (...a: unknown[]) => del(...a),
  },
}));
const uploadFileDirect = vi.fn();
vi.mock("@/services/media", () => ({ uploadFileDirect: (...a: unknown[]) => uploadFileDirect(...a) }));
vi.mock("@/services/service-provider-dashboard.api", () => ({
  addSpDashboardServiceLive: vi.fn().mockResolvedValue({ ok: true }),
  updateSpAvailabilityLive: vi.fn().mockResolvedValue({ ok: true }),
}));

import {
  addMyPortfolioItem,
  imageProblem,
  removeMyPortfolioItem,
  setMyProviderImages,
  uploadProviderImage,
} from "../service-provider-media";
import { completeSpOnboarding } from "../service-provider";
import { newSpDraft } from "../service-provider-onboarding";

const ok = <T>(data: T) => Promise.resolve({ data, error: null });
const fail = (message = "no") => Promise.resolve({ data: null, error: Object.assign(new Error(message), { status: 400 }) });
const image = (size = 1000, type = "image/png") => new File([new Uint8Array(size)], "a.png", { type });

beforeEach(() => vi.clearAllMocks());

describe("choosing a picture", () => {
  it("accepts images within the limit and says why it refuses anything else", () => {
    expect(imageProblem(image(), "logo")).toBeNull();
    expect(imageProblem(image(1000, "application/pdf"), "logo")).toMatch(/image file/);
    expect(imageProblem(image(6 * 1024 * 1024), "logo")).toMatch(/5MB/);
    expect(imageProblem(image(6 * 1024 * 1024), "portfolio")).toBeNull();
  });

  it("uploads and returns the media id and address", async () => {
    uploadFileDirect.mockResolvedValue({ data: { id: "m1", url: "https://cdn.example.com/a.png" }, error: null });
    expect(await uploadProviderImage(image(), "coverImage")).toEqual({ mediaId: "m1", url: "https://cdn.example.com/a.png" });
    expect(uploadFileDirect).toHaveBeenCalledWith(expect.any(File), "coverImage");
  });

  it("never uploads a file it already knows is unusable, and never fakes a finished upload", async () => {
    await expect(uploadProviderImage(image(1000, "text/plain"), "logo")).rejects.toThrow(/image file/);
    expect(uploadFileDirect).not.toHaveBeenCalled();
    uploadFileDirect.mockResolvedValue({ data: null, error: new Error("Upload failed with status 500") });
    await expect(uploadProviderImage(image(), "logo")).rejects.toThrow();
    uploadFileDirect.mockResolvedValue({ data: { id: "m1", url: null }, error: null });
    await expect(uploadProviderImage(image(), "logo")).rejects.toThrow(/no address/);
  });
});

describe("profile images and portfolio calls", () => {
  it("shows or takes down the logo and cover by media id", async () => {
    patch.mockImplementation(() => ok({}));
    expect(await setMyProviderImages({ logoMediaId: "m1", coverMediaId: null })).toEqual({ ok: true });
    expect(patch).toHaveBeenCalledWith("/service-provider/profile/me", { logoMediaId: "m1", coverMediaId: null });
    patch.mockImplementation(() => fail("Upload your own image first"));
    expect(await setMyProviderImages({ logoMediaId: "x" })).toMatchObject({ ok: false });
  });

  it("adds a trimmed portfolio item and reports a refusal instead of pretending", async () => {
    post.mockImplementation(() => ok({ id: "i1", title: "Braids" }));
    const res = await addMyPortfolioItem({ mediaId: "m1", title: "  Braids ", description: " ", categoryId: "" });
    expect(res.ok).toBe(true);
    expect(post).toHaveBeenCalledWith("/service-provider/portfolio", { mediaId: "m1", title: "Braids" });
    post.mockImplementation(() => fail("You can show up to 10 portfolio items"));
    expect(await addMyPortfolioItem({ mediaId: "m2", title: "x" })).toMatchObject({ ok: false });
    del.mockImplementation(() => ok({ success: true }));
    expect(await removeMyPortfolioItem("i1")).toEqual({ ok: true });
  });
});

describe("finishing provider onboarding with pictures", () => {
  function draft() {
    const d = newSpDraft("u1");
    d.profile = {
      displayName: "Tola Cuts",
      logo: "https://cdn/l.png",
      logoMediaId: "logo-1",
      coverImage: "https://cdn/c.png",
      coverImageMediaId: "cover-1",
    };
    d.category = { primaryCategoryId: "cat", secondaryCategoryIds: [] };
    d.services = [
      { name: "Braids", description: "d", categoryId: "cat", pricingModel: "fixed", price: 5000, durationMinutes: 60, locationType: "both" } as never,
    ];
    d.portfolio = [
      { image: "https://cdn/1.png", mediaId: "p1", title: "One", description: "", categoryId: "cat" },
      { image: "https://cdn/2.png", mediaId: "p2", title: "Two", description: "", categoryId: "cat" },
    ];
    return d;
  }

  function server(existingPortfolio: { mediaId: string }[] = []) {
    post.mockImplementation((url: string) => ok({ id: "x", url }));
    patch.mockImplementation(() => ok({}));
    get.mockImplementation((url: string) =>
      ok(url === "/service-provider/portfolio/me" ? existingPortfolio : [{ title: "Braids" }])
    );
  }

  it("saves the logo, the cover and each portfolio photo", async () => {
    server();
    const res = await completeSpOnboarding(draft());
    expect(res).toEqual({ ok: true, problems: [] });
    expect(patch).toHaveBeenCalledWith("/service-provider/profile/me", { logoMediaId: "logo-1", coverMediaId: "cover-1" });
    const added = post.mock.calls.filter((c) => c[0] === "/service-provider/portfolio").map((c) => c[1].mediaId);
    expect(added).toEqual(["p1", "p2"]);
  });

  it("can be run again without adding a photo twice", async () => {
    server([{ mediaId: "p1" }]);
    await completeSpOnboarding(draft());
    const added = post.mock.calls.filter((c) => c[0] === "/service-provider/portfolio").map((c) => c[1].mediaId);
    expect(added).toEqual(["p2"]);
  });

  it("says exactly which picture was not saved", async () => {
    server();
    patch.mockImplementation(() => fail("Upload your own image first"));
    const res = await completeSpOnboarding(draft());
    expect(res.ok).toBe(false);
    expect(res.problems.join(" ")).toMatch(/logo and cover/);
  });
});
