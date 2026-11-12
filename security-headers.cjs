// @ts-check
/**
 * Browser security headers for the Kampmax web app. CommonJS on purpose: it is
 * loaded by next.config.ts and by the unit test, and this loads the same way in
 * every Node and Next version.
 *
 * Why the Content-Security-Policy is staged:
 *  - ENFORCED now (cannot break a page): no plugins/<object>, no <base> hijack,
 *    forms only post to ourselves, and nobody may frame the app.
 *  - REPORT-ONLY (full policy): the browser logs every load the policy would
 *    block, without blocking. This is the second line of defence against XSS: an
 *    injected script could not send data to an attacker's server, load their
 *    scripts, or embed their frames. Soak it on staging with the browser console
 *    open (look for "Content Security Policy" messages while using checkout, maps,
 *    uploads, blog embeds, the QR scanners and analytics). When it is quiet, move
 *    the report-only policy to enforced by setting CSP_ENFORCE=true.
 *
 * script-src keeps 'unsafe-inline' because Next.js injects inline scripts for
 * hydration; removing it needs per-request nonces (a proxy/middleware change that
 * also makes every page dynamic). The directives that matter most against data
 * theft (connect-src, img-src, frame-src, form-action) are strict regardless.
 */

/** @param {string | undefined} value */
function originOf(value) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/** @param {string | undefined} list */
function hostList(list) {
  return (list ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => `https://${h}`);
}

/**
 * @param {{ env?: Record<string, string | undefined>, isDev?: boolean }} [options]
 * @returns {{ enforced: string, full: string }}
 */
function buildCsp({ env = process.env, isDev = false } = {}) {
  const api = originOf(env.NEXT_PUBLIC_API_URL) ?? "http://localhost:4000";
  const posthog = originOf(env.NEXT_PUBLIC_POSTHOG_HOST) ?? "https://us.i.posthog.com";
  const media = hostList(env.NEXT_PUBLIC_MEDIA_HOSTS);

  const images = [
    "'self'",
    "data:",
    "blob:",
    api,
    "https://res.cloudinary.com",
    "https://images.unsplash.com",
    "https://*.r2.dev",
    "https://*.r2.cloudflarestorage.com",
    ...media,
  ];

  const full = [
    ["default-src", "'self'"],
    // Next.js needs inline scripts to hydrate; dev also needs eval for hot reload.
    ["script-src", "'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", ...images],
    ["font-src", "'self'", "data:"],
    [
      "connect-src",
      "'self'",
      api,
      // MapLibre loads its style, tiles, sprites and glyphs from MapTiler.
      "https://api.maptiler.com",
      posthog,
      ...(isDev ? ["ws://localhost:*", "http://localhost:*"] : []),
    ],
    ["media-src", "'self'", "blob:", ...images.filter((i) => i.startsWith("https://"))],
    // MapLibre runs its tile workers from blob: URLs.
    ["worker-src", "'self'", "blob:"],
    ["child-src", "blob:"],
    // Blog and job-post embeds, restricted to the providers the backend sanitizer allows.
    ["frame-src", "https://www.youtube-nocookie.com", "https://www.youtube.com", "https://player.vimeo.com"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
    ...(isDev ? [] : [["upgrade-insecure-requests"]]),
  ]
    .map((d) => d.join(" "))
    .join("; ");

  const enforced = "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
  return { enforced, full };
}

/**
 * The header list for next.config's `headers()`.
 * @param {{ env?: Record<string, string | undefined>, isDev?: boolean }} [options]
 * @returns {{ key: string, value: string }[]}
 */
function securityHeaders(options = {}) {
  const env = options.env ?? process.env;
  const { enforced, full } = buildCsp(options);
  const enforceAll = env.CSP_ENFORCE === "true";
  return [
    enforceAll
      ? { key: "Content-Security-Policy", value: full }
      : { key: "Content-Security-Policy", value: enforced },
    ...(enforceAll ? [] : [{ key: "Content-Security-Policy-Report-Only", value: full }]),
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      // camera=(self): the pickup and event-ticket QR scanners use the camera.
      // Blocking it for the app itself (camera=()) would break them in production.
      value: "camera=(self), microphone=(), geolocation=(self), payment=(), usb=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ];
}

module.exports = { buildCsp, securityHeaders };
