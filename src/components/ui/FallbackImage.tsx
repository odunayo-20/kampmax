"use client";

import { useState, type ReactNode } from "react";
import Image, { type ImageProps } from "next/image";

/**
 * An image that shows `fallback` (a neutral placeholder) if the picture can't be loaded,
 * instead of the browser's broken-image icon and alt text. A slow or unreachable image
 * host, a deleted file or a bad address all end up here.
 */
export function FallbackImage({ fallback, onError, ...props }: ImageProps & { fallback: ReactNode }) {
  // Remember which address failed, so a new `src` gets a fresh try.
  const [failedSrc, setFailedSrc] = useState<unknown>(null);
  if (failedSrc === props.src) return <>{fallback}</>;

  return (
    <Image
      {...props}
      onError={(event) => {
        setFailedSrc(props.src);
        onError?.(event);
      }}
    />
  );
}
