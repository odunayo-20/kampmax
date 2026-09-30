import Link from "next/link";
import { Product } from "@/types";
import { ConditionBadge } from "@/components/atoms/Badge";
import { formatNaira, cn } from "@/lib/utils";
import { isOutOfStock } from "@/lib/stock";

interface ProductCardHorizontalProps {
  product: Product;
  className?: string;
}

export function ProductCardHorizontal({ product, className }: ProductCardHorizontalProps) {
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const outOfStock = isOutOfStock(product);

  return (
    <Link
      href={`/marketplace/${product.id}`}
      className={cn(
        "flex-shrink-0 w-[170px] bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-2xs group",
        "hover:border-primary-300 hover:shadow-md transition-all duration-200",
        className
      )}
    >
      <div className="aspect-square bg-neutral-100 relative overflow-hidden">
        <img
          src={product.images[0] || "/placeholder-product.svg"}
          alt={product.title}
          loading="lazy"
          className={cn(
            "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300",
            outOfStock && "opacity-50 grayscale"
          )}
        />
        {outOfStock && (
          <div className="absolute top-2 left-2 bg-neutral-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
            Out of stock
          </div>
        )}
        {!outOfStock && hasDiscount && (
          <div className="absolute top-2 left-2 bg-rose-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shadow-sm">
            {Math.round(
              ((product.originalPrice! - product.price) / product.originalPrice!) * 100
            )}% OFF
          </div>
        )}
      </div>

      <div className="p-3 space-y-1">
        <h3 className="text-xs font-bold text-neutral-900 line-clamp-2 leading-tight group-hover:text-primary-600 transition-colors">
          {product.title}
        </h3>
        <div className="flex items-baseline gap-1 pt-0.5">
          <p className="text-xs sm:text-sm font-extrabold text-neutral-900">
            {formatNaira(product.price)}
          </p>
          {hasDiscount && (
            <p className="text-[10px] text-neutral-400 line-through">
              {formatNaira(product.originalPrice!)}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
          <ConditionBadge condition={product.condition} />
          {product.location && (
            <span className="text-[10px] text-neutral-400 truncate ml-1">
              {product.location}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
