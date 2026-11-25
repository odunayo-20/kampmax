/**
 * Door check-in rules, matching the mobile app: what a scanned QR may be, how to avoid reading the same
 * ticket twice, and what to tell the person at the door for each answer the server gives.
 *
 * A QR code is untrusted input (anyone can print one). Only a Kampmax ticket code is sent to the server.
 */

/** Same pattern the server uses (events.helpers TICKET_QR_PATTERN). */
const TICKET_QR = /^KMPX-EVENT:(KMX-[A-Z0-9]{4,12}):([a-f0-9]{32})$/i;
const TICKET_NUMBER = /^KMX-?([A-Z0-9]{4,12})$/;
const MAX_CODE_LENGTH = 200;

export function parseTicketQr(data: string): { ok: true; code: string } | { ok: false; reason: string } {
  const code = data.trim();
  if (!code) return { ok: false, reason: "Nothing was read." };
  if (code.length > MAX_CODE_LENGTH || !TICKET_QR.test(code)) {
    return { ok: false, reason: "This is not a Kampmax event ticket." };
  }
  return { ok: true, code };
}

/** "kmx 82941", "KMX82941" and "KMX-82941" all become "KMX-82941". */
export function normalizeTicketNumber(input: string): string | null {
  const m = TICKET_NUMBER.exec(input.trim().toUpperCase().replace(/[\s_]+/g, ""));
  return m ? `KMX-${m[1]}` : null;
}

/**
 * A camera sees the same QR many times a second. A code counts once, and counts again only after it
 * has been out of sight for `cooldownMs`. `hold` is called while scanning is paused, so a ticket still
 * in front of the camera when a result is dismissed isn't read as a second entry.
 */
export function createRepeatFilter(cooldownMs = 2500, now: () => number = Date.now) {
  let lastCode = "";
  let lastSeen = 0;
  return {
    isNew(code: string): boolean {
      const fresh = code !== lastCode || now() - lastSeen >= cooldownMs;
      lastCode = code;
      lastSeen = now();
      return fresh;
    },
    hold() {
      lastSeen = now();
    },
  };
}

export type ScanTone = "warn" | "bad";

export interface ScanProblem {
  /** "warn": not a verdict on the guest (try again, or already inside). "bad": don't admit. */
  tone: ScanTone;
  title: string;
  detail?: string;
}

const timeOf = (iso: string): string | undefined => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/** Turns a failed check-in into something a person at a busy door can act on at a glance. */
export function describeCheckInError(
  error: { status?: number; code?: string | number; message?: string } | null | undefined
): ScanProblem {
  const status = error?.status;
  const message = error?.message ?? "";

  if (status === undefined || error?.code === "NETWORK_ERROR" || status >= 500) {
    return {
      tone: "warn",
      title: "Couldn't check this ticket",
      detail: "No answer from Kampmax. Scan again in a moment. If it keeps failing, check the name on the guest list.",
    };
  }
  if (status === 409 || /already used/i.test(message)) {
    const at = /at (\d{4}-\d{2}-\d{2}T[\d:.]+Z)/.exec(message)?.[1];
    const when = at ? timeOf(at) : undefined;
    return {
      tone: "warn",
      title: "Already checked in",
      detail: when ? `This ticket was used at ${when}.` : "This ticket was already used.",
    };
  }
  if (status === 404) return { tone: "bad", title: "Ticket not found", detail: "No ticket matches this code." };
  if (status === 403) {
    return { tone: "bad", title: "You can't check people in", detail: "You don't have check-in access for this event." };
  }
  if (status === 429) return { tone: "warn", title: "Slow down", detail: "Too many scans at once. Wait a few seconds." };
  if (/different event/i.test(message)) return { tone: "bad", title: "Wrong event", detail: "This ticket is for a different event." };
  if (/refunded/i.test(message)) return { tone: "bad", title: "Ticket refunded", detail: "This ticket was refunded and is not valid." };
  if (/cancelled/i.test(message)) return { tone: "bad", title: "Event cancelled", detail: "This event was cancelled." };
  if (/not a kampmax/i.test(message)) return { tone: "bad", title: "Not a Kampmax ticket", detail: "This code is not an event ticket." };
  return { tone: "bad", title: "Not accepted", detail: message && message.length <= 120 ? message : undefined };
}
