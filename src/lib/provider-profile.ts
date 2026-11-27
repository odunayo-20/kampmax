/** Pure rules for editing the provider profile. The mobile app's lib/service-provider.ts says the same things. */

export const NAME_MIN = 2;
export const NAME_MAX = 150;
export const BIO_MAX = 5000;
export const CITY_MAX = 100;
export const MAX_YEARS = 60;

export function nameProblem(name: string): string | null {
  const n = name.trim();
  if (n.length < NAME_MIN) return `Enter a name of at least ${NAME_MIN} characters.`;
  if (n.length > NAME_MAX) return `Keep the name under ${NAME_MAX} characters.`;
  return null;
}

/** Empty is fine (the field is optional). Otherwise a whole number of years, 0 to MAX_YEARS. */
export function yearsProblem(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d+$/.test(t)) return "Enter a whole number of years.";
  return Number(t) > MAX_YEARS ? `Enter ${MAX_YEARS} years or fewer.` : null;
}

export interface ProfileFormErrors {
  displayName?: string;
  years?: string;
}

export function validateProfile(f: { displayName: string; years: string }): ProfileFormErrors {
  const out: ProfileFormErrors = {};
  const np = nameProblem(f.displayName);
  if (np) out.displayName = np;
  const yp = yearsProblem(f.years);
  if (yp) out.years = yp;
  return out;
}

/**
 * What to show when saving the profile fails. The server's reason is shown only for a rule it enforces (409, 422);
 * validation and server errors come back as technical text, so they get a plain sentence.
 */
export function describeProfileSaveError(message: string | undefined, status?: number): string {
  const text = message?.trim() ?? "";
  if ((status === 409 || status === 422) && text && text.length <= 200) return text;
  if (status === 401) return "Please sign in again.";
  return "Couldn't save your profile. Check the details and your connection, then try again.";
}
