import { describe, expect, it } from "vitest";
import robots from "../robots";
import sitemap from "../sitemap";

describe("robots.txt", () => {
  const config = robots();
  const rule = Array.isArray(config.rules) ? config.rules[0] : config.rules;

  it("keeps the admin console, API and account areas out of search engines", () => {
    const disallow = ([] as string[]).concat(rule.disallow ?? []);
    for (const path of ["/admin", "/api/", "/checkout", "/profile", "/orders"]) {
      expect(disallow).toContain(path);
    }
  });

  it("leaves the blog and public hubs crawlable", () => {
    expect(rule.allow).toBe("/");
    const disallow = ([] as string[]).concat(rule.disallow ?? []);
    expect(disallow.some((p) => "/blog".startsWith(p) || "/marketplace".startsWith(p))).toBe(false);
  });

  it("advertises both sitemaps", () => {
    const maps = ([] as string[]).concat(config.sitemap ?? []);
    expect(maps.some((u) => u.endsWith("/sitemap.xml") && !u.includes("/blog/"))).toBe(true);
    expect(maps.some((u) => u.endsWith("/blog/sitemap.xml"))).toBe(true);
  });
});

describe("root sitemap", () => {
  it("lists the public hubs with absolute URLs", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.every((u) => /^https?:\/\//.test(u))).toBe(true);
    expect(urls.some((u) => u.endsWith("/blog"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/marketplace"))).toBe(true);
    expect(urls.some((u) => u.includes("/admin"))).toBe(false);
  });
});
