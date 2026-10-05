/** Placeholder shown while the editor bundle loads (it is code-split from the admin pages). */
export function EditorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading editor" className="rounded-lg border border-kampmax-border bg-white">
      <div className="h-12 animate-pulse border-b border-kampmax-border bg-kampmax-muted/50" />
      <div className="min-h-[28rem] space-y-3 p-5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-kampmax-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-kampmax-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-kampmax-muted" />
      </div>
    </div>
  );
}
