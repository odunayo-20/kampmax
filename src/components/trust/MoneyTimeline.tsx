import { AlertTriangle, Check, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MoneyStepState, MoneyTimelineModel } from "./money-steps";

const STATE_LABEL: Record<MoneyStepState, string> = {
  done: "Done",
  current: "Now",
  upcoming: "Next",
  blocked: "On hold",
};

/**
 * "Where is my money?" in plain words: what has happened, what is happening
 * now, and when money moves. Screen readers get the state of every step as text
 * (not just a colour), and the current step carries aria-current.
 */
export function MoneyTimeline({
  model,
  title = "Where your money is",
  className,
}: {
  model: MoneyTimelineModel;
  title?: string;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="money-timeline-title"
      className={cn("rounded-2xl border border-kampmax-border bg-white p-4 sm:p-5", className)}
      data-testid="money-timeline"
    >
      <h2 id="money-timeline-title" className="text-sm font-bold text-kampmax-text">
        {title}
      </h2>
      <p className="mt-1 text-xs font-medium text-kampmax-text-secondary" data-testid="money-headline">
        {model.headline}
      </p>

      <ol className="mt-4 space-y-0">
        {model.steps.map((step, i) => {
          const last = i === model.steps.length - 1;
          return (
            <li
              key={step.id}
              aria-current={step.state === "current" || step.state === "blocked" ? "step" : undefined}
              className="flex gap-3"
            >
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    step.state === "done" && "bg-emerald-600 text-white",
                    step.state === "current" && "bg-primary-600 text-white",
                    step.state === "blocked" && "bg-amber-500 text-white",
                    step.state === "upcoming" && "border border-neutral-300 bg-white text-neutral-400"
                  )}
                  aria-hidden
                >
                  {step.state === "done" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : step.state === "blocked" ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : step.state === "current" ? (
                    <Clock className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className="h-2.5 w-2.5" />
                  )}
                </span>
                {!last && (
                  <span className={cn("my-1 w-px flex-1", step.state === "done" ? "bg-emerald-300" : "bg-neutral-200")} aria-hidden />
                )}
              </div>
              <div className={cn("min-w-0 flex-1", !last && "pb-4")}>
                <p className={cn("text-xs font-bold", step.state === "upcoming" ? "text-neutral-500" : "text-kampmax-text")}>
                  {step.title}
                  <span
                    className={cn(
                      "ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      step.state === "done" && "bg-emerald-50 text-emerald-700",
                      step.state === "current" && "bg-primary-50 text-primary-700",
                      step.state === "blocked" && "bg-amber-50 text-amber-800",
                      step.state === "upcoming" && "bg-neutral-100 text-neutral-600"
                    )}
                  >
                    {STATE_LABEL[step.state]}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-kampmax-text-secondary">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
