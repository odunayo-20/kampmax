"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Star, MapPin, Verified, Eye, ShoppingBag, Check } from "lucide-react";
import { Product, ProductCondition } from "@/types";
import { cn, formatNaira } from "@/lib/utils";
import { isWishlisted, toggleWishlist } from "@/services/wishlist";
import { useCart } from "@/lib/cart-context";
import { isOutOfStock } from "@/lib/stock";

interface ProductCardProps {
  product: Product;
  vendorName?: string;
  vendorVerified?: boolean;
  className?: string;
  onQuickView?: (product: Product) => void;
}

function conditionColor(condition: ProductCondition) {
  return condition === "New"
    ? "bg-primary-50 text-primary-700 border border-primary-100"
    : "bg-accent-50 text-accent-700 border border-accent-100";
}

function discountPercent(original: number, current: number) {
  return Math.round(((original - current) / original) * 100);
}

export function ProductCard({
  product,
  vendorName,
  vendorVerified,
  className,
  onQuickView,
}: ProductCardProps) {
  const [saved, setSaved] = useState(() => isWishlisted(product.id));
  const [addedToast, setAddedToast] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { addItem } = useCart();

  const outOfStock = isOutOfStock(product);
  const hasDiscount = !!product.originalPrice && product.originalPrice > product.price;
  const imageSrc = product.images && product.images.length > 0 ? product.images[0] : null;

  function handleWishlistToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
    setSaved(!saved);
  }

  function handleQuickView(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product);
    }
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem(product, 1);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  }

  return (
    <Link
      href={`/marketplace/${product.id}`}
      className={cn(
        "bg-white rounded-[10px] border border-neutral-200 overflow-hidden group flex flex-col relative",
        "hover:border-neutral-300 hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)] transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1",
        className
      )}
    >
      <div className="relative aspect-[1/1] bg-neutral-50 overflow-hidden">
        {imageSrc && !imgError ? (
          <img
            src={imageSrc}
            alt={product.title}
            onError={() => setImgError(true)}
            className={cn(
              "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300",
              outOfStock && "opacity-50 grayscale"
            )}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400/50 bg-neutral-100">
            <svg className="w-10 h-10 mb-1 stroke-[1.25]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-[10px] text-neutral-400 font-medium">Kampmax</span>
          </div>
        )}

        {/* Top Badges */}
        {outOfStock && (
          <div className="absolute top-2 left-2 z-10">
            <span className="bg-neutral-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none shadow-sm">
              Out of stock
            </span>
          </div>
        )}
        {!outOfStock && hasDiscount && (
          <div className="absolute top-2 left-2 z-10">
            <span className="bg-error-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none shadow-sm">
              -{discountPercent(product.originalPrice!, product.price)}%
            </span>
          </div>
        )}

        {product.sponsored && (
          <div className="absolute bottom-2 left-2 z-10">
            <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-neutral-600 shadow-sm">
              Sponsored
            </span>
          </div>
        )}

        {/* Action Buttons Overlay on Hover */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10">
          <button
            onClick={handleWishlistToggle}
            aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={saved}
            className="p-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-neutral-200 hover:bg-white hover:scale-105 transition-all focus-visible:outline-none shadow-sm"
          >
            <Heart
              className={cn(
                "w-3.5 h-3.5 transition-colors",
                saved ? "fill-error-600 text-error-600" : "text-neutral-500 hover:text-error-600"
              )}
            />
          </button>

          {onQuickView && (
            <button
              onClick={handleQuickView}
              aria-label="Quick View"
              title="Quick View"
              className="p-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-neutral-200 hover:bg-white hover:scale-105 transition-all opacity-0 group-hover:opacity-100 focus-visible:outline-none shadow-sm"
            >
              <Eye className="w-3.5 h-3.5 text-neutral-600 hover:text-primary-600" />
            </button>
          )}
        </div>

        {/* Bottom Condition Badge */}
        <div className="absolute bottom-2 left-2">
          <span
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none border shadow-sm backdrop-blur-sm",
              conditionColor(product.condition)
            )}
          >
            {product.condition}
          </span>
        </div>
      </div>

      <div className="p-3 flex flex-col flex-1">
        {vendorName && (
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[11px] text-neutral-500 truncate">{vendorName}</span>
            {vendorVerified && <Verified className="w-3 h-3 text-primary-600 shrink-0" />}
          </div>
        )}

        <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2 leading-snug mb-1 group-hover:text-primary-600 transition-colors">
          {product.title}
        </h3>

        {product.location && (
          <div className="flex items-center gap-0.5 mb-1.5">
            <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
            <span className="text-[11px] text-neutral-500 truncate">{product.location}</span>
          </div>
        )}

        <div className="mt-auto pt-1">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-bold text-primary-900 tracking-tight">
                {formatNaira(product.price)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-neutral-400 line-through">
                  {formatNaira(product.originalPrice!)}
                </span>
              )}
            </div>

            {/* Quick Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              aria-label={outOfStock ? "Out of stock" : "Add to cart"}
              className={cn(
                "p-1.5 rounded-lg border transition-all shrink-0 flex items-center gap-1 text-xs font-semibold",
                outOfStock && "opacity-40 cursor-not-allowed hover:bg-neutral-50 hover:text-neutral-700 hover:border-neutral-200",
                addedToast
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-primary-600 hover:text-white hover:border-primary-600"
              )}
            >
              {addedToast ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                </>
              ) : (
                <ShoppingBag className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {(product.rating || product.viewCount) && (
            <div className="flex items-center gap-2 mt-1.5">
              {product.rating && (
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-[11px] font-medium text-neutral-900">
                    {product.rating}
                  </span>
                  {product.ratingCount && (
                    <span className="text-[11px] text-neutral-500">
                      ({product.ratingCount})
                    </span>
                  )}
                </div>
              )}
              {product.viewCount && (
                <span className="text-[11px] text-neutral-500">{product.viewCount} views</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
