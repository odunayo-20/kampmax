import { redirect } from "next/navigation";

// The public provider page lives with the rest of the services marketplace and
// is served from live data; old links to this address land there.
export default async function LegacyProviderProfileRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/services/providers/${encodeURIComponent(slug)}`);
}
