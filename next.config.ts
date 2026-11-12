import type { NextConfig } from "next";
import pkg from "./package.json";
import { securityHeaders } from "./security-headers.cjs";

// Extra hosts uploaded pictures are served from (an S3/R2 bucket or CDN), comma-separated,
// e.g. NEXT_PUBLIC_MEDIA_HOSTS=cdn.example.com,pub-abc123.r2.dev
const extraMediaHosts = (process.env.NEXT_PUBLIC_MEDIA_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean)
  .map((hostname) => ({ protocol: "https" as const, hostname }));

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
  images: {
    remotePatterns: [
      ...extraMediaHosts,
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.r2.dev" },
      // Locally stored uploads in development (backend STORAGE_PROVIDER=local).
      { protocol: "http", hostname: "localhost" },
    ],
  },
  async headers() {
    // Security headers and the staged Content-Security-Policy live in
    // security-headers.cjs (see its comments for the rollout plan).
    return [
      {
        source: "/(.*)",
        headers: securityHeaders({ isDev: process.env.NODE_ENV !== "production" }),
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/accommodation/agent/onboarding",
        destination: "/onboarding/agent",
        permanent: false,
      },
      // A payment gateway return to the old address carries the payment reference
      // (the query string is kept), so the billing page can confirm the payment.
      {
        source: "/accommodation/agent",
        has: [{ type: "query" as const, key: "reference" }],
        destination: "/agent/billing",
        permanent: false,
      },
      // A payment gateway return to the old address carries the payment reference
      // (the query string is kept), so the billing page can confirm the payment.
      {
        source: "/accommodation/agent",
        has: [{ type: "query" as const, key: "trxref" }],
        destination: "/agent/billing",
        permanent: false,
      },
      {
        source: "/accommodation/agent",
        destination: "/agent",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
