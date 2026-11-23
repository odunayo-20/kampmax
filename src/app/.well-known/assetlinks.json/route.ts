import { androidAssetLinks } from "@/lib/app-links";

/** Android app links. Served only once ANDROID_SHA256_FINGERPRINTS is set; until then app links open the website. */
export function GET() {
  const body = androidAssetLinks(process.env.ANDROID_SHA256_FINGERPRINTS);
  if (!body) return new Response("Not found", { status: 404 });
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
