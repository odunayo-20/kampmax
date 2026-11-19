// ============================================================
// ACCOMMODATION AGENT OVERVIEW
// ============================================================
//
// What an approved agent should act on today and how their rooms are doing,
// from `GET /accommodation/agent/dashboard`: rooms to confirm, the next
// renewal, how fast students get an answer, and views/saves per listing.
// The backend works the numbers out; this only reads them safely and words
// them. A missing field is empty, never a crash. The request itself lives
// in accommodationApi.agentOverview (services/accommodation.ts).

export interface AgentReplyStats {
  received: number;
  /** 0-100, or null while too few students have written to say. */
  answeredRate: number | null;
  /** Hours to a first answer, or null while too few to say. */
  typicalReplyHours: number | null;
}

export interface AgentOverview {
  nextRenewal: {
    listingId: string;
    title: string;
    expiresAt: string;
    amount: number;
    autoRenew: boolean;
  } | null;
  needsConfirming: {
    count: number;
    hideBy: string | null;
    listings: { id: string; title: string }[];
  };
  reply: AgentReplyStats;
  interest: { views: number; saves: number };
  topListings: {
    listingId: string;
    title: string;
    views: number;
    saves: number;
    enquiries: number;
  }[];
}

type Bag = Record<string, unknown>;

const bag = (v: unknown): Bag =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Bag) : {};
const text = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};
const maybe = (v: unknown): number | null =>
  v === null || v === undefined || !Number.isFinite(Number(v)) || Number(v) < 0
    ? null
    : Math.round(Number(v));

export function readAgentOverview(raw: unknown): AgentOverview {
  const r = bag(raw);
  const renewal = bag(r.nextRenewal);
  const confirm = bag(r.needsConfirming);
  const reply = bag(r.reply);
  const interest = bag(r.interest);
  const rooms = (Array.isArray(confirm.listings) ? confirm.listings : [])
    .map(bag)
    .filter((x) => text(x.id));
  return {
    nextRenewal:
      text(renewal.listingId) && text(renewal.expiresAt)
        ? {
            listingId: text(renewal.listingId),
            title: text(renewal.title),
            expiresAt: text(renewal.expiresAt),
            amount: Number(renewal.amount) > 0 ? Number(renewal.amount) : 0,
            autoRenew: renewal.autoRenew === true,
          }
        : null,
    needsConfirming: {
      count: Math.max(num(confirm.count), rooms.length),
      hideBy: text(confirm.hideBy) || null,
      listings: rooms.map((x) => ({ id: text(x.id), title: text(x.title) })),
    },
    reply: {
      received: num(reply.received),
      answeredRate: maybe(reply.answeredRate),
      typicalReplyHours: maybe(reply.typicalReplyHours),
    },
    interest: { views: num(interest.views), saves: num(interest.saves) },
    topListings: (Array.isArray(r.topListings) ? r.topListings : [])
      .map(bag)
      .filter((x) => text(x.listingId))
      .map((x) => ({
        listingId: text(x.listingId),
        title: text(x.title),
        views: num(x.views),
        saves: num(x.saves),
        enquiries: num(x.enquiries),
      })),
  };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "within an hour", "within 5 hours", "in about 2 days". */
export function replyTimeText(hours: number): string {
  if (hours <= 1) return "within an hour";
  if (hours < 24) return `within ${hours} hours`;
  return `in about ${plural(Math.round(hours / 24), "day")}`;
}

/** The short facts students see about how fast an agent answers. Too few enquiries means nothing is shown. */
export function replyChips(reply: Partial<AgentReplyStats> | null | undefined): string[] {
  if (!reply) return [];
  const out: string[] = [];
  if (typeof reply.typicalReplyHours === "number") {
    out.push(`Replies ${replyTimeText(reply.typicalReplyHours)}`);
  }
  if (typeof reply.answeredRate === "number") out.push(`${reply.answeredRate}% answered`);
  return out;
}

/** "40 views · 6 saves · 3 enquiries". */
export function interestLine(x: { views: number; saves: number; enquiries?: number }): string {
  const parts = [plural(x.views, "view"), plural(x.saves, "save")];
  if (x.enquiries !== undefined) parts.push(plural(x.enquiries, "enquiry", "enquiries"));
  return parts.join(" · ");
}
