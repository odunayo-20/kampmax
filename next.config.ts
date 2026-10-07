import type { NextConfig } from "next";

// Extra hosts uploaded pictures are served from (an S3/R2 bucket or CDN), comma-separated,
// e.g. NEXT_PUBLIC_MEDIA_HOSTS=cdn.example.com,pub-abc123.r2.dev
const extraMediaHosts = (process.env.NEXT_PUBLIC_MEDIA_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean)
  .map((hostname) => ({ protocol: "https" as const, hostname }));

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...extraMediaHosts,
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Locally stored uploads in development (backend STORAGE_PROVIDER=local).
      { protocol: "http", hostname: "localhost" },
    ],
  },
  async headers() {
    // Security hardening (Module 52). CSP is intentionally omitted:
    // Next.js 16 routes inline scripts/styles that would break under a
    // strict default-src policy. A nonce-based CSP belongs at the edge /
    // reverse proxy (see KAMPUSMAX_SECURITY_AUDIT.md). HSTS is only
    // honored by browsers over HTTPS, so it is safe in local dev.
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
