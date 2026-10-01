import { Campus } from "@/types";
import { campuses as defaultCampuses } from "@/data/campus";

export interface CampusEmailDetectionResult {
  isInstitutional: boolean;
  domain: string | null;
  campusId: string | null;
  matchedCampus: Campus | null;
  badgeQueued: boolean;
  message: string | null;
}

/**
 * Extracts and cleans the domain from an email address.
 */
export function extractEmailDomain(email: string): string | null {
  if (!email || !email.includes("@")) return null;
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length < 2) return null;
  const domain = parts[parts.length - 1].trim();
  return domain.length > 0 ? domain : null;
}

/**
 * Checks whether an email belongs to an educational institution (.edu.ng or academic subdomains).
 */
export function isInstitutionalEmail(email: string): boolean {
  const domain = extractEmailDomain(email);
  if (!domain) return false;
  return (
    domain.endsWith(".edu.ng") ||
    domain.endsWith(".ac.ng") ||
    domain.endsWith(".sch.ng")
  );
}

/**
 * Known mapping of domain stems/aliases to campus IDs for robust detection.
 */
const DOMAIN_TO_CAMPUS_ID: Record<string, string> = {
  "unilag.edu.ng": "unilag",
  "live.unilag.edu.ng": "unilag",
  "student.unilag.edu.ng": "unilag",
  "oauife.edu.ng": "oau",
  "student.oauife.edu.ng": "oau",
  "oau.edu.ng": "oau",
  "ui.edu.ng": "ui",
  "stu.ui.edu.ng": "ui",
  "rugipo.edu.ng": "rugipo",
  "unn.edu.ng": "unn",
  "students.unn.edu.ng": "unn",
  "abu.edu.ng": "abu",
  "uniabuja.edu.ng": "uniabuja",
  "futo.edu.ng": "futo",
};

/**
 * Detects campus and checks for Verified Student Badge qualification from an email address.
 */
export function detectCampusFromEmail(
  email: string,
  campusList: Campus[] = defaultCampuses
): CampusEmailDetectionResult {
  const domain = extractEmailDomain(email);

  if (!domain) {
    return {
      isInstitutional: false,
      domain: null,
      campusId: null,
      matchedCampus: null,
      badgeQueued: false,
      message: null,
    };
  }

  // 1. Direct match in dictionary or configured emailDomains
  let matchedId: string | null = DOMAIN_TO_CAMPUS_ID[domain] || null;

  if (!matchedId) {
    const foundByDomain = campusList.find((c) =>
      c.emailDomains?.some(
        (d) => d.toLowerCase() === domain || domain.endsWith(`.${d.toLowerCase()}`)
      )
    );
    if (foundByDomain) {
      matchedId = foundByDomain.id;
    }
  }

  // 2. Fallback heuristic: check if campus acronym/slug appears before .edu.ng
  if (!matchedId && domain.endsWith(".edu.ng")) {
    const stem = domain.replace(".edu.ng", "").split(".").pop() || "";
    const foundByStem = campusList.find(
      (c) =>
        c.id.toLowerCase() === stem.toLowerCase() ||
        c.abbreviation.toLowerCase() === stem.toLowerCase()
    );
    if (foundByStem) {
      matchedId = foundByStem.id;
    }
  }

  const matchedCampus = matchedId
    ? campusList.find((c) => c.id === matchedId) || null
    : null;

  const isEdu = isInstitutionalEmail(email);

  if (matchedCampus) {
    return {
      isInstitutional: true,
      domain,
      campusId: matchedCampus.id,
      matchedCampus,
      badgeQueued: true,
      message: `Official campus email detected! ${matchedCampus.name} auto-selected & "Verified Student" badge queued.`,
    };
  }

  if (isEdu) {
    return {
      isInstitutional: true,
      domain,
      campusId: null,
      matchedCampus: null,
      badgeQueued: true,
      message: `Institutional email detected (.${domain}). "Verified Student" badge will be activated upon verification.`,
    };
  }

  return {
    isInstitutional: false,
    domain,
    campusId: null,
    matchedCampus: null,
    badgeQueued: false,
    message: null,
  };
}
