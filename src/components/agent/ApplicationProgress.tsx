import { AlertTriangle, Check, Circle, Clock, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApplicationStep, StepState } from "@/services/agent-application";

const ICON: Record<StepState, LucideIcon> = { done: Check, current: Clock, action: AlertTriangle, stopped: X, todo: Circle };

const TINT: Record<StepState, string> = {
  done: "bg-emerald-100 text-emerald-700",
  current: "bg-blue-100 text-kampmax-blue",
  action: "bg-amber-100 text-amber-700",
  stopped: "bg-red-100 text-red-700",
  todo: "bg-neutral-100 text-neutral-400",
};

const STATE_WORD: Record<StepState, string> = {
  done: "Done",
  current: "Happening now",
  action: "Needs you",
  stopped: "Stopped",
  todo: "Later",
};

/** Where an agent application stands, as a short timeline: what is done, what is happening now, what comes after. */
export function ApplicationProgress({ steps }: { steps: ApplicationStep[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => {
        const Icon = ICON[s.state];
        return (
          <li key={s.title} className="flex gap-3">
            <div className="flex w-8 flex-col items-center">
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", TINT[s.state])}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              {i < steps.length - 1 && <span className="my-0.5 w-0.5 flex-1 bg-kampmax-border" aria-hidden />}
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <p className={cn("text-sm font-semibold", s.state === "todo" ? "text-kampmax-text-muted" : "text-kampmax-text")}>
                {s.title}
                <span className="sr-only">. {STATE_WORD[s.state]}.</span>
              </p>
              <p className="mt-0.5 text-xs text-kampmax-text-secondary">{s.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
