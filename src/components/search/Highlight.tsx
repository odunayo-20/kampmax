import { highlightParts } from "@/lib/highlight";

/** Text with the words of the search picked out, so a result shows why it matched. */
export function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightParts(text, query).map((part, i) =>
        part.match ? (
          <mark key={i} className="rounded-sm bg-primary-100 px-px text-inherit">
            {part.text}
          </mark>
        ) : (
          part.text
        )
      )}
    </>
  );
}
