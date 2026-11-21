const TONE = {
  neutral: "bg-kampmax-muted px-3 py-1 font-semibold text-kampmax-text",
  positive: "bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800",
} as const;

/**
 * The short facts shown about a person or business ("Replies within 3 hours", "80% answered"). Draws nothing for an
 * empty list, so a caller never shows a bare gap while there is nothing yet worth saying.
 */
export function FactChips({
  facts,
  tone = "neutral",
  className = "mt-2",
}: {
  facts: string[];
  tone?: keyof typeof TONE;
  className?: string;
}) {
  if (facts.length === 0) return null;
  return (
    <ul className={`${className} flex flex-wrap gap-2`}>
      {facts.map((fact) => (
        <li key={fact} className={`rounded-full text-xs ${TONE[tone]}`}>
          {fact}
        </li>
      ))}
    </ul>
  );
}
