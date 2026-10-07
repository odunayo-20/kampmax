import Image from "next/image";
import { isOptimizableImage } from "@/lib/blog";
import { cn } from "@/lib/utils";
import { LogoIcon } from "@/components/ui/Logo";

interface BlogImageProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/**
 * Fills its (relatively positioned) parent. Uses next/image for hosts it is
 * configured to optimise and a lazy plain <img> for any other editor-supplied
 * URL, so an unexpected image host can never crash a page.
 */
export function BlogImage({ src, alt, sizes, priority, className }: BlogImageProps) {
  const classes = cn("absolute inset-0 h-full w-full object-cover", className);
  if (isOptimizableImage(src)) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={classes} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={classes}
    />
  );
}

/** Neutral stand-in when an article has no cover image. */
export function BlogImagePlaceholder({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="absolute inset-0 flex items-center justify-center bg-kampmax-navy"
    >
      <LogoIcon size={56} className="opacity-90" />
    </div>
  );
}
