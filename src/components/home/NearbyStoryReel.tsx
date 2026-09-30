"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoryItem {
  id: string;
  name: string;
  subtitle: string;
  avatar: string;
  href: string;
  isLive?: boolean;
  hasOffer?: boolean;
}

const STORIES: StoryItem[] = [
  {
    id: "s1",
    name: "Campus Bite",
    subtitle: "Food & Chops",
    avatar: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80",
    href: "/nearby",
    hasOffer: true,
  },
  {
    id: "s2",
    name: "Tech World",
    subtitle: "Gadget Repairs",
    avatar: "https://images.unsplash.com/photo-1597740985671-2a8a3b80502e?w=200&auto=format&fit=crop&q=80",
    href: "/services",
    isLive: true,
  },
  {
    id: "s3",
    name: "StyleByChi",
    subtitle: "Hair & Braids",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    href: "/services",
  },
  {
    id: "s4",
    name: "Nova Store",
    subtitle: "Sneakers & Fits",
    avatar: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&auto=format&fit=crop&q=80",
    href: "/marketplace",
    hasOffer: true,
  },
  {
    id: "s5",
    name: "Creative Shots",
    subtitle: "Photography",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    href: "/services",
  },
  {
    id: "s6",
    name: "StartUp Academy",
    subtitle: "Courses",
    avatar: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=200&auto=format&fit=crop&q=80",
    href: "/explore?tab=courses",
  },
];

export function NearbyStoryReel() {
  return (
    <section aria-label="Nearby & Trending" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Nearby & Trending</h2>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <Link
          href="/nearby"
          className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-0.5 transition-colors"
        >
          See all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex items-center gap-3.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {STORIES.map((story) => (
          <Link
            key={story.id}
            href={story.href}
            className="group flex flex-col items-center gap-1.5 shrink-0 w-[68px] text-center focus:outline-none"
          >
            <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-amber-400 via-primary-500 to-indigo-600 transition-transform duration-200 group-hover:scale-105">
              <div className="relative w-14 h-14 rounded-full overflow-hidden bg-white border-2 border-white">
                <img
                  src={story.avatar}
                  alt={story.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              {story.isLive && (
                <span className="absolute bottom-0 right-0 px-1 py-0.2 rounded-full bg-rose-600 text-[8px] font-extrabold text-white border border-white tracking-wider">
                  LIVE
                </span>
              )}
              {story.hasOffer && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-neutral-950 border border-white shadow-xs">
                  %
                </span>
              )}
            </div>
            <div className="w-full">
              <p className="text-[11px] font-semibold text-neutral-800 truncate leading-tight group-hover:text-primary-600">
                {story.name}
              </p>
              <p className="text-[9px] text-neutral-500 truncate leading-tight">
                {story.subtitle}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
