import type { MetadataRoute } from "next";
import { getSiteBaseUrl } from "@/lib/utils";

/**
 * Crawl rules. Public content (blog, marketplace, services, jobs, profiles) is
 * open; the admin console, API and signed-in account areas are not.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/cart", "/checkout", "/orders", "/profile", "/pay", "/vendor", "/employer", "/freelancer", "/service-provider"],
      },
    ],
    sitemap: [`${base}/sitemap.xml`, `${base}/blog/sitemap.xml`],
  };
}
