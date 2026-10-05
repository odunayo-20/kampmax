"use client";

import { BlogErrorState } from "@/components/blog/BlogStates";

export default function BlogError({ reset }: { error: Error; reset: () => void }) {
  return <BlogErrorState onRetry={reset} />;
}
