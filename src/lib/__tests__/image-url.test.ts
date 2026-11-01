import { describe, expect, it } from "vitest";
import { optimizedImageUrl } from "../image-url";

const base = "https://res.cloudinary.com/demo/image/upload";

describe("optimizedImageUrl", () => {
  it("asks Cloudinary for a cropped, auto-format thumbnail", () => {
    expect(optimizedImageUrl(`${base}/v123/kampmax/a.jpg`, { width: 640, aspect: "4:3" })).toBe(
      `${base}/w_640,ar_4:3,c_fill,g_auto,f_auto,q_auto/v123/kampmax/a.jpg`
    );
  });

  it("keeps the original shape, only capping the width, when no aspect is given", () => {
    expect(optimizedImageUrl(`${base}/v123/kampmax/a.jpg`, { width: 1200 })).toBe(
      `${base}/w_1200,c_limit,f_auto,q_auto/v123/kampmax/a.jpg`
    );
  });

  it("leaves other addresses alone", () => {
    expect(optimizedImageUrl("https://cdn.example.com/a.jpg", { width: 640 })).toBe("https://cdn.example.com/a.jpg");
    expect(optimizedImageUrl("/images/local.png", { width: 640 })).toBe("/images/local.png");
  });

  it("does not stack a second transformation on one that is already there", () => {
    const already = `${base}/w_300,c_fill/v123/a.jpg`;
    expect(optimizedImageUrl(already, { width: 640 })).toBe(already);
  });

  it("returns nothing for no picture", () => {
    expect(optimizedImageUrl(undefined, { width: 640 })).toBeUndefined();
    expect(optimizedImageUrl(null, { width: 640 })).toBeUndefined();
    expect(optimizedImageUrl("", { width: 640 })).toBeUndefined();
  });
});
