"use client";

interface ProductDescriptionProps {
  description: string;
}

export function ProductDescription({ description }: ProductDescriptionProps) {
  return (
    <section className="rounded-[10px] border border-neutral-200 bg-white p-5">
      <h2 className="text-base font-bold text-neutral-900">About this product</h2>
      <p className="mt-3 text-sm leading-relaxed text-neutral-700 whitespace-pre-line">{description}</p>
    </section>
  );
}