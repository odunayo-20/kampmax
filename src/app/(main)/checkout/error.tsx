"use client";

import { RouteError } from "@/components/feedback/RouteError";

export default function Error({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  return <RouteError error={error} retry={retry} reset={reset} variant="checkout" />;
}
