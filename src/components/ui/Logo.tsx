"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  href?: string;
  className?: string;
  textClassName?: string;
  variant?: "default" | "white" | "dark";
}

const sizeMap = {
  xs: { icon: 20, text: "text-base font-bold", gap: "gap-1.5" },
  sm: { icon: 26, text: "text-lg font-bold", gap: "gap-2" },
  md: { icon: 32, text: "text-xl font-extrabold", gap: "gap-2.5" },
  lg: { icon: 42, text: "text-2xl font-black", gap: "gap-3" },
  xl: { icon: 56, text: "text-3xl font-black", gap: "gap-3.5" },
};

export function LogoIcon({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", className)}
      aria-label="Kampmax Logo"
    >
      <defs>
        {/* Blue Stem Gradient */}
        <linearGradient id="kpBlueStem" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0052D4" />
          <stop offset="50%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#0A47B8" />
        </linearGradient>

        {/* Blue Lower Leg Gradient */}
        <linearGradient id="kpBlueLeg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0544B8" />
          <stop offset="60%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#0A52D4" />
        </linearGradient>

        {/* Arrow Ribbon Main Gradient */}
        <linearGradient id="kpArrowGold" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF7A00" />
          <stop offset="25%" stopColor="#FFA800" />
          <stop offset="70%" stopColor="#FFC700" />
          <stop offset="100%" stopColor="#FFD600" />
        </linearGradient>

        {/* Arrow Ribbon Back Wrap Curve */}
        <linearGradient id="kpArrowWrap" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D95700" />
          <stop offset="50%" stopColor="#FF8A00" />
          <stop offset="100%" stopColor="#FFB800" />
        </linearGradient>

        {/* Drop Shadow for Arrow */}
        <filter id="arrowShadow" x="-10%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="-4" dy="8" stdDeviation="8" floodColor="#00184A" floodOpacity={0.35} />
        </filter>
      </defs>

      {/* Left Vertical Blue Stem */}
      <path
        d="M120 108 C120 108 170 108 212 108 C212 108 212 300 212 404 C190 404 150 404 120 404 C120 380 120 148 120 108 Z"
        fill="url(#kpBlueStem)"
      />
      <path
        d="M120 178 C120 138 152 108 192 108 L212 108 L212 404 L160 404 C138 404 120 386 120 364 Z"
        fill="url(#kpBlueStem)"
      />

      {/* Bottom-Right Blue Diagonal Leg */}
      <path
        d="M212 300 L304 404 L420 404 L296 268 L212 300 Z"
        fill="url(#kpBlueLeg)"
      />

      {/* Under-shadow overlay on lower stem for depth */}
      <path
        d="M120 310 C120 310 135 285 170 250 L212 215 L212 290 L160 404 C138 404 120 386 120 364 Z"
        fill="#002D80"
        opacity={0.25}
      />

      {/* Dynamic Gold Arrow Ribbon: Back Wrap Curve */}
      <path
        d="M192 404 C155 404 120 375 120 332 C120 286 150 248 188 220 L242 182 L248 232 L202 265 C176 284 162 305 162 328 C162 352 180 368 204 368 L204 404 Z"
        fill="url(#kpArrowWrap)"
      />

      {/* Main Rising Arrow Shaft with Shadow */}
      <g filter="url(#arrowShadow)">
        <path
          d="M124 336 C124 300 148 262 188 232 L344 116 L310 90 L404 104 L390 198 L356 172 L212 280 C182 302 166 324 162 344 C150 354 135 348 124 336 Z"
          fill="url(#kpArrowGold)"
        />
      </g>
    </svg>
  );
}

export function Logo({
  size = "md",
  showText = true,
  href,
  className,
  textClassName,
  variant = "default",
}: LogoProps) {
  const config = sizeMap[size];

  const content = (
    <div className={cn("inline-flex items-center select-none group", config.gap, className)}>
      <LogoIcon size={config.icon} />
      {showText && (
        <span
          className={cn(
            "tracking-tight transition-colors leading-none",
            config.text,
            variant === "white"
              ? "text-white"
              : variant === "dark"
              ? "text-neutral-900"
              : "text-[#0B2345] group-hover:text-primary-600",
            textClassName
          )}
        >
          Kamp<span className={variant === "white" ? "text-primary-400" : "text-primary-600"}>max</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}

export default Logo;
