"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  tone?: "blue" | "emerald" | "amber" | "purple";
}

const TONE_STYLES = {
  blue: {
    iconBg: "bg-kampmax-blue/10 text-kampmax-blue",
    border: "border-kampmax-border",
  },
  emerald: {
    iconBg: "bg-emerald-50 text-emerald-600",
    border: "border-kampmax-border",
  },
  amber: {
    iconBg: "bg-amber-50 text-amber-600",
    border: "border-kampmax-border",
  },
  purple: {
    iconBg: "bg-purple-50 text-purple-600",
    border: "border-kampmax-border",
  },
};

export function AgentMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  tone = "blue",
}: AgentMetricCardProps) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-5 shadow-xs transition-shadow hover:shadow-sm",
        styles.border
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-kampmax-text-secondary">
          {title}
        </p>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            styles.iconBg
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-kampmax-text">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-kampmax-text-secondary">{subtitle}</p>
        )}
        {trend && (
          <p className="mt-1 text-xs font-medium text-emerald-600">{trend}</p>
        )}
      </div>
    </div>
  );
}

