"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Marks the start page as viewed, for the top of the application funnel. Renders nothing. */
export function IntroPageTracker() {
  useEffect(() => {
    track("sp_intro_viewed");
  }, []);

  return null;
}
