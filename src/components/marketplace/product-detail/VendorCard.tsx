"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, MessageCircle, MapPin, ShieldCheck, Star } from "lucide-react";
import { Avatar, Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { openVendorConversation } from "@/services/messages-api";

interface VendorCardProps {
  vendor: {
    id: string;
    userId?: string;
    storeName: string;
    verified: boolean;
    rating: number;
    totalSales: number;
    responseTime?: string;
    slug?: string;
  } | null | undefined;
  campusName: string;
  productLocation?: string;
  productId?: string;
  productTitle?: string;
  productPrice?: number;
  productImage?: string;
}

export function VendorCard({
  vendor,
  campusName,
  productLocation,
  productId,
  productTitle,
  productPrice,
  productImage,
}: VendorCardProps) {
  const router = useRouter();
  const { user, status } = useAuth();

  if (!vendor) return null;

  async function handleMessageVendor() {
    if (status !== "authenticated" || !user) {
      router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    try {
      const conversationId = await openVendorConversation(vendor!.id);
      // Build a query string so the chat page can auto-populate the product context
      const params = new URLSearchParams();
      if (productId) params.set("productId", productId);
      if (productTitle) params.set("productTitle", productTitle);
      if (productPrice !== undefined) params.set("productPrice", String(productPrice));
      if (productImage) params.set("productImage", productImage);
      const qs = params.toString();
      router.push(`/chat/${conversationId}${qs ? `?${qs}` : ""}`);
    } catch {
      router.push("/chat");
    }
  }

  return (
    <div className="rounded-[10px] border border-neutral-200 bg-white p-4">
      <p className="text-xs font-semibold tracking-wide uppercase text-neutral-500 mb-3">
        Sold by
      </p>
      <div className="flex items-start gap-3">
        <Avatar name={vendor.storeName} size="md" className="h-10 w-10" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-neutral-900 truncate">
              {vendor.storeName}
            </span>
            {vendor.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 border border-primary-100 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700">
                <ShieldCheck className="h-3 w-3" /> Verified Seller
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-600 mt-0.5">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-accent-500 text-accent-500" />
              {vendor.rating.toFixed(1)} Seller Rating
            </span>
            <span className="h-1 w-1 rounded-full bg-neutral-300" aria-hidden />
            <span>{vendor.totalSales} Sales</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-600 mt-1">
            <MapPin className="h-3.5 w-3.5 text-primary-600" />
            <span>{campusName}</span>
            {vendor.responseTime && (
              <>
                <span className="h-1 w-1 rounded-full bg-neutral-300" aria-hidden />
                <span>Replies {vendor.responseTime}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          href={vendor.slug ? `/store/${vendor.slug}` : `/marketplace?vendor=${vendor.id}`}
          className="flex-1"
        >
          <Button variant="outline" size="sm" className="w-full">
            <Store className="h-4 w-4 mr-1.5" /> Visit Store
          </Button>
        </Link>
        <div className="flex-1">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={handleMessageVendor}
          >
            <MessageCircle className="h-4 w-4 mr-1.5" /> Message Seller
          </Button>
        </div>
      </div>
    </div>
  );
}