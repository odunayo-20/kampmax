import { describe, expect, it } from "vitest";
import { buildCsp, securityHeaders } from "../../security-headers.cjs";

const header = (headers: { key: string; value: string }[], key: string) => headers.find((h) => h.key === key)?.value;
const env = {
  NEXT_PUBLIC_API_URL: "https://api.kampmax.com/api/v1",
  NEXT_PUBLIC_MEDIA_HOSTS: "cdn.kampmax.com, pub-abc.r2.dev",
  NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
};

describe("security headers", () => {
  it("lets the QR scanners use the camera (camera=() would break them)", () => {
    const policy = header(securityHeaders({ env }), "Permissions-Policy") ?? "";
    expect(policy).toContain("camera=(self)");
    expect(policy).not.toContain("camera=()");
    expect(policy).toContain("microphone=()");
  });

  it("enforces the safe baseline and only reports the full policy by default", () => {
    const h = securityHeaders({ env });
    const enforced = header(h, "Content-Security-Policy") ?? "";
    expect(enforced).toContain("frame-ancestors 'none'");
    expect(enforced).toContain("object-src 'none'");
    expect(enforced).toContain("base-uri 'self'");
    expect(enforced).toContain("form-action 'self'");
    expect(enforced).not.toContain("script-src"); // cannot break a page yet
    expect(header(h, "Content-Security-Policy-Report-Only")).toContain("script-src");
  });

  it("enforces the whole policy, with no duplicate report-only header, when CSP_ENFORCE=true", () => {
    const h = securityHeaders({ env: { ...env, CSP_ENFORCE: "true" } });
    expect(header(h, "Content-Security-Policy")).toContain("script-src");
    expect(header(h, "Content-Security-Policy-Report-Only")).toBeUndefined();
  });

  describe("the full policy", () => {
    const { full } = buildCsp({ env });
    const directive = (name: string) => full.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

    it("only lets scripts talk to the API, MapTiler and analytics (stops XSS data theft)", () => {
      const connect = directive("connect-src");
      expect(connect).toContain("https://api.kampmax.com");
      expect(connect).toContain("https://api.maptiler.com");
      expect(connect).toContain("https://eu.i.posthog.com");
      expect(connect).not.toMatch(/ \*( |$)/);
      expect(connect).not.toContain("http://localhost");
    });

    it("limits images to the API, the storage hosts and the configured media hosts", () => {
      const img = directive("img-src");
      for (const host of ["https://api.kampmax.com", "https://res.cloudinary.com", "https://cdn.kampmax.com", "https://pub-abc.r2.dev"]) {
        expect(img).toContain(host);
      }
      expect(img).not.toMatch(/ \*( |$)/);
    });

    it("only allows the video providers the blog sanitizer allows, as frames", () => {
      expect(directive("frame-src")).toBe(
        "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com"
      );
    });

    it("allows map workers, forbids plugins and framing, and upgrades http in production", () => {
      expect(directive("worker-src")).toContain("blob:");
      expect(directive("object-src")).toBe("object-src 'none'");
      expect(directive("frame-ancestors")).toBe("frame-ancestors 'none'");
      expect(full).toContain("upgrade-insecure-requests");
    });

    it("allows eval and local hot-reload only in development", () => {
      expect(directive("script-src")).not.toContain("unsafe-eval");
      const dev = buildCsp({ env, isDev: true }).full;
      expect(dev).toContain("'unsafe-eval'");
      expect(dev).toContain("ws://localhost");
      expect(dev).not.toContain("upgrade-insecure-requests");
    });

    it("falls back to the local API and the default analytics host when unset", () => {
      const defaults = buildCsp({ env: {} }).full;
      expect(defaults).toContain("http://localhost:4000");
      expect(defaults).toContain("https://us.i.posthog.com");
    });
  });
});
