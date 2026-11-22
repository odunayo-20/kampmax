import type { ReactNode } from "react";
import { cn, formatNaira } from "@/lib/utils";
import type { ReturnRequest, ReturnTone, ReturnView } from "@/lib/returns";

const TONE: Record<ReturnTone, string> = {
  attention: "bg-amber-50 text-amber-900",
  positive: "bg-emerald-50 text-emerald-900",
  info: "bg-kampmax-blue/5 text-kampmax-navy",
  neutral: "bg-kampmax-muted/60 text-kampmax-text",
  bad: "bg-error-50 text-error-700",
};

/**
 * A refund request as both sides see it: where it stands in plain words, what it
 * covers, and what each side said. Each page passes its own buttons as children.
 */
export function ReturnSummary({
  request,
  view,
  audience,
  children,
}: {
  request: ReturnRequest;
  view: ReturnView<string>;
  audience: "buyer" | "vendor";
  children?: ReactNode;
}) {
  return (
    <section aria-label="Refund request" className="overflow-hidden rounded-xl border border-kampmax-border bg-white">
      <div role="status" className={cn("space-y-1 p-4", TONE[view.tone])}>
        <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">Refund request</p>
        <h2 className="text-base font-bold">{view.title}</h2>
        <p className="text-xs leading-relaxed">{view.text}</p>
      </div>

      <dl className="space-y-1.5 p-4 text-xs">
        <Row label="Reason" value={request.reason} />
        <Row label="Items" value={request.items.map((i) => `${i.quantity} × ${i.productName}`).join(", ")} />
        <Row label="Asked for" value={formatNaira(request.requestedAmount)} />
        {request.offeredAmount != null && <Row label="Seller offered" value={formatNaira(request.offeredAmount)} />}
        {request.refundedAmount != null && <Row label="Refunded" value={formatNaira(request.refundedAmount)} strong />}
      </dl>

      {(request.statement || request.vendorNote) && (
        <div className="space-y-2 px-4 pb-4">
          {request.statement && <Quote label={audience === "buyer" ? "You said" : "The buyer said"} text={request.statement} />}
          {request.vendorNote && <Quote label={audience === "buyer" ? "The seller said" : "You said"} text={request.vendorNote} />}
        </div>
      )}

      {children && <div className="border-t border-kampmax-border p-4">{children}</div>}
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-kampmax-text-secondary">{label}</dt>
      <dd className={cn("text-right text-kampmax-text", strong && "font-bold")}>{value}</dd>
    </div>
  );
}

function Quote({ label, text }: { label: string; text: string }) {
  return (
    <blockquote className="rounded-lg bg-kampmax-muted/50 p-3 text-xs">
      <p className="font-semibold text-kampmax-text-secondary">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-kampmax-text">{text}</p>
    </blockquote>
  );
}
