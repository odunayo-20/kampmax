import { PauseCircle } from "lucide-react";

/** A calm note that a store has paused new orders. The store can still be browsed and messaged. */
export function PausedStoreNotice({ text, hint }: { text: string; hint?: string }) {
  return (
    <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
      <PauseCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="text-sm">
        <p className="font-semibold">{text}</p>
        {hint && <p className="text-xs">{hint}</p>}
      </div>
    </div>
  );
}
