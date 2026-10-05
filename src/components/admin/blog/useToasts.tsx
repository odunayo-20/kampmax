"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Toast {
  id: number;
  tone: "success" | "error";
  text: string;
}

/** Minimal toast queue for the blog console (the admin app has no global one). */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach(clearTimeout);
  }, []);

  const push = useCallback((tone: Toast["tone"], text: string) => {
    const id = ++nextId.current;
    setToasts((all) => [...all.slice(-2), { id, tone, text }]);
    const timer = setTimeout(() => {
      setToasts((all) => all.filter((t) => t.id !== id));
      timers.current.delete(timer);
    }, tone === "error" ? 6000 : 3500);
    timers.current.add(timer);
  }, []);

  return { toasts, success: (text: string) => push("success", text), error: (text: string) => push("error", text) };
}

export function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-white p-3 text-sm shadow-lg",
            toast.tone === "success" ? "border-kampmax-border" : "border-kampmax-error/40"
          )}
        >
          {toast.tone === "success" ? (
            <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
          ) : (
            <XCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-error" />
          )}
          <span className="text-kampmax-text">{toast.text}</span>
        </div>
      ))}
    </div>
  );
}
