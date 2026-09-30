"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Loader2 } from "lucide-react";

interface QrImageProps {
  value: string;
  size?: number;
  /** Notified with the PNG data URL once drawn (used by "Save to gallery"). */
  onReady?: (dataUrl: string) => void;
  className?: string;
}

/** Renders a QR code as an image. The value never leaves the browser. */
export function QrImage({ value, size = 220, onReady, className }: QrImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setFailed(false);
    QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: size * 2,
      color: { dark: "#0B2345", light: "#ffffff" },
    })
      .then((url) => {
        if (cancelled) return;
        setSrc(url);
        onReady?.(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // onReady is intentionally not a dependency: callers pass inline setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, size]);

  if (failed) {
    return (
      <p role="alert" className="text-xs text-kampmax-error">
        Couldn&apos;t draw the QR code.
      </p>
    );
  }
  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center text-kampmax-text-muted"
      >
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Ticket QR code"
      width={size}
      height={size}
      className={className}
    />
  );
}
