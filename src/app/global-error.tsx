"use client";

// Last line of defence: runs when the root layout itself fails, so the app
// shell, providers and styles from layout.tsx are NOT available here. It must
// bring its own <html>/<body> and styles.
import "@fontsource-variable/inter";
import "./globals.css";
import { RouteError } from "@/components/feedback/RouteError";

export default function GlobalError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <title>Something went wrong - Kampmax</title>
        <RouteError error={error} retry={retry} reset={reset} variant="generic" fullScreen />
      </body>
    </html>
  );
}
