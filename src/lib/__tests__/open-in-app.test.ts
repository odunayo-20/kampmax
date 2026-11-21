import { describe, expect, it } from "vitest";
import { appStoreUrl, openInAppHref, phonePlatform } from "../open-in-app";

const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36";
const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36";

describe("phonePlatform", () => {
  it("tells Android, iPhone and computers apart", () => {
    expect(phonePlatform(ANDROID_UA)).toBe("android");
    expect(phonePlatform(IPHONE_UA)).toBe("ios");
    expect(phonePlatform(DESKTOP_UA)).toBe("other");
  });
});

describe("openInAppHref", () => {
  it("uses an intent link on Android so a missing app leads to the store", () => {
    expect(openInAppHref({ kind: "product", id: "p-1" }, "android")).toBe(
      "intent://product/p-1#Intent;scheme=kampmax;package=com.kampmax.app;end"
    );
    expect(
      openInAppHref({ kind: "vendor", id: "v1" }, "android", "https://play.google.com/store/apps/details?id=com.kampmax.app")
    ).toBe(
      "intent://vendor/v1#Intent;scheme=kampmax;package=com.kampmax.app;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.kampmax.app;end"
    );
  });

  it("uses the app's own scheme on iPhone", () => {
    expect(openInAppHref({ kind: "vendor", id: "v1" }, "ios")).toBe("kampmax://vendor/v1");
  });

  it("offers nothing on a computer or for an odd id", () => {
    expect(openInAppHref({ kind: "product", id: "p1" }, "other")).toBeNull();
    expect(openInAppHref({ kind: "product", id: "../x" }, "ios")).toBeNull();
    expect(openInAppHref({ kind: "product", id: "" }, "android")).toBeNull();
  });
});

describe("appStoreUrl", () => {
  const env = { android: " https://play.google.com/x ", ios: "javascript:alert(1)" };
  it("only uses an https store address for the visitor's phone", () => {
    expect(appStoreUrl("android", env)).toBe("https://play.google.com/x");
    expect(appStoreUrl("ios", env)).toBeNull();
    expect(appStoreUrl("other", env)).toBeNull();
    expect(appStoreUrl("android", {})).toBeNull();
  });
});
