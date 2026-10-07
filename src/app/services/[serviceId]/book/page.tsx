import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { fetchServiceDetail } from "@/services/service-marketplace";
import { BookingFlow } from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Book a service | Kampmax",
  robots: { index: false, follow: false },
};

interface BookPageProps {
  params: Promise<{ serviceId: string }>;
}

export default async function BookPage({ params }: BookPageProps) {
  const { serviceId } = await params;
  const detail = await fetchServiceDetail(serviceId);
  if (!detail) notFound();

  const { service } = detail;
  // Quote-only services are quoted via the detail page — no booking flow.
  if (service.pricingModel === "quote") redirect(`/services/${serviceId}`);

  return <BookingFlow serviceId={service.id} />;
}