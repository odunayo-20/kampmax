"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bug, ChevronDown, ChevronUp, ExternalLink, Flag, HelpCircle, Lightbulb, LifeBuoy, Mail, MessageCircle, Phone, Search } from "lucide-react";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
import { SettingsGroup, SettingsRow } from "@/components/profile/SettingsGroup";
import { faqItems, supportContact } from "@/data/profile";
import { searchFaq } from "@/lib/faq-search";

const digits = (text: string) => text.replace(/\D/g, "");

const CONTACTS = [
  { label: "WhatsApp", value: supportContact.whatsapp, href: `https://wa.me/${digits(supportContact.whatsapp)}`, icon: MessageCircle, external: true },
  { label: "Call Us", value: supportContact.phone, href: `tel:+${digits(supportContact.phone)}`, icon: Phone, external: false },
  { label: "Email", value: supportContact.email, href: `mailto:${supportContact.email}`, icon: Mail, external: false },
];

/** The three "something is wrong" shortcuts: a support request with the category and subject filled in. */
const REPORTS = [
  { icon: Bug, label: "Report a Bug", description: "Found something broken? Let us know", query: "category=technical&subject=Report a bug" },
  { icon: Lightbulb, label: "Feature Request", description: "Suggest a new feature for Kampmax", query: "category=other&subject=Feature request" },
  { icon: Flag, label: "Report a User", description: "Flag suspicious or harmful behavior", query: "category=other&subject=Report a user" },
];

export default function HelpSupportPage() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const found = searchFaq(faqItems, searchQuery);
  const arrow = <ArrowLeft className="h-4 w-4 rotate-180 text-kampmax-text-secondary" />;

  return (
    <SettingsPageShell title="Help & Support">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-kampmax-text-secondary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for help..."
          aria-label="Search for help"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-kampmax-border text-sm text-kampmax-text bg-white focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
        />
      </div>

      <div className="bg-gradient-to-br from-kampmax-navy to-kampmax-blue rounded-xl p-5 text-white">
        <h2 className="text-sm font-bold mb-3">Need Help?</h2>
        <div className="space-y-2.5">
          {CONTACTS.map(({ label, value, href, icon: Icon, external }) => (
            <a key={label} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="flex items-center gap-3 py-2">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-white/70">{value}</p>
              </div>
              {external && <ExternalLink className="h-4 w-4 text-white/50" />}
            </a>
          ))}
        </div>
        <p className="text-[11px] text-white/50 mt-3">{supportContact.hours}</p>
      </div>

      <SettingsGroup title="Frequently Asked Questions" description={`${found.length} ${found.length === 1 ? "question" : "questions"}`}>
        {found.length === 0 ? (
          <div className="p-6 text-center">
            <HelpCircle className="h-8 w-8 text-kampmax-text-secondary mx-auto mb-2" />
            <p className="text-xs text-kampmax-text-secondary">No answers found. Try different words, or ask the support team below.</p>
          </div>
        ) : (
          found.map((faq) => {
            // A search that leaves one answer opens it, the same as the mobile app.
            const expanded = expandedFaq === faq.id || (searchQuery.trim().length > 0 && found.length === 1);
            return (
              <div key={faq.id}>
                <button onClick={() => setExpandedFaq(expanded ? null : faq.id)} aria-expanded={expanded} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                  <HelpCircle className="h-4 w-4 text-kampmax-blue flex-shrink-0" />
                  <span className="flex-1 text-sm font-medium text-kampmax-text">{faq.question}</span>
                  {expanded ? <ChevronUp className="h-4 w-4 text-kampmax-text-secondary flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-kampmax-text-secondary flex-shrink-0" />}
                </button>
                {expanded && (
                  <div className="px-4 pb-3 pl-11">
                    <p className="text-xs text-kampmax-text-secondary leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </SettingsGroup>

      <SettingsGroup title="Support Requests">
        <SettingsRow icon={<LifeBuoy className="h-4 w-4 text-kampmax-blue" />} label="My Support Requests" description="Track and reply to the cases you've opened" action={arrow} onClick={() => router.push("/support")} />
        <SettingsRow icon={<LifeBuoy className="h-4 w-4 text-kampmax-blue" />} label="Open a Support Request" description="Get help from the Kampmax support team" action={arrow} onClick={() => router.push("/support/new")} />
      </SettingsGroup>

      <SettingsGroup title="Report a Problem">
        {REPORTS.map(({ icon: Icon, label, description, query }) => (
          <SettingsRow key={label} icon={<Icon className="h-4 w-4 text-kampmax-blue" />} label={label} description={description} action={arrow} onClick={() => router.push(`/support/new?${query}`)} />
        ))}
      </SettingsGroup>

      <p className="text-center text-xs text-kampmax-text-secondary pb-4">Kampmax v1.0 &middot; Made for Nigerian campuses</p>
    </SettingsPageShell>
  );
}
