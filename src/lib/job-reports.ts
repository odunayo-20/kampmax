import { formatNaira } from "@/lib/utils";
import type { ResolveReportResult } from "@/types/job-moderation";

/** What closing a report did, in a sentence. */
export function resolvedNotice(result: ResolveReportResult): string {
  const parts: string[] = [];
  if (result.report.outcome === "NO_ACTION") parts.push("Report dismissed.");
  else if (result.report.targetType === "POSTING") parts.push("Posting taken down.");
  else parts.push("Application removed.");
  if (result.refundedAmount > 0) {
    parts.push(`${formatNaira(result.refundedAmount)} refunded to the employer's wallet.`);
  }
  if (result.alsoResolved > 0) {
    parts.push(
      `${result.alsoResolved} other ${result.alsoResolved === 1 ? "report" : "reports"} on this posting closed too.`
    );
  }
  return parts.join(" ");
}
