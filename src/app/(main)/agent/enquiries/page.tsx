import { AccommodationEnquiries } from "@/components/accommodation/AccommodationEnquiries";

/** `?open=<id>` opens that enquiry, for links from a notification. */
export default async function AgentEnquiriesPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const { open } = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-kampmax-text">Enquiries</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">Students asking about your listings. Reply, and answer their visit requests.</p>
      </div>
      <AccommodationEnquiries initialId={open} />
    </div>
  );
}
