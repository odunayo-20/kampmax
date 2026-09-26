import Link from "next/link";
import Image from "next/image";
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
        "flex-shrink-0 w-[160px] bg-white rounded-lg border border-kampmax-border overflow-hidden",
        "hover:shadow-md transition-shadow duration-200",
        className
      )}
    >
      <div className="aspect-square bg-kampmax-muted relative overflow-hidden">
        <Image
          src={product.images[0] || "/placeholder-product.svg"}
          alt={product.title}
          fill
          className={cn("object-cover", outOfStock && "opacity-50 grayscale")}
          sizes="160px"
        />
        {outOfStock && (
          <div className="absolute top-1.5 left-1.5 bg-neutral-900 text-white text-[9px] font-bold px-1 py-0.5 rounded">
            Out of stock
          </div>
        )}
        {!outOfStock && hasDiscount && (
          <div className="absolute top-1.5 left-1.5 bg-kampmax-error text-white text-[9px] font-bold px-1 py-0.5 rounded">
            {Math.round(
              ((product.originalPrice! - product.price) / product.originalPrice!) * 100
            )}% OFF
          </div>
        )}
      </div>
      <div className="p-2 space-y-1">
        <h3 className="text-xs font-medium text-kampmax-text line-clamp-2 leading-tight">
          {product.title}
        </h3>
        <p className="text-xs font-bold text-kampmax-navy">
          {formatNaira(product.price)}
        </p>
        {hasDiscount && (
          <p className="text-[10px] text-kampmax-text-secondary line-through">
            {formatNaira(product.originalPrice!)}
          </p>
        )}
        <div className="flex items-center justify-between">
          <ConditionBadge condition={product.condition} />
          {product.location && (
            <span className="text-[9px] text-kampmax-text-secondary truncate ml-1">
              {product.location}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
