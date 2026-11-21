"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { appStoreUrl, openInAppHref, phonePlatform, type AppScreen, type PhonePlatform } from "@/lib/open-in-app";

const DISMISSED_KEY = "kampmax.openInApp.dismissed";

/** The visitor's phone, or "other" on a computer, on the server, or once they closed the bar this visit. */
function readPlatform(): PhonePlatform {
  try {
    if (window.sessionStorage.getItem(DISMISSED_KEY)) return "other";
  } catch {
    // Storage blocked: just show the bar.
  }
  return phonePlatform(window.navigator.userAgent);
}

const noSubscribe = () => () => {};

/**
 * A slim bar on shared product and store pages, shown only on phones: open this page in the Kampmax
 * app, or get the app. A computer never sees it.
 */
export function OpenInAppBar({ screen }: { screen: AppScreen }) {
  const platform = useSyncExternalStore(noSubscribe, readPlatform, () => "other" as const);
  const [closed, setClosed] = useState(false);

  const storeUrl = appStoreUrl(platform, {
    android: process.env.NEXT_PUBLIC_ANDROID_APP_URL,
    ios: process.env.NEXT_PUBLIC_IOS_APP_URL,
  });
  const openHref = openInAppHref(screen, platform, storeUrl);
  if (closed || !openHref) return null;

  function close() {
    setClosed(true);
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Storage blocked: the bar stays closed until the page reloads.
    }
  }

  return (
    <aside
      aria-label="Kampmax app"
      className="flex items-center gap-3 border-b border-primary-100 bg-primary-50 px-4 py-2.5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a tiny local SVG, nothing to optimise */}
      <img src="/logo-icon.svg" alt="" width={32} height={32} className="h-8 w-8 shrink-0" />
      <p className="min-w-0 flex-1 text-sm leading-tight text-primary-950">
        <span className="font-semibold">Kampmax app</span>
        <span className="block text-xs text-primary-800">Faster checkout and order updates</span>
      </p>
      {storeUrl && platform === "ios" && (
        <a href={storeUrl} className="shrink-0 text-sm font-semibold text-primary-700 underline-offset-2 hover:underline">
          Get it
        </a>
      )}
      <a
        href={openHref}
        className="shrink-0 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
      >
        Open app
      </a>
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="shrink-0 rounded-full p-1.5 text-primary-800 hover:bg-primary-100"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </aside>
  );
}
