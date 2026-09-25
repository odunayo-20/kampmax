"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Heart,
  Star,
  ShoppingBag,
  MessageCircle,
  MapPin,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Check,
} from "lucide-react";
import { Product } from "@/types";
import { formatNaira } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { isWishlisted, toggleWishlist } from "@/services/wishlist";
import { getVendorById } from "@/services/users";
import { openVendorConversation } from "@/services/messages-api";
import { addRecentlyViewed } from "@/services/recently-viewed";
import { Button } from "@/components/ui";

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
}

export function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const { user, status } = useAuth();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [liked, setLiked] = useState(false);
  const [addedToast, setAddedToast] = useState(false);

  useEffect(() => {
    if (product) {
      setLiked(isWishlisted(product.id));
      setActiveImageIndex(0);
      setQuantity(1);
      addRecentlyViewed(product);
    }
  }, [product]);

  // Lock body scroll when open
  useEffect(() => {
    if (!product) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [product]);

  if (!product) return null;

  const vendor = getVendorById(product.vendorId);
  const images = product.images && product.images.length > 0 ? product.images : [];
  const currentImage = images[activeImageIndex] || null;
  const hasDiscount = !!product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  const inStock = product.stock === undefined || product.stock > 0;
  const lowStock = product.stock !== undefined && product.stock > 0 && product.stock <= 5;

  function handleWishlistToggle(e: React.MouseEvent) {
    e.stopPropagation();
    toggleWishlist(product!.id);
    setLiked(!liked);
  }

  function handleAddToCart() {
    addItem(product!, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  }

  async function handleMessageVendor() {
    if (status !== "authenticated" || !user) {
      router.push(`/login?returnTo=${encodeURIComponent(`/marketplace/${product!.id}`)}`);
      return;
    }
    try {
      const conversationId = await openVendorConversation(product!.vendorId);
      const params = new URLSearchParams();
      params.set("productId", product!.id);
      params.set("productTitle", product!.title);
      params.set("productPrice", String(product!.price));
      if (images[0]) params.set("productImage", images[0]);
      router.push(`/chat/${conversationId}?${params.toString()}`);
    } catch {
      router.push("/chat");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-neutral-200 p-5 md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Image Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden flex items-center justify-center group">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.title}
                  className="w-full h-full object-cover transition-all duration-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-neutral-400">
                  <ShoppingBag className="w-12 h-12 mb-2 stroke-[1.25]" />
                  <span className="text-xs">No image available</span>
                </div>
              )}

              {/* Discount Badge */}
              {hasDiscount && (
                <span className="absolute top-3 left-3 bg-error-600 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-sm">
                  -{discountPercent}% OFF
                </span>
              )}

              {/* Wishlist Button */}
              <button
                onClick={handleWishlistToggle}
                aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
                className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-md shadow-md hover:bg-white transition-colors"
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    liked ? "fill-error-600 text-error-600" : "text-neutral-600"
                  }`}
                />
              </button>

              {/* Gallery Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white text-neutral-700 shadow transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white text-neutral-700 shadow transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail selector */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      activeImageIndex === idx
                        ? "border-primary-600 ring-2 ring-primary-600/20"
                        : "border-neutral-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Details */}
          <div className="flex flex-col h-full justify-between space-y-4">
            <div>
              {/* Vendor line */}
              {vendor && (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs font-medium text-neutral-500">Sold by</span>
                  <Link
                    href={vendor.slug ? `/store/${vendor.slug}` : `/marketplace?vendor=${vendor.id}`}
                    className="text-xs font-bold text-primary-700 hover:underline inline-flex items-center gap-1"
                    onClick={onClose}
                  >
                    {vendor.storeName}
                    {vendor.verified && <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />}
                  </Link>
                </div>
              )}

              <h2 className="text-lg font-bold text-neutral-900 leading-snug mb-2">
                {product.title}
              </h2>

              {/* Price & Rating */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-xl font-extrabold text-primary-900">
                  {formatNaira(product.price)}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-neutral-400 line-through">
                    {formatNaira(product.originalPrice!)}
                  </span>
                )}

                {product.rating && (
                  <div className="flex items-center gap-1 ml-auto text-xs font-semibold text-neutral-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{product.rating}</span>
                    {product.ratingCount && (
                      <span className="text-neutral-400">({product.ratingCount})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200">
                  {product.condition}
                </span>

                {product.location && (
                  <span className="text-xs font-medium text-neutral-600 inline-flex items-center gap-1 bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-200">
                    <MapPin className="w-3 h-3 text-neutral-400" />
                    {product.location}
                  </span>
                )}

                {lowStock && (
                  <span className="text-xs font-bold text-error-700 bg-error-50 px-2 py-0.5 rounded-md border border-error-200">
                    Only {product.stock} left!
                  </span>
                )}

                {!inStock && (
                  <span className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Description Snippet */}
              <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed mb-4">
                {product.description}
              </p>
            </div>

            {/* Quantity and Actions */}
            <div className="space-y-3 pt-3 border-t border-neutral-100">
              {/* Quantity Selector */}
              {inStock && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-neutral-700">Quantity</span>
                  <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="px-2.5 py-1 text-sm font-bold text-neutral-700 hover:bg-neutral-200 disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="px-3 text-xs font-semibold text-neutral-900">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="px-2.5 py-1 text-sm font-bold text-neutral-700 hover:bg-neutral-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Success Toast */}
              {addedToast && (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Added {quantity} item{quantity > 1 ? "s" : ""} to cart!
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleAddToCart}
                  disabled={!inStock}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Add to Cart
                </Button>

                <Button
                  onClick={handleMessageVendor}
                  variant="outline"
                  className="px-3 border-neutral-200 hover:bg-neutral-50 font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-neutral-700"
                >
                  <MessageCircle className="w-4 h-4 text-primary-600" />
                  Message
                </Button>
              </div>

              {/* Full Details link */}
              <div className="text-center pt-1">
                <Link
                  href={`/marketplace/${product.id}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800 hover:underline"
                >
                  View full product details <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
