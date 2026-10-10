"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsGroupProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsGroup({
  title,
  description,
  children,
  className,
}: SettingsGroupProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-kampmax-border overflow-hidden", className)}>
      {(title || description) && (
        <div className="px-4 pt-4 pb-2">
          {title && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-kampmax-text-secondary">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-xs text-kampmax-text-secondary mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="divide-y divide-kampmax-border">{children}</div>
    </div>
  );
}

// ============================================================
// SettingsRow
// ============================================================

interface SettingsRowProps {
  icon?: ReactNode;
  label: string;
  description?: string;
  action?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  className?: string;
}

export function SettingsRow({
  icon,
  label,
  description,
  action,
  onClick,
  danger,
  className,
}: SettingsRowProps) {
  // A row with no click action is plain content: it may hold its own control
  // (e.g. a toggle), and a button cannot sit inside another button.
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
        onClick && "active:bg-kampmax-muted",
        danger
          ? "text-kampmax-error"
          : "text-kampmax-text",
        className
      )}
    >
      {icon && (
        <span className={cn(
          "flex-shrink-0",
          danger ? "text-kampmax-error" : "text-kampmax-text-secondary"
        )}>
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", danger && "text-kampmax-error")}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-kampmax-text-secondary mt-0.5 truncate">
            {description}
          </p>
        )}
      </div>
      {action && <span className="flex-shrink-0">{action}</span>}
    </Tag>
  );
}

// ============================================================
// SettingsToggle
// ============================================================

interface SettingsToggleProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
}

export function SettingsToggle({
  enabled,
  onToggle,
  disabled,
}: SettingsToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onToggle(!enabled)}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-kampmax-blue focus:ring-offset-2",
        enabled ? "bg-kampmax-blue" : "bg-kampmax-border",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          enabled ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
