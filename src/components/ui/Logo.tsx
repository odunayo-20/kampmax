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
        {/* Left Stem Blue Gradient */}
        <linearGradient id="kmBlueStem" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0256E0" />
          <stop offset="60%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#0047BA" />
        </linearGradient>

        {/* Lower Right Leg Blue Gradient */}
        <linearGradient id="kmBlueLeg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0447C8" />
          <stop offset="50%" stopColor="#0062F5" />
          <stop offset="100%" stopColor="#003EAC" />
        </linearGradient>

        {/* Dynamic Golden Arrow Gradient */}
        <linearGradient id="kmGoldArrow" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF7200" />
          <stop offset="30%" stopColor="#FFA600" />
          <stop offset="70%" stopColor="#FFC500" />
          <stop offset="100%" stopColor="#FFD600" />
        </linearGradient>

        {/* Ribbon Wrap Shadow/Gradient */}
        <linearGradient id="kmRibbonWrap" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D45000" />
          <stop offset="40%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#FFA800" />
        </linearGradient>

        {/* Arrow Shaft Ambient Shadow */}
        <filter id="kmArrowShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="-3" dy="6" stdDeviation="6" floodColor="#001F60" floodOpacity={0.28} />
        </filter>
      </defs>

      {/* 1. Main Left Vertical Blue Stem with Rounded Top-Left */}
      <path
        d="M110 170 C110 128 144 104 186 104 L210 104 L210 408 L152 408 C128 408 110 390 110 366 Z"
        fill="url(#kmBlueStem)"
      />

      {/* 2. Bottom-Right Blue Diagonal Leg */}
      <path
        d="M210 306 L302 408 L422 408 L286 266 L210 306 Z"
        fill="url(#kmBlueLeg)"
      />

      {/* 3. Under-Ribbon Loop (Wrapping from back of stem to front) */}
      <path
        d="M192 408 C150 408 112 376 112 334 C112 288 142 250 182 222 L234 186 L238 234 L196 264 C172 282 158 304 158 326 C158 350 176 368 200 368 L200 408 Z"
        fill="url(#kmRibbonWrap)"
      />

      {/* 4. Front Golden Arrow Ribbon with Head (Rising 45-deg diagonal) */}
      <g filter="url(#kmArrowShadow)">
        <path
          d="M116 340 C118 296 146 258 190 228 L308 144 L276 116 L406 104 L394 214 L358 182 L218 280 C186 302 166 326 158 348 C144 358 126 354 116 340 Z"
          fill="url(#kmGoldArrow)"
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
          Kamp<span className="text-primary-600">max</span>
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
