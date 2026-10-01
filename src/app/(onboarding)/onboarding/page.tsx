"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingBag,
  Briefcase,
  Users,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ShieldCheck,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

interface TourSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof ShoppingBag;
  color: string;
  accentBg: string;
  accentBorder: string;
  pillColor: string;
  highlights: string[];
  mockupSnippet: {
    title: string;
    detail: string;
    tag: string;
    extra: string;
  };
}

const TOUR_SLIDES: TourSlide[] = [
  {
    id: "marketplace",
    badge: "Campus Marketplace",
    title: "Buy & Sell Directly On Campus",
    subtitle: "Trade safely with peers",
    description:
      "Find textbooks, tech gear, fashion, and dorm appliances from verified students and approved campus vendors with safe on-campus pickup spots.",
    icon: ShoppingBag,
    color: "text-kampmax-blue",
    accentBg: "bg-kampmax-blue/10",
    accentBorder: "border-kampmax-blue/20",
    pillColor: "bg-kampmax-blue/10 text-kampmax-blue border-kampmax-blue/20",
    highlights: [
      "Verified Student Sellers",
      "Safe On-Campus Meetups",
      "Zero Hidden Listing Fees",
    ],
    mockupSnippet: {
      title: "MacBook Air M1 (Silver, 256GB)",
      detail: "Listed by Tunde O. • Engineering Hostel",
      tag: "Verified Student",
      extra: "₦420,000 • In-Person Inspection",
    },
  },
  {
    id: "services",
    badge: "Student Gigs & Skills",
    title: "Hire Peers or Monetize Your Craft",
    subtitle: "Turn campus talent into income",
    description:
      "Need a graphic designer, tutor, web developer, photographer, or barber? Connect directly with skilled students on your campus.",
    icon: Briefcase,
    color: "text-amber-600",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/20",
    pillColor: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    highlights: [
      "Student-Friendly Pricing",
      "Real Peer Reviews & Ratings",
      "Fast Direct Messaging",
    ],
    mockupSnippet: {
      title: "UI/UX & Brand Identity Design",
      detail: "Chioma A. • Computer Science (400L)",
      tag: "Top Rated ★ 4.9",
      extra: "28 Completed Projects",
    },
  },
  {
    id: "community",
    badge: "Campus Live Feed",
    title: "The Pulse of Your University",
    subtitle: "Stay informed 24/7",
    description:
      "Never miss what's happening. Join faculty discussions, recover lost items, find roommates, and stay updated on important campus announcements.",
    icon: Users,
    color: "text-indigo-600",
    accentBg: "bg-indigo-500/10",
    accentBorder: "border-indigo-500/20",
    pillColor: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
    highlights: [
      "Real-time Campus Feed",
      "Lost & Found Desk",
      "Departmental Hubs",
    ],
    mockupSnippet: {
      title: "Lost: Blue HP Laptop Bag with ID Card",
      detail: "Left near Lecture Hall B • 22 mins ago",
      tag: "Help A Peer",
      extra: "4 Students Replied",
    },
  },
  {
    id: "events",
    badge: "Events & Perks",
    title: "Exclusive Events & Student Deals",
    subtitle: "Your campus social pass",
    description:
      "Discover faculty dinners, hackathons, concerts, and sports fests. Grab digital passes and enjoy exclusive vendor discounts reserved for students.",
    icon: Sparkles,
    color: "text-emerald-600",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/20",
    pillColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    highlights: [
      "In-App Digital Tickets",
      "Exclusive Student Discounts",
      "Campus Nightlife & Tech Fests",
    ],
    mockupSnippet: {
      title: "Campus Innovators Hackathon 2026",
      detail: "Faculty of Tech Auditorium • Free Entry",
      tag: "Featured Event",
      extra: "240+ Registered",
    },
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { setHasCompletedOnboarding } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slide = TOUR_SLIDES[currentSlide];
  const isLast = currentSlide === TOUR_SLIDES.length - 1;
  const isFirst = currentSlide === 0;

  function handleCreateAccount() {
    setHasCompletedOnboarding(true);
    router.push("/register");
  }

  function handleSignIn() {
    setHasCompletedOnboarding(true);
    router.push("/login");
  }

  function handleExploreGuest() {
    setHasCompletedOnboarding(true);
    router.push("/home");
  }

  function handleNext() {
    if (isLast) {
      handleCreateAccount();
    } else {
      setCurrentSlide((s) => s + 1);
    }
  }

  function handlePrev() {
    if (!isFirst) {
      setCurrentSlide((s) => s - 1);
    }
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        if (!isLast) setCurrentSlide((s) => s + 1);
      } else if (e.key === "ArrowLeft") {
        if (!isFirst) setCurrentSlide((s) => s - 1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFirst, isLast]);

  const Icon = slide.icon;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-neutral-50 via-white to-neutral-50 text-kampmax-text">
      {/* Top Header */}
      <header className="px-6 pt-6 pb-2 flex items-center justify-between max-w-xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-kampmax-blue flex items-center justify-center text-white font-bold text-base shadow-sm">
            K
          </div>
          <span className="font-bold text-lg tracking-tight text-kampmax-text">
            Kampmax
          </span>
        </div>

        <button
          onClick={handleExploreGuest}
          className="text-xs font-semibold text-kampmax-text-secondary hover:text-kampmax-blue transition-colors py-1.5 px-3 rounded-full hover:bg-neutral-100"
        >
          Explore as Guest
        </button>
      </header>

      {/* Main Tour Showcase */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-6 max-w-xl mx-auto w-full">
        {/* Slide Category Badge */}
        <div className="mb-4 animate-in fade-in duration-300">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border transition-all",
              slide.pillColor
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {slide.badge}
          </span>
        </div>

        {/* Dynamic Icon Graphic */}
        <div className="relative mb-6">
          <div
            className={cn(
              "w-24 h-24 rounded-3xl flex items-center justify-center border shadow-sm transition-all duration-300",
              slide.accentBg,
              slide.accentBorder
            )}
          >
            <Icon className={cn("h-12 w-12 transition-transform duration-300", slide.color)} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white shadow-md border border-neutral-100 flex items-center justify-center text-kampmax-blue">
            <Building className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Title and Description */}
        <div className="text-center mb-6 max-w-md">
          <h1 className="text-2xl sm:text-3xl font-bold text-kampmax-text mb-2.5 tracking-tight leading-tight">
            {slide.title}
          </h1>
          <p className="text-sm text-kampmax-text-secondary leading-relaxed">
            {slide.description}
          </p>
        </div>

        {/* Feature Highlights Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-md">
          {slide.highlights.map((h, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-neutral-100/80 text-neutral-800 px-3 py-1 rounded-full border border-neutral-200/60 shadow-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-kampmax-blue" />
              {h}
            </span>
          ))}
        </div>

        {/* Interactive Feature Snippet Card */}
        <div className="w-full max-w-md bg-white rounded-xl border border-kampmax-border p-4 shadow-sm mb-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-kampmax-blue/10 text-kampmax-blue px-2 py-0.5 rounded">
              {slide.mockupSnippet.tag}
            </span>
            <span className="text-[11px] text-kampmax-text-secondary font-medium flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Campus Verified
            </span>
          </div>
          <h4 className="text-sm font-semibold text-kampmax-text mb-0.5">
            {slide.mockupSnippet.title}
          </h4>
          <p className="text-xs text-kampmax-text-secondary mb-2">
            {slide.mockupSnippet.detail}
          </p>
          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-kampmax-text">
              {slide.mockupSnippet.extra}
            </span>
            <span className="text-kampmax-blue font-medium inline-flex items-center gap-0.5 text-[11px]">
              Tap to see more
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Slide Indicator Dots with Prev/Next Controls */}
        <div className="flex items-center justify-center gap-4 mb-2">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            aria-label="Previous slide"
            className={cn(
              "h-8 w-8 rounded-full border border-kampmax-border flex items-center justify-center transition-all",
              isFirst
                ? "opacity-30 cursor-not-allowed text-neutral-400"
                : "text-kampmax-text hover:bg-neutral-100 hover:border-neutral-300"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            {TOUR_SLIDES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 cursor-pointer",
                  i === currentSlide
                    ? "w-8 bg-kampmax-blue"
                    : "w-2 bg-kampmax-border hover:bg-neutral-400"
                )}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            aria-label="Next slide"
            className="h-8 w-8 rounded-full border border-kampmax-border flex items-center justify-center text-kampmax-text hover:bg-neutral-100 hover:border-neutral-300 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </main>

      {/* Bottom Action Footer */}
      <footer className="px-6 pb-8 pt-2 max-w-xl mx-auto w-full space-y-3">
        {/* Primary CTA: Create Account */}
        <Button
          onClick={handleCreateAccount}
          variant="primary"
          size="lg"
          className="w-full flex items-center justify-center gap-2 shadow-sm font-semibold"
        >
          <span>Create Account</span>
          <ArrowRight className="h-4 w-4" />
        </Button>

        {/* Secondary: Sign in */}
        <div className="flex items-center justify-center gap-2 text-sm text-kampmax-text-secondary pt-1">
          <span>Already have an account?</span>
          <button
            onClick={handleSignIn}
            className="font-semibold text-kampmax-blue hover:text-kampmax-blue-dark transition-colors"
          >
            Sign in
          </button>
        </div>

        <div className="text-center pt-2">
          <p className="text-[11px] text-kampmax-text-secondary">
            Kampmax • The All-In-One Campus Super-App
          </p>
        </div>
      </footer>
    </div>
  );
}
