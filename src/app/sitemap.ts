import type { MetadataRoute } from "next";
import { getSiteBaseUrl } from "@/lib/utils";

/** Top-level public hubs. The blog publishes its own sitemap at /blog/sitemap.xml. */
const PUBLIC_HUBS: { path: string; priority: number }[] = [
  { path: "/marketplace", priority: 0.9 },
  { path: "/services", priority: 0.9 },
  { path: "/jobs", priority: 0.8 },
  { path: "/events", priority: 0.7 },
  { path: "/blog", priority: 0.8 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteBaseUrl();
  return PUBLIC_HUBS.map(({ path, priority }) => ({
    url: `${base}${path}`,
    changeFrequency: "daily",
    priority,
  }));
}
