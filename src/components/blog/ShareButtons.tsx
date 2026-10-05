"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { shareLinks } from "@/lib/blog";

interface ShareButtonsProps {
  url: string;
  title: string;
}

const btn =
  "inline-flex h-10 items-center justify-center rounded-md border border-kampmax-border bg-white px-3.5 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue";

/**
 * Share links are plain anchors (work without JS and are crawler-safe); only
 * "Copy link" needs the browser. Result is announced to screen readers.
 */
export function ShareButtons({ url, title }: ShareButtonsProps) {
  const links = shareLinks(url, title);
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 2500);
  }

  const external = { target: "_blank", rel: "noopener noreferrer" } as const;
  return (
    <section aria-labelledby="share-heading">
      <h2 id="share-heading" className="mb-2 text-sm font-semibold text-kampmax-text">
        Share this article
      </h2>
      <div className="flex flex-wrap gap-2">
        <a href={links.whatsapp} {...external} className={btn}>WhatsApp</a>
        <a href={links.facebook} {...external} className={btn}>Facebook</a>
        <a href={links.x} {...external} className={btn}>X</a>
        <a href={links.linkedin} {...external} className={btn}>LinkedIn</a>
        <button type="button" onClick={copy} className={btn}>
          {status === "copied" ? <Check aria-hidden className="mr-1.5 h-4 w-4" /> : <Link2 aria-hidden className="mr-1.5 h-4 w-4" />}
          {status === "copied" ? "Copied" : "Copy link"}
        </button>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {status === "copied" ? "Link copied to clipboard" : status === "failed" ? "Could not copy the link" : ""}
      </p>
    </section>
  );
}
