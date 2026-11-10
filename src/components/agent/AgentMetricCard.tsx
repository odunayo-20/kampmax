"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentMetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  tone?: "blue" | "emerald" | "indigo" | "amber" | "purple";
}

const TONE = {
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  indigo: "bg-indigo-50 text-indigo-600",
  amber: "bg-amber-50 text-amber-600",
  purple: "bg-purple-50 text-purple-600",
};

export function AgentMetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "blue",
}: AgentMetricCardProps) {
  return (
    <div className="rounded-xl border border-kampmax-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", TONE[tone])}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </div>
      <p className="text-lg font-bold text-kampmax-text">{value}</p>
      <p className="text-xs text-kampmax-text-secondary">{label}</p>
      {sublabel && (
        <p className="mt-0.5 text-[11px] text-kampmax-text-muted">{sublabel}</p>
      )}
    </div>
  );
}
