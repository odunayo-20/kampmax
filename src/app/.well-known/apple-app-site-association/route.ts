import { appleAssociation } from "@/lib/app-links";

/** iOS universal links. Served only once APPLE_TEAM_ID is set; until then app links open the website. */
export function GET() {
  const body = appleAssociation(process.env.APPLE_TEAM_ID);
  if (!body) return new Response("Not found", { status: 404 });
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
