// ============================================================
// SHARING A SERVICE IN A CHAT
// ============================================================
// A buyer who taps "Message" on a service page lands in the chat with that
// service staged next to the message box. When they send, the message carries a
// marker line:
//
//   Service: /freelancers/services/<uuid>
//
// and every chat renders that line as a service card. Both directions treat the
// id as untrusted input: it is only ever accepted in strict UUID form, the
// marker is built from the validated id alone (never from fetched text), and
// the card is loaded with a normal public request, so a forged marker can show
// nothing beyond what the public service page already shows.

const UUID_SOURCE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID = new RegExp(`^${UUID_SOURCE}$`, "i");
const MARKER_LINE = new RegExp(`^Service: /freelancers/services/(${UUID_SOURCE})[ \\t\\r]*$`, "im");

/** Room a message must leave for the marker (a blank line plus the line itself). */
export const SERVICE_MARKER_RESERVE =
  `Service: /freelancers/services/${"0".repeat(8)}-0000-0000-0000-${"0".repeat(12)}`.length + 2;

/**
 * A service id from anywhere untrusted (a URL, a message): the lower-cased id if
 * it is exactly one UUID, otherwise null. Arrays (`?service=a&service=b`), empty
 * values and anything with extra characters are all rejected.
 */
export function asServiceId(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value.toLowerCase() : null;
}

/** The message text with the service marker added; throws on an id that is not a UUID. */
export function withServiceMarker(text: string, serviceId: string): string {
  const id = asServiceId(serviceId);
  if (!id) throw new Error("Invalid service id");
  return [text.trim(), `Service: /freelancers/services/${id}`].filter(Boolean).join("\n\n");
}

/**
 * Splits a message into its text and the service it shares. Only the first marker
 * counts; any further marker-looking line stays as ordinary text.
 */
export function splitServiceMarker(text: string): { body: string; serviceId: string | null } {
  const match = MARKER_LINE.exec(text);
  if (!match) return { body: text, serviceId: null };
  const without = text.slice(0, match.index) + text.slice(match.index + match[0].length);
  return { body: without.replace(/\n{3,}/g, "\n\n").trim(), serviceId: match[1].toLowerCase() };
}

/** What the inbox shows for a message: the text, or a short label when it is only a service. */
export function chatPreview(text: string): string {
  const { body, serviceId } = splitServiceMarker(text);
  return serviceId && !body ? "Shared a service" : serviceId ? body : text;
}
