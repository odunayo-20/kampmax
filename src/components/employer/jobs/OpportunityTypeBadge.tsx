import { Badge } from "@/components/ui";
import type { OpportunityType } from "@/types/opportunity";
import { OPPORTUNITY_TYPE_META } from "@/config/opportunity";

/** The small "Internship" / "Full-time" / "Gig" pill shown beside a posting's status. */
export function OpportunityTypeBadge({
  type,
  className,
}: {
  type: OpportunityType;
  className?: string;
}) {
  const meta = OPPORTUNITY_TYPE_META[type];
  return (
    <Badge variant={meta.tone} className={className}>
      {meta.label}
    </Badge>
  );
}
