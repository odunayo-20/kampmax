"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useCreatePromotion, useVendorPromotionFormContext } from "@/hooks/use-vendor-promotions";
import { PromotionForm } from "@/components/vendor-promotions/PromotionForm";

export default function VendorPromotionNewPage({ params }: { params: Promise<{}> }) {
  use(params);
  const router = useRouter();
  const contextQuery = useVendorPromotionFormContext();
  const create = useCreatePromotion();

  if (contextQuery.isPending) {
    return <div className="h-64 animate-pulse rounded-xl border border-kampmax-border bg-white" aria-hidden />;
  }
  if (contextQuery.isError || !contextQuery.data) {
    return (
      <div className="rounded-xl border border-error-200 bg-error-50 p-6 text-center">
        <p className="text-sm font-medium text-error-700">Couldn&apos;t load your products and categories.</p>
        <button type="button" onClick={() => contextQuery.refetch()} className="mt-2 text-xs font-semibold text-error-700 underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/vendor/promotions"
        className="inline-flex items-center gap-1 text-xs font-medium text-kampmax-text-secondary hover:text-kampmax-blue"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to promotions
      </Link>

      <PromotionForm
        context={contextQuery.data}
        title="New promotion"
        submitLabel="Save draft"
        onSubmit={async (input) => {
          const result = await create.mutateAsync(input);
          if (result.ok && result.promotion) {
            router.push(`/vendor/promotions/${result.promotion.id}`);
          }
          return result;
        }}
      />
    </div>
  );
}
