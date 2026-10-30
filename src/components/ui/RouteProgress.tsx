"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Phase = "idle" | "running" | "finishing";

/** Give up after this long so a cancelled navigation never leaves the bar stuck. */
const MAX_RUN_MS = 15_000;

/**
 * Thin top-of-page progress bar for client-side route changes.
 *
 * Starts the moment an internal link is clicked (before the new route has
 * rendered anything), trickles toward ~90%, then completes when the pathname
 * changes. Same-page links, new-tab clicks and downloads are ignored.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const lastPathname = useRef(pathname);
  const timers = useRef<{ trickle?: number; reset?: number; abort?: number }>({});

  useEffect(() => {
    const clear = () => {
      window.clearInterval(timers.current.trickle);
      window.clearTimeout(timers.current.reset);
      window.clearTimeout(timers.current.abort);
    };

    const finish = () => {
      clear();
      setProgress(1);
      setPhase("finishing");
      timers.current.reset = window.setTimeout(() => {
        setPhase("idle");
        setProgress(0);
      }, 280);
    };

    const start = () => {
      clear();
      setPhase("running");
      setProgress(0.08);
      // Ease toward 90%: each tick covers a fraction of the remaining distance.
      timers.current.trickle = window.setInterval(() => {
        setProgress((p) => Math.min(0.9, p + (0.9 - p) * 0.12));
      }, 200);
      timers.current.abort = window.setTimeout(finish, MAX_RUN_MS);
    };

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Hash-only or same-route links don't navigate.
      if (url.pathname === window.location.pathname) return;

      start();
    };

    document.addEventListener("click", onClick, true);
    // Route finished: pathname moved since the last time we looked.
    if (lastPathname.current !== pathname) {
      lastPathname.current = pathname;
      finish();
    }

    return () => {
      document.removeEventListener("click", onClick, true);
      clear();
    };
  }, [pathname]);

  if (phase === "idle") return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
      style={{ opacity: phase === "finishing" ? 0 : 1, transition: "opacity 240ms ease 60ms" }}
    >
      <div
        className="h-full origin-left bg-kampmax-blue"
        style={{
          transform: `scaleX(${progress})`,
          transition: "transform 200ms ease-out",
          boxShadow: "0 0 10px var(--color-kampmax-blue), 0 0 4px var(--color-kampmax-gold)",
        }}
      />
    </div>
  );
}
