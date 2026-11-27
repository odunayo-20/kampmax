/** Pure rules for the provider's portfolio. The mobile app's lib/provider-hours.ts says the same things. */

export const PORTFOLIO_MAX = 10;
export const PORTFOLIO_TITLE_MAX = 150;
export const PORTFOLIO_DESCRIPTION_MAX = 1000;

/** Customers only see a portfolio once Kampmax has verified the provider. */
export const UNVERIFIED_PORTFOLIO_NOTE = "Customers see your portfolio once Kampmax verifies your profile.";

export const PORTFOLIO_FULL = "Your portfolio is full. Open a piece to change or remove it.";

/** The line above the pieces: how many, and who can see them. */
export function portfolioSummary(count: number, verified: boolean): string {
  return `${count} of ${PORTFOLIO_MAX} pieces. ${verified ? "Customers see these on your page." : UNVERIFIED_PORTFOLIO_NOTE}`;
}

export interface PortfolioForm {
  title: string;
  hasPicture: boolean;
}

export function portfolioProblems(f: PortfolioForm): { title?: string; picture?: string } {
  const out: { title?: string; picture?: string } = {};
  if (!f.title.trim()) out.title = "Give this piece of work a title.";
  else if (f.title.trim().length > PORTFOLIO_TITLE_MAX) out.title = `Keep the title under ${PORTFOLIO_TITLE_MAX} characters.`;
  if (!f.hasPicture) out.picture = "Add a picture of the work.";
  return out;
}
