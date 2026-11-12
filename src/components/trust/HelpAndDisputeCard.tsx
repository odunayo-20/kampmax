import Link from "next/link";
import type { ReactNode } from "react";
import { LifeBuoy, ShieldAlert } from "lucide-react";

type Context = "order" | "contract" | "payment";

/** Where each kind of problem goes. Orders have their own report flow; contracts handle disputes in their actions. */
function supportHref(context: Context, reference: string): string {
  const q = new URLSearchParams();
  if (context === "order") {
    q.set("order", reference);
    q.set("category", "marketplace");
  } else if (context === "payment") {
    q.set("transaction", reference);
    q.set("category", "payments");
  } else {
    q.set("subject", `Contract ${reference}`);
  }
  return `/support/new?${q.toString()}`;
}

/**
 * One clear "get help / dispute" path, the same on every order, payment and
 * contract: ask for help (no consequences), or open a formal dispute (puts
 * money on hold). Saying which is which is the point.
 */
export function HelpAndDisputeCard({
  context,
  reference,
  showDispute = true,
  disputeHref,
  icon,
}: {
  context: Context;
  /** The order number, payment reference or contract id. */
  reference: string;
  /** False when the dispute is already open or not possible any more. */
  showDispute?: boolean;
  /** Where "Report a problem" goes. Defaults to the order report page. */
  disputeHref?: string;
  icon?: ReactNode;
}) {
  const href = disputeHref ?? (context === "order" ? `/orders/${reference}/dispute` : undefined);
  return (
    <section aria-labelledby={`help-${context}`} className="rounded-2xl border border-kampmax-border bg-white p-4" data-testid="help-card">
      <h2 id={`help-${context}`} className="flex items-center gap-2 text-sm font-bold text-kampmax-text">
        {icon ?? <LifeBuoy className="h-4 w-4 text-primary-600" aria-hidden />} Need help?
      </h2>
      <ul className="mt-2 space-y-2 text-xs">
        <li>
          <Link
            href={supportHref(context, reference)}
            className="font-semibold text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
          >
            Ask Kampmax support
          </Link>
          <span className="text-kampmax-text-secondary"> for a question, a delay, or a charge you don&apos;t recognise. Nothing is put on hold.</span>
        </li>
        {showDispute && href && (
          <li>
            <Link
              href={href}
              className="inline-flex items-center gap-1 font-semibold text-error-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-600"
            >
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> Report a problem
            </Link>
            <span className="text-kampmax-text-secondary"> if something is wrong. This puts the payout on hold while we review.</span>
          </li>
        )}
      </ul>
    </section>
  );
}
