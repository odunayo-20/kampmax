import { describe, expect, it } from "vitest";
import { optimizedImageUrl } from "../image-url";

describe("optimizedImageUrl", () => {
  it("returns the address unchanged", () => {
    expect(optimizedImageUrl("https://cdn.example.com/a.jpg", { width: 640 })).toBe("https://cdn.example.com/a.jpg");
    expect(optimizedImageUrl("/images/local.png", { width: 640 })).toBe("/images/local.png");
  });

  it("returns nothing for no picture", () => {
    expect(optimizedImageUrl(undefined, { width: 640 })).toBeUndefined();
    expect(optimizedImageUrl(null, { width: 640 })).toBeUndefined();
    expect(optimizedImageUrl("", { width: 640 })).toBeUndefined();
  });
});
