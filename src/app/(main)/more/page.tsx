"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ShieldCheck,
  CreditCard,
  LogOut,
  MapPin,
  Sparkles,
  ArrowUpRight,
  User,
  ShoppingBag,
  Heart,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { MORE_MENU_SECTIONS } from "@/config/navigation";
import { useAuth } from "@/lib/auth-context";
import { useApp } from "@/lib/app-context";
import { useCart } from "@/lib/cart-context";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function MorePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { selectedCampus } = useApp();
  const { itemCount } = useCart();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <PageContainer className="space-y-5 pb-16">
      {/* Top Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-neutral-900 tracking-tight">More</h1>
        <p className="text-xs text-neutral-500 font-medium">
          Hub navigation, services, orders and account settings
        </p>
      </div>

      {/* 1. User Profile Preview Card / Guest Explore Card */}
      {user ? (
        <Link
          href="/profile"
          className="group flex items-center justify-between p-4 bg-white border border-neutral-200/90 rounded-2xl shadow-xs hover:border-primary-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-3.5">
            <Avatar
              name={user.name}
              size="lg"
              className="h-13 w-13 text-sm ring-2 ring-primary-100"
            />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-neutral-900 group-hover:text-primary-600 transition-colors">
                  {user.name}
                </h2>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium">{user.email}</p>
              <div className="flex items-center gap-1 text-[11px] text-primary-600 font-semibold pt-0.5">
                <MapPin className="h-3 w-3" />
                <span>{selectedCampus.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-neutral-400 group-hover:text-primary-600 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </div>
        </Link>
      ) : (
        <div className="p-4 bg-white border border-neutral-200/90 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shrink-0">
              <User className="h-6 w-6" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-neutral-900">
                  Exploring as Guest
                </h2>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-600">
                  Guest Mode
                </span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Sign in or create an account to view orders, buy tickets, chat with vendors, and access campus services.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-neutral-100">
            <Link
              href="/login"
              className="flex-1 inline-flex items-center justify-center h-9 px-3 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="flex-1 inline-flex items-center justify-center h-9 px-3 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-2xs transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      )}

      {/* 2. Kampmax Pay Financial Quick-Access Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-[#0256E0] via-[#0066FF] to-[#0047BA] text-white p-4 sm:p-5 shadow-md">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-blue-100" />
              <span className="text-xs font-bold text-blue-100 tracking-wide uppercase">
                Kampmax Pay Wallet
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {user ? "Escrow Protected" : "Zero Fee Campus Pay"}
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20">
            Escrow Protected
          </span>
        </div>

        <div className="pt-3.5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-blue-100 font-medium hidden sm:block">
            Fast campus payments with 0% fee
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Link
              href={user ? "/pay" : "/login?returnTo=/pay"}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-4 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-primary-700 text-xs font-bold shadow-xs transition-colors"
            >
              <span>{user ? "Open Pay Hub" : "Sign in to Pay"}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Grouped Navigation Sections */}
      <div className="space-y-5">
        {MORE_MENU_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-2">
            <div className="px-1">
              <h3 className="text-[11px] font-extrabold tracking-wider text-neutral-400 uppercase">
                {section.title}
              </h3>
            </div>

            <div className="bg-white border border-neutral-200/90 rounded-2xl shadow-2xs divide-y divide-neutral-100 overflow-hidden">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isCart = item.id === "cart";

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="group flex items-center justify-between p-3.5 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0",
                          item.accent
                            ? "bg-primary-50 text-primary-600 group-hover:bg-primary-600 group-hover:text-white"
                            : "bg-neutral-100 text-neutral-600 group-hover:bg-primary-50 group-hover:text-primary-600"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-neutral-900 group-hover:text-primary-600 transition-colors">
                            {item.label}
                          </h4>
                          {item.badge && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {item.badge}
                            </span>
                          )}
                          {isCart && itemCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-primary-600 text-white">
                              {itemCount} {itemCount === 1 ? "item" : "items"}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-neutral-500 line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 4. Logout or Sign In & Info */}
      <div className="pt-2">
        {user ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3.5 bg-white border border-rose-200/80 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50/50 shadow-2xs transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out of Kampmax</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 p-3.5 bg-white border border-primary-200/80 rounded-2xl text-xs font-bold text-primary-700 hover:bg-primary-50/50 shadow-2xs transition-colors"
          >
            <User className="h-4 w-4" />
            <span>Sign in to your account</span>
          </Link>
        )}

        <p className="text-center text-[10px] text-neutral-400 font-medium mt-3">
          Kampmax Hub v2.5.0 • Campus Ecosystem
        </p>
      </div>
    </PageContainer>
  );
}
