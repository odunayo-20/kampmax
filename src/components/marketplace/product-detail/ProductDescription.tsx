"use client";

interface ProductDescriptionProps {
  description: string;
}

export function ProductDescription({ description }: ProductDescriptionProps) {
  return (
    <section className="rounded-[10px] border border-neutral-200 bg-white p-5">
      <h2 className="text-base font-bold text-neutral-900">About this product</h2>
      <p className="mt-3 text-sm leading-relaxed text-neutral-700 whitespace-pre-line">{description}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-neutral-700 list-disc list-inside marker:text-neutral-400">
        <li>Carefully inspected for campus marketplace standards</li>
        <li>Ready for pickup or hostel delivery</li>
        <li>Support from a verified campus seller</li>
        <li>Secure payment via Kampmax</li>
      </ul>
    </section>
  );
}