"use client";

import Link from "next/link";
import {
  MapPin,
  BadgeCheck,
  Lock,
  ShieldCheck,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { PageContainer } from "@/components/layout/PageContainer";
import { getContextualLinks, getFooterSections } from "./sections";
import { HOMEPAGE_ROLE_CARDS } from "./role-paths";
import { FooterNav } from "./FooterNav";
import { CampusSelector } from "./CampusSelector";
import { SocialLinks } from "./SocialLinks";

/**
 * "More than a marketplace" — role-discovery CTA shown just above the footer
 * columns. Compact, native to the Kampmax design system, no animations.
 */
function FooterRoleCta() {
  const { user } = useAuth();
  const signedIn = Boolean(user);

  return (
    <div className="rounded-2xl border border-kampmax-border bg-white p-6 sm:p-8 mb-10">
      <div className="max-w-2xl">
        <h2 className="text-xl sm:text-2xl font-bold text-kampmax-text tracking-tight">
          More than a marketplace
        </h2>
        <p className="text-sm text-kampmax-text-secondary mt-1.5">
          Whether you&apos;re here to shop, sell, offer your skills, provide
          services, or hire talent, there&apos;s a place for you on Kampmax.
        </p>
      </div>
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
        {HOMEPAGE_ROLE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href(signedIn)}
              className="group flex flex-col justify-between gap-2 rounded-xl border border-kampmax-border bg-kampmax-muted/30 p-3.5 transition-colors hover:border-kampmax-blue/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kampmax-blue"
            >
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 shrink-0 rounded-lg bg-kampmax-blue/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-kampmax-blue" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-kampmax-text">
                  {card.title}
                </span>
              </div>
              <div>
                <p className="text-xs text-kampmax-text-secondary leading-snug">
                  {card.tagline}
                </p>
                <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-kampmax-blue">
                  {card.cta}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const trustItems = [
  {
    icon: Lock,
    label: "Secure Payments",
    description: "Payments are encrypted and handled through secure channels.",
  },
  {
    icon: BadgeCheck,
    label: "Verified Vendors",
    description: "Vendors are reviewed before they can sell on Kampmax.",
  },
  {
    icon: ShieldCheck,
    label: "Protected Transactions",
    description: "Escrow protection keeps buyers and sellers covered.",
  },
  {
    icon: GraduationCap,
    label: "Campus-focused",
    description: "Products and services matched to your campus community.",
  },
];

function TrustRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-6 border-b border-kampmax-border mb-8">
      {trustItems.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-kampmax-blue/10 flex items-center justify-center">
              <Icon className="h-[18px] w-[18px] text-kampmax-blue" />
            </div>
            <div>
              <p className="text-sm font-semibold text-kampmax-text">
                {item.label}
              </p>
              <p className="text-xs text-kampmax-text-secondary leading-snug mt-0.5">
                {item.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { Logo } from "@/components/ui/Logo";

function FooterBrand() {
  const { selectedCampus } = useApp();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Logo size="md" href="/home" />
        <p className="text-sm text-kampmax-text-secondary mt-2 max-w-sm leading-relaxed">
          Your campus marketplace and platform for buying, selling, working and
          hiring.
        </p>
      </div>

      <div className="max-w-xs">
        <p className="text-sm text-kampmax-text-secondary mb-1.5">
          Shopping around a campus?
        </p>
        <p className="text-xs text-kampmax-text-muted mb-3">
          Choose your campus to see relevant products, vendors and services.
        </p>
        <CampusSelector />
        {selectedCampus && (
          <p className="text-xs text-kampmax-text-muted mt-2 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Currently shopping near {selectedCampus.name}
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-kampmax-text mb-3">Follow us</h3>
        <SocialLinks />
      </div>
    </div>
  );
}

function ContextualNav() {
  const { user } = useAuth();
  if (!user) return null;

  const links = getContextualLinks(user.role);
  if (links.length === 0) return null;

  return (
    <div className="bg-neutral-50 border border-kampmax-border rounded-xl p-4 sm:p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <BadgeCheck className="h-4 w-4 text-kampmax-blue" />
        <h3 className="text-sm font-bold text-kampmax-text">
          Your Kampmax shortcuts
        </h3>
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="group flex items-center gap-1 text-sm text-kampmax-text-secondary hover:text-kampmax-blue transition-colors inline-block py-0.5"
            >
              {link.label}
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterBottom() {
  return (
    <div className="pt-6 mt-8 border-t border-kampmax-border">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-xs text-kampmax-text-muted">
          © 2026 Kampmax · Nigeria · ₦ NGN
        </p>
        <p className="text-xs text-kampmax-text-muted">
          Shop, sell, freelance, provide services, and hire — all on Kampmax.
        </p>
      </div>
    </div>
  );
}

export function Footer() {
  const { user } = useAuth();
  const sections = getFooterSections(Boolean(user));

  return (
    <footer className="bg-white border-t border-kampmax-border mt-10">
      <PageContainer className="py-10 lg:py-12">
        <FooterRoleCta />

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
          <div className="lg:w-80 lg:shrink-0">
            <FooterBrand />
          </div>
          <div className="flex-1 min-w-0">
            <FooterNav sections={sections} />
          </div>
        </div>

        <div className="mt-8">
          <ContextualNav />
        </div>

        <TrustRow />

        <FooterBottom />
      </PageContainer>
    </footer>
  );
}