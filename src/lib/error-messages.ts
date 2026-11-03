const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You don't have permission to view this.",
  NOT_FOUND: "This content is no longer available.",
  CONFLICT: "This change could not be applied. Please try again.",
  VALIDATION: "Something was missing. Please try again.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  SERVER: "Something went wrong on our end. Please try again.",
  NETWORK: "You appear to be offline. Check your connection and try again.",
  TIMEOUT: "The request timed out. Please try again.",
};

/**
 * Maps a thrown error to a friendly, user-facing message.
 * Raw server/exception text is never surfaced to the user.
 */
export function getFriendlyErrorMessage(error: unknown): string {
  if (!error) return FRIENDLY_ERROR_MESSAGES.SERVER;

  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;
  if (typeof code === "string" && FRIENDLY_ERROR_MESSAGES[code]) {
    return FRIENDLY_ERROR_MESSAGES[code];
  }

  const message =
    error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("unauthorized") || normalized.includes("401"))
    return FRIENDLY_ERROR_MESSAGES.UNAUTHORIZED;
  if (normalized.includes("forbidden") || normalized.includes("403"))
    return FRIENDLY_ERROR_MESSAGES.FORBIDDEN;
  if (normalized.includes("not found") || normalized.includes("404"))
    return FRIENDLY_ERROR_MESSAGES.NOT_FOUND;
  if (normalized.includes("conflict") || normalized.includes("409"))
    return FRIENDLY_ERROR_MESSAGES.CONFLICT;
  if (normalized.includes("validation") || normalized.includes("422"))
    return FRIENDLY_ERROR_MESSAGES.VALIDATION;
  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests") ||
    normalized.includes("429")
  )
    return FRIENDLY_ERROR_MESSAGES.RATE_LIMITED;
  if (normalized.includes("offline") || normalized.includes("network"))
    return FRIENDLY_ERROR_MESSAGES.NETWORK;
  if (normalized.includes("timeout") || normalized.includes("timed out"))
    return FRIENDLY_ERROR_MESSAGES.TIMEOUT;

  return FRIENDLY_ERROR_MESSAGES.SERVER;
}
/** Statuses whose text is about the user's own session or the service, not about what they asked for. */
const NOT_A_REFUSAL = new Set([401, 403, 429]);

/**
 * For a step the backend refuses with a reason written for the person (a 4xx
 * about what they asked, like "You have 1h 40m left this week"): that reason,
 * as the backend wrote it. For anything else — a failure, a lost session, a
 * rate limit — the usual friendly message, so raw server text is still never
 * shown.
 */
export function getRefusalMessage(error: unknown): string {
  const status = (error as { status?: unknown } | null)?.status;
  const message = error instanceof Error ? error.message.trim() : "";
  if (typeof status === "number" && status >= 400 && status < 500 && !NOT_A_REFUSAL.has(status) && message) {
    return message;
  }
  return getFriendlyErrorMessage(error);
}
