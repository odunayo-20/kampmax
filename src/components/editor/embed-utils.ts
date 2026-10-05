/**
 * Approved embed providers. A pasted link is converted to the provider's own
 * embed URL; anything else is refused. The backend enforces the same list, so
 * this is a convenience for authors, never the security boundary.
 */

export type EmbedProvider = "youtube" | "vimeo";

export interface ParsedEmbed {
  provider: EmbedProvider;
  id: string;
  /** The privacy-friendly embed URL stored in the article. */
  src: string;
}

export const EMBED_PROVIDER_LABEL: Record<EmbedProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
};

const YOUTUBE_ID = /^[\w-]{6,20}$/;
const VIMEO_ID = /^\d{4,12}$/;

/** Returns the embed for a YouTube or Vimeo link, or null for anything else. */
export function parseEmbedUrl(input: string): ParsedEmbed | null {
  const raw = input.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    return youtube(segments[0]);
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (segments[0] === "watch") return youtube(url.searchParams.get("v") ?? undefined);
    if (["embed", "shorts", "live", "v"].includes(segments[0] ?? "")) return youtube(segments[1]);
    return null;
  }
  if (host === "vimeo.com") {
    // vimeo.com/76979871 or vimeo.com/channels/staffpicks/76979871
    const id = [...segments].reverse().find((s) => VIMEO_ID.test(s));
    return vimeo(id);
  }
  if (host === "player.vimeo.com" && segments[0] === "video") return vimeo(segments[1]);
  return null;
}

function youtube(id: string | undefined): ParsedEmbed | null {
  if (!id || !YOUTUBE_ID.test(id)) return null;
  return { provider: "youtube", id, src: `https://www.youtube-nocookie.com/embed/${id}` };
}

function vimeo(id: string | undefined): ParsedEmbed | null {
  if (!id || !VIMEO_ID.test(id)) return null;
  return { provider: "vimeo", id, src: `https://player.vimeo.com/video/${id}` };
}

/** Recognises an already-normalised embed `src` (as read back from stored HTML). */
export function parseStoredEmbedSrc(src: string | null | undefined): ParsedEmbed | null {
  if (!src) return null;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return null;
    if (url.hostname === "www.youtube-nocookie.com" || url.hostname === "www.youtube.com") {
      const [kind, id] = url.pathname.split("/").filter(Boolean);
      return kind === "embed" ? youtube(id) : null;
    }
    if (url.hostname === "player.vimeo.com") {
      const [kind, id] = url.pathname.split("/").filter(Boolean);
      return kind === "video" ? vimeo(id) : null;
    }
  } catch {
    /* not a URL */
  }
  return null;
}
