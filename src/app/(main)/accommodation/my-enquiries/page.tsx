import Link from "next/link";
import { MyHousingEnquiries } from "@/components/accommodation/MyHousingEnquiries";

/** `?open=<id>` opens that enquiry, for links from a notification or a listing page. */
export default async function MyAccommodationEnquiriesPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const { open } = await searchParams;
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/accommodation" className="text-sm text-kampmax-blue hover:underline">← Find a place</Link>
      <h1 className="mt-3 text-3xl font-bold text-kampmax-text">My housing enquiries</h1>
      <p className="mb-6 mt-2 text-sm text-kampmax-text-secondary">Your messages with agents and any visits you have asked for.</p>
      <MyHousingEnquiries initialId={open} />
    </main>
  );
}
