import Link from "next/link";
import { ShieldCheck, Star } from "lucide-react";
import { Vendor } from "@/types";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";

interface VendorCardProps {
  vendor: Vendor;
  className?: string;
}

export function VendorCard({ vendor, className }: VendorCardProps) {
  return (
    <Link
      href={vendor.slug ? `/store/${vendor.slug}` : `/marketplace?vendor=${vendor.id}`}
      className={cn(
        "flex-shrink-0 w-[210px] bg-white rounded-2xl border border-neutral-200/90 p-3.5 shadow-2xs",
        "hover:border-primary-300 hover:shadow-md transition-all duration-200 group",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-2.5">
        <Avatar name={vendor.storeName} size="md" className="h-10 w-10 ring-1 ring-neutral-200" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-xs sm:text-sm font-bold text-neutral-900 group-hover:text-primary-600 transition-colors truncate">
              {vendor.storeName}
            </span>
            {vendor.verified && (
              <ShieldCheck className="h-3.5 w-3.5 text-primary-600 shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-medium">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
            <span className="font-bold text-neutral-800">{vendor.rating}</span>
            <span>·</span>
            <span>{vendor.totalSales} sales</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-neutral-100">
        {vendor.specialties.slice(0, 2).map((s) => (
          <span
            key={s}
            className="text-[10px] font-semibold px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-md truncate max-w-[90px]"
          >
            {s}
          </span>
        ))}
      </div>
    </Link>
  );
}
