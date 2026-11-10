import Link from "next/link";
import { AccommodationEnquiries } from "@/components/accommodation/AccommodationEnquiries";

export default function MyAccommodationEnquiriesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/accommodation" className="text-sm text-kampmax-blue hover:underline">← Find accommodation</Link>
      <h1 className="mt-3 text-3xl font-bold text-kampmax-text">My accommodation enquiries</h1>
      <p className="mb-6 mt-2 text-sm text-kampmax-text-secondary">Keep messages and inspection arrangements on Kampmax.</p>
      <AccommodationEnquiries role="USER" />
    </main>
  );
}
