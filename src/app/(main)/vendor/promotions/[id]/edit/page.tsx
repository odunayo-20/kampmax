"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BadgePercent } from "lucide-react";
import {
  useUpdatePromotion,
  useVendorPromotion,
  useVendorPromotionFormContext,
} from "@/hooks/use-vendor-promotions";
import { PromotionForm } from "@/components/vendor-promotions/PromotionForm";

export default function VendorPromotionEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const contextQuery = useVendorPromotionFormContext();
  const promotionQuery = useVendorPromotion(id);
  const update = useUpdatePromotion(id);

  if (contextQuery.isPending || promotionQuery.isPending) {
    return <div className="h-64 animate-pulse rounded-xl border border-kampmax-border bg-white" aria-hidden />;
  }

  const promotion = promotionQuery.data;
  if (promotionQuery.isError || contextQuery.isError || !promotion || !contextQuery.data) {
    return (
      <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center">
        <BadgePercent className="mx-auto mb-3 h-10 w-10 text-kampmax-text-secondary" aria-hidden />
        <p className="text-sm font-medium text-kampmax-text">Promotion not found</p>
        <p className="mt-1 text-xs text-kampmax-text-secondary">This promotion may not belong to your store.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href={`/vendor/promotions/${promotion.id}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-kampmax-text-secondary hover:text-kampmax-blue"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to {promotion.title}
      </Link>

      <PromotionForm
        context={contextQuery.data}
        initial={promotion}
        title={`Edit — ${promotion.title}`}
        submitLabel="Save changes"
        onSubmit={async (input) => {
          const result = await update.mutateAsync(input);
          if (result.ok) {
            router.push(`/vendor/promotions/${id}`);
          }
          return result;
        }}
      />
    </div>
  );
}
