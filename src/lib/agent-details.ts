/**
 * An accommodation agent's contact details and verification documents: the form checks, what is sent, and the
 * document wording. The mobile app's lib/agent-portal.ts and lib/agent-onboarding.ts say the same things.
 * Where an application stands is services/agent-application.ts (agentStatusView). Pure rules, no network.
 */

import type { AgentDocumentType } from "@/types/accommodation";

const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface AgentDetailsForm {
  phone: string;
  email: string;
  operatingLocation: string;
  agencyName: string;
  businessAddress: string;
}

export type AgentDetailsSource = { [K in keyof AgentDetailsForm]?: string | null };

export type AgentDetailsErrors = Partial<Record<keyof AgentDetailsForm, string>>;

export function formFromAgent(a: AgentDetailsSource): AgentDetailsForm {
  return { phone: a.phone ?? "", email: a.email ?? "", operatingLocation: a.operatingLocation ?? "", agencyName: a.agencyName ?? "", businessAddress: a.businessAddress ?? "" };
}

const one = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Problems by field. The server ignores an empty optional field, so a value that was filled in cannot be cleared
 * from here; saying so is better than a save that quietly does nothing.
 */
export function agentDetailsProblems(f: AgentDetailsForm, original: AgentDetailsSource): AgentDetailsErrors {
  const e: AgentDetailsErrors = {};
  if (!PHONE.test(one(f.phone))) e.phone = "Enter a phone number like 0803 123 4567.";
  if (!EMAIL.test(one(f.email)) || one(f.email).length > 254) e.email = "Enter an email address.";
  const place = one(f.operatingLocation);
  if (place.length < 2) e.operatingLocation = 'Say where you operate, for example "UNILAG (Akoka / Yaba)".';
  else if (place.length > 200) e.operatingLocation = "Keep this under 200 characters.";
  if (one(f.agencyName).length > 160) e.agencyName = "Keep this under 160 characters.";
  else if (!one(f.agencyName) && one(original.agencyName ?? "")) e.agencyName = "You can change your agency name, but not leave it empty. Contact support to remove it.";
  if (f.businessAddress.trim().length > 300) e.businessAddress = "Keep this under 300 characters.";
  else if (!one(f.businessAddress) && one(original.businessAddress ?? "")) e.businessAddress = "You can change the address, but not leave it empty. Contact support to remove it.";
  return e;
}

/** Only what changed, trimmed. An empty object means there is nothing to save. */
export function agentDetailsPatch(f: AgentDetailsForm, original: AgentDetailsSource): Partial<AgentDetailsForm> {
  const was = formFromAgent(original);
  const patch: Partial<AgentDetailsForm> = {};
  (Object.keys(was) as (keyof AgentDetailsForm)[]).forEach((k) => {
    const next = one(f[k]);
    if (next !== one(was[k]) && next !== "") patch[k] = next;
  });
  return patch;
}

export const DETAILS_PRIVACY = "Students never see your phone or email. They message you through Kampmax.";

export const MAX_AGENT_DOCUMENTS = 10;

export const DOC_STATUS_LABEL: Record<string, { label: string; tone: "info" | "positive" | "bad" }> = {
  PENDING: { label: "In review", tone: "info" },
  ACCEPTED: { label: "Accepted", tone: "positive" },
  REJECTED: { label: "Not accepted", tone: "bad" },
};

export const ADDABLE_DOCUMENTS: AgentDocumentType[] = ["IDENTITY", "AUTHORIZATION_LETTER", "OWNERSHIP_PROOF", "BUSINESS_REGISTRATION", "OTHER"];

/** What counts for each kind, so the agent picks the right file. */
export const DOC_HINT: Record<AgentDocumentType, string> = {
  IDENTITY: "NIN slip, driver's licence, international passport or voter's card.",
  OWNERSHIP_PROOF: "C of O, deed of assignment or land receipt.",
  AUTHORIZATION_LETTER: "A letter from the owner, signed, saying you may rent the property out.",
  BUSINESS_REGISTRATION: "CAC certificate.",
  OTHER: "Anything else that helps us check you.",
};

export const DOCS_PRIVACY = "Only you and the Kampmax review team can see them.";
export const NO_DOCUMENTS = "No documents yet. Add your ID and proof you may rent the property out so we can review you.";
