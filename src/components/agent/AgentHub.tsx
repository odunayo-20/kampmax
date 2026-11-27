"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  CalendarDays,
  Eye,
  EyeOff,
  Headset,
  Home,
  ListChecks,
  MessageSquareText,
  Plus,
  Receipt,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { FactChips } from "@/components/ui/FactChips";
import { useAccommodationAgentOverview, useConfirmAccommodationAvailability } from "@/hooks/use-accommodation";
import { describeHousingError } from "@/lib/accommodation-text";
import { agentToday, listingNotices, listingsFooter, setupStep, spendFooter } from "@/lib/agent-hub";
import { formatNaira } from "@/lib/utils";
import { interestLine, replyChips, type AgentOverview } from "@/services/accommodation-overview";
import { AgentRecentInquiries } from "./AgentRecentInquiries";

const REPLY_HINT = "Your reply speed shows to students once a few of them have written to you. Answer quickly and it shows.";

/**
 * The approved agent's home: what is live and what it costs, the one thing to do now, where things stand, the daily
 * actions, and how the rooms are doing. The same hub as the mobile app's agent.tsx, from one dashboard call.
 */
export function AgentHub() {
  const q = useAccommodationAgentOverview();
  const d = q.data;

  return (
    <div className="space-y-4">
      <MoneyCards d={d} />
      {q.isError && (
        <p role="alert" className="text-sm text-red-700">
          The numbers could not be loaded.{" "}
          <button type="button" className="underline" onClick={() => void q.refetch()}>Try again</button>
        </p>
      )}

      {d && <Today d={d} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Count label="New enquiries" value={d?.enquiries.new} hot={(d?.enquiries.new ?? 0) > 0} href="/agent/enquiries" />
        <Count label="Visits" value={d ? d.inspections.awaitingAnswer + d.inspections.upcoming : undefined} hot={(d?.inspections.awaitingAnswer ?? 0) > 0} href="/agent/visits" />
        <Count label="Live" value={d?.listings.active} href="/agent/listings" />
        <Count label="In review" value={d?.listings.pendingApproval} href="/agent/listings" />
      </div>

      <Actions d={d} />

      {d && <Notice d={d} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <AgentRecentInquiries />
        <div className="space-y-4">
          {d && d.listings.active > 0 && <Rooms d={d} />}
          <StudentsSee d={d} />
        </div>
      </div>

      {d && <NextStep d={d} />}
    </div>
  );
}

function MoneyCards({ d }: { d: AgentOverview | undefined }) {
  const [hidden, setHidden] = useState(false);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link href="/agent/listings" className="block rounded-2xl bg-kampmax-navy p-5 text-white hover:opacity-95">
        <p className="text-xs text-white/70">Live now</p>
        <p className="mt-1 text-3xl font-bold">{d ? d.listings.active : "–"}</p>
        <p className="mt-1 text-xs text-white/70">{d ? listingsFooter(d) : " "}</p>
      </Link>
      <div className="relative rounded-2xl border border-kampmax-border bg-white p-5">
        <div className="flex items-center gap-2">
          <p className="text-xs text-kampmax-text-secondary">Spent</p>
          <button type="button" onClick={() => setHidden((h) => !h)} aria-label={hidden ? "Show amounts" : "Hide amounts"} className="text-kampmax-text-secondary hover:text-kampmax-text">
            {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <Link href="/agent/billing" className="block">
          <p className="mt-1 text-3xl font-bold text-kampmax-text">{!d ? "–" : hidden ? "••••" : formatNaira(d.spending.total)}</p>
          <p className="mt-1 text-xs text-kampmax-text-secondary">{!d ? " " : hidden ? "••••" : spendFooter(d, formatNaira)}</p>
        </Link>
      </div>
    </div>
  );
}

/** The one thing worth doing now. Rooms to confirm are answered right here; the rest link to where they are dealt with. */
function Today({ d }: { d: AgentOverview }) {
  const today = agentToday(d);
  const confirm = useConfirmAccommodationAvailability();
  if (!today) return null;

  if (today.kind === "confirm") {
    return (
      <section role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">{today.title}</p>
        <p className="mt-1 text-xs text-amber-900">{today.detail}</p>
        <ul className="mt-3 space-y-2">
          {d.needsConfirming.listings.map((room) => (
            <li key={room.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-kampmax-text">{room.title}</span>
              <span className="flex gap-2">
                <button type="button" disabled={confirm.isPending} onClick={() => confirm.mutate({ id: room.id })} className="rounded-md bg-kampmax-blue px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                  Still available
                </button>
                <button type="button" disabled={confirm.isPending} onClick={() => confirm.mutate({ id: room.id, availabilityStatus: "OCCUPIED" })} className="rounded-md border border-kampmax-border bg-white px-3 py-1.5 text-xs font-semibold text-kampmax-text disabled:opacity-60">
                  It is taken
                </button>
              </span>
            </li>
          ))}
        </ul>
        {confirm.isError && <p role="alert" className="mt-2 text-xs text-red-700">{describeHousingError(confirm.error)}</p>}
      </section>
    );
  }

  const Icon = today.kind === "enquiries" ? MessageSquareText : CalendarDays;
  return (
    <Link href={today.href ?? "/agent"} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 hover:bg-amber-100">
      <Icon className="h-5 w-5 shrink-0 text-amber-800" aria-hidden />
      <span>
        <span className="block text-sm font-semibold text-amber-900">{today.title}</span>
        <span className="block text-xs text-amber-900">{today.detail}</span>
      </span>
    </Link>
  );
}

function Count({ label, value, hot, href }: { label: string; value: number | undefined; hot?: boolean; href: string }) {
  return (
    <Link href={href} className={`block rounded-xl border bg-white p-4 hover:border-kampmax-blue ${hot ? "border-amber-400" : "border-kampmax-border"}`}>
      <p className="text-2xl font-bold text-kampmax-text">{value ?? "…"}</p>
      <p className="text-xs text-kampmax-text-secondary">{label}</p>
    </Link>
  );
}

function Actions({ d }: { d: AgentOverview | undefined }) {
  const main: { label: string; href: string; Icon: LucideIcon; badge?: number }[] = [
    { label: "Add a room", href: "/agent/listings?new=1", Icon: Plus },
    { label: "Enquiries", href: "/agent/enquiries", Icon: MessageSquareText, badge: d?.enquiries.new },
    { label: "Visits", href: "/agent/visits", Icon: CalendarDays, badge: d?.inspections.awaitingAnswer },
    { label: "Listings", href: "/agent/listings", Icon: ListChecks },
  ];
  const more: { label: string; href: string; Icon: LucideIcon }[] = [
    { label: "Properties", href: "/agent/properties", Icon: Home },
    { label: "Billing", href: "/agent/billing", Icon: Receipt },
    { label: "Profile", href: "/agent/profile", Icon: UserRound },
    { label: "Preview", href: "/accommodation", Icon: Eye },
    { label: "Help", href: "/support", Icon: Headset },
    { label: "Alerts", href: "/notifications", Icon: Bell },
    { label: "Settings", href: "/agent/settings", Icon: Settings },
  ];
  return (
    <div className="space-y-3 rounded-xl border border-kampmax-border bg-white p-4">
      <div className="grid grid-cols-4 gap-2">
        {main.map(({ label, href, Icon, badge }) => (
          <Link key={label} href={href} className="relative flex flex-col items-center gap-1.5 rounded-lg p-2 text-center hover:bg-kampmax-bg">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-kampmax-blue/10 text-kampmax-blue">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-xs font-medium text-kampmax-text">{label}</span>
            {!!badge && (
              <span className="absolute right-3 top-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white" aria-label={`${badge} waiting`}>
                {badge}
              </span>
            )}
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 border-t border-kampmax-border pt-3 sm:grid-cols-7">
        {more.map(({ label, href, Icon }) => (
          <Link key={label} href={href} className="flex flex-col items-center gap-1 rounded-lg p-2 text-center text-kampmax-text-secondary hover:bg-kampmax-bg hover:text-kampmax-text">
            <Icon className="h-4 w-4" aria-hidden />
            <span className="text-[11px]">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Notice({ d }: { d: AgentOverview }) {
  const n = listingNotices(d)[0];
  if (!n) return null;
  return (
    <Link href={n.href} className="block rounded-xl border border-amber-200 bg-amber-50 p-4 hover:bg-amber-100">
      <p className="text-sm font-semibold text-amber-900">{n.title}</p>
      <p className="mt-0.5 text-xs text-amber-900">{n.text}</p>
    </Link>
  );
}

function Rooms({ d }: { d: AgentOverview }) {
  return (
    <section className="rounded-xl border border-kampmax-border bg-white p-4">
      <h2 className="text-sm font-semibold text-kampmax-text">How your rooms are doing</h2>
      <p className="mt-1 text-xs text-kampmax-text-secondary">{interestLine(d.interest)} across all your listings. Views are page opens, not people.</p>
      <ul className="mt-2 divide-y divide-kampmax-border">
        {d.topListings.map((t) => (
          <li key={t.listingId}>
            <Link href="/agent/listings" className="flex flex-wrap items-baseline justify-between gap-2 py-2 hover:text-kampmax-blue">
              <span className="text-sm text-kampmax-text">{t.title}</span>
              <span className="text-xs text-kampmax-text-secondary">{interestLine(t)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StudentsSee({ d }: { d: AgentOverview | undefined }) {
  const chips = replyChips(d?.reply);
  return (
    <section className="rounded-xl border border-kampmax-border bg-white p-4">
      <h2 className="text-sm font-semibold text-kampmax-text">How students see you</h2>
      {chips.length > 0 ? <FactChips facts={chips} /> : <p className="mt-1 text-xs text-kampmax-text-secondary">{REPLY_HINT}</p>}
    </section>
  );
}

/** One next step for a new agent, not a checklist. Gone once a room is live. */
function NextStep({ d }: { d: AgentOverview }) {
  const step = setupStep(d);
  if (!step) return null;
  return (
    <Link href={step.href} className="block rounded-xl border border-kampmax-blue/30 bg-blue-50/50 p-4 hover:bg-blue-50">
      <p className="text-xs font-semibold text-kampmax-blue">Get your first enquiry · {step.progress}</p>
      <p className="mt-1 text-sm font-semibold text-kampmax-text">{step.title}</p>
      <p className="mt-0.5 text-xs text-kampmax-text-secondary">{step.detail}</p>
    </Link>
  );
}

