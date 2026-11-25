/**
 * Rules for asking to become an event organizer. The limits mirror the backend's ApplyOrganizerDto
 * (name 3-120, description 30-2000, proof link up to 500) and the wording matches the mobile app.
 */

export const NAME_MIN = 3;
export const NAME_MAX = 120;
export const DESCRIPTION_MIN = 30;
export const DESCRIPTION_MAX = 2000;
export const PROOF_MAX = 500;

export interface ApplicationForm {
  organizationName: string;
  description: string;
  proofUrl: string;
}

export type ApplicationErrors = Partial<Record<keyof ApplicationForm, string>>;

export interface ValidApplication {
  organizationName: string;
  description: string;
  /** Normalised https/http address, or undefined when none was given. */
  proofUrl?: string;
}

/**
 * A typed link as a plain web address, or null. Other schemes, embedded credentials
 * (`https://user:pass@host`) and bare words without a domain are refused.
 */
export function safeWebUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function validateApplication(
  form: ApplicationForm
): { ok: true; value: ValidApplication } | { ok: false; errors: ApplicationErrors } {
  const errors: ApplicationErrors = {};
  const name = form.organizationName.trim();
  const description = form.description.trim();
  const proofRaw = form.proofUrl.trim();

  if (name.length < NAME_MIN) {
    errors.organizationName = `Enter your club or organisation name (at least ${NAME_MIN} characters).`;
  } else if (name.length > NAME_MAX) {
    errors.organizationName = `Keep the name under ${NAME_MAX} characters.`;
  }

  if (description.length < DESCRIPTION_MIN) {
    errors.description = `Tell us a little more about the events you plan to run (${DESCRIPTION_MIN - description.length} more characters).`;
  } else if (description.length > DESCRIPTION_MAX) {
    errors.description = `Keep this under ${DESCRIPTION_MAX} characters.`;
  }

  let proofUrl: string | undefined;
  if (proofRaw) {
    const safe = safeWebUrl(proofRaw);
    if (!safe) errors.proofUrl = "Enter a web address like https://example.com/your-page, or leave this empty.";
    else if (safe.length > PROOF_MAX) errors.proofUrl = "That link is too long.";
    else proofUrl = safe;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { organizationName: name, description, ...(proofUrl ? { proofUrl } : {}) } };
}
