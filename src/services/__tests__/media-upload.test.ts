import { afterEach, describe, expect, it, vi } from "vitest";
import { mediaUrlProblem, uploadFileDirect } from "../media";

describe("mediaUrlProblem", () => {
  it("accepts a public https address", () => {
    expect(mediaUrlProblem("https://res.cloudinary.com/demo/image/upload/a.webp", "kampmax.app")).toBeNull();
  });

  it("refuses a private address when the site is not running locally", () => {
    expect(mediaUrlProblem("http://localhost:4000/media/product/a.jpg", "kampmax.app")).toMatch(/private address \(localhost:4000\)/);
    expect(mediaUrlProblem("http://127.0.0.1:4000/media/a.jpg", "kampmax.app")).toMatch(/private address/);
  });

  it("allows a local address while developing locally", () => {
    expect(mediaUrlProblem("http://localhost:4000/media/a.jpg", "localhost")).toBeNull();
  });

  it("refuses a bare file key with no web address", () => {
    expect(mediaUrlProblem("product/1700_photo.jpg", "kampmax.app")).toMatch(/without a full web address/);
  });
});

describe("uploadFileDirect with a badly configured server", () => {
  afterEach(() => vi.unstubAllGlobals());

  const respond = (url: string | null) =>
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ data: { id: "m1", url, originalFilename: "a.jpg", mimeType: "image/jpeg", sizeBytes: 10 } }),
      })
    );
  const file = new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" });

  it("reports a clear error instead of returning an address that will never load", async () => {
    vi.stubGlobal("window", { location: { hostname: "kampmax.app" } });
    respond("http://localhost:4000/media/product/a.jpg");
    const { data, error } = await uploadFileDirect(file, "product");
    expect(data).toBeNull();
    expect(error?.message).toMatch(/media storage settings/);
  });

  it("returns the address when it is usable", async () => {
    vi.stubGlobal("window", { location: { hostname: "kampmax.app" } });
    respond("https://res.cloudinary.com/demo/a.webp");
    const { data, error } = await uploadFileDirect(file, "product");
    expect(error).toBeNull();
    expect(data?.url).toBe("https://res.cloudinary.com/demo/a.webp");
  });
});
